using Microlearning.Areas.Gamification.Interfaces;
using Microlearning.Areas.Quiz.DTOs;
using Microlearning.Areas.Quiz.Interfaces;
using Microlearning.Exceptions;
using Microlearning.Model;
using Microlearning.Model.Entities;
using Microsoft.EntityFrameworkCore;

namespace Microlearning.Areas.Quiz.Services
{
    public class QuizService : IQuizService
    {
        private readonly ApplicationDbContext _dbContext;
        private readonly IQuizMistakeVaultService _mistakeVaultService;
        private readonly IUserStreakService _streakService;
        private readonly ILogger<QuizService> _logger;

        public QuizService(
            ApplicationDbContext dbContext,
            IQuizMistakeVaultService mistakeVaultService,
            IUserStreakService streakService,
            ILogger<QuizService> logger)
        {
            _dbContext = dbContext;
            _mistakeVaultService = mistakeVaultService;
            _streakService = streakService;
            _logger = logger;
        }

        public async Task<QuizDetailResponse> GetQuizByLessonIdAsync(int lessonId)
        {
            var quiz = await _dbContext.Quizzes
                .AsNoTracking()
                .Include(q => q.Questions.OrderBy(ques => ques.SortOrder))
                    .ThenInclude(ques => ques.QuizOptions.OrderBy(opt => opt.SortOrder))
                .FirstOrDefaultAsync(q => q.LessonId == lessonId);

            if (quiz == null)
            {
                throw new BusinessException($"Bài học với mã {lessonId} chưa có đề thi trắc nghiệm.");
            }

            // Ẩn cột IsCorrect tuyệt đối để chống gian lận
            var questionResponses = quiz.Questions.Select(q => new QuestionResponse(
                q.Id,
                q.Content,
                q.Explanation,
                q.Points,
                q.SortOrder,
                q.QuestionType,
                q.QuizOptions.Select(opt => new QuizOptionResponse(
                    opt.Id,
                    opt.OptionText,
                    opt.SortOrder
                )).ToList()
            )).ToList();

            return new QuizDetailResponse(
                quiz.Id,
                quiz.LessonId,
                quiz.Title,
                quiz.PassScore,
                quiz.Version,
                questionResponses
            );
        }

        public async Task<QuizAttemptResultResponse> SubmitQuizAttemptAsync(string accountId, SubmitQuizAttemptRequest request)
        {
            if (request.ClientAttemptId == Guid.Empty)
            {
                throw new BusinessException("ClientAttemptId (GUID) không hợp lệ.");
            }

            // BƯỚC 1: KIỂM TRA TÍNH TOÀN VẸN CHỐNG NỘP TRÙNG (IDEMPOTENCY)
            var existingAttempt = await _dbContext.QuizAttempts
                .AsNoTracking()
                .Include(a => a.QuizAnswers)
                .Include(a => a.Quiz)
                    .ThenInclude(q => q!.Questions)
                .FirstOrDefaultAsync(a => a.ClientAttemptId == request.ClientAttemptId);

            if (existingAttempt != null)
            {
                int correctCount = existingAttempt.QuizAnswers.Count(a => a.IsCorrect);
                int totalQuestions = existingAttempt.Quiz?.Questions.Count ?? existingAttempt.QuizAnswers.Count;

                return new QuizAttemptResultResponse(
                    existingAttempt.Id,
                    existingAttempt.ClientAttemptId,
                    existingAttempt.QuizId,
                    existingAttempt.Score,
                    existingAttempt.IsPassed,
                    IsDuplicate: true, // Báo cho client đây là kết quả cũ đã có
                    existingAttempt.SubmittedAt,
                    correctCount,
                    totalQuestions
                );
            }

            // BƯỚC 2: TẢI ĐỀ THI VÀ ĐÁP ÁN ĐÚNG
            var quiz = await _dbContext.Quizzes
                .Include(q => q.Questions)
                    .ThenInclude(ques => ques.QuizOptions)
                .FirstOrDefaultAsync(q => q.Id == request.QuizId);

            if (quiz == null)
            {
                throw new BusinessException($"Không tìm thấy đề thi với mã {request.QuizId}.");
            }

            // BƯỚC 3: CHẤM ĐIỂM
            decimal totalScore = 0;
            int correctAnswers = 0;
            var quizAnswers = new List<QuizAnswer>();
            var evaluatedAnswers = new List<(int questionId, int selectedOptionId, bool isCorrect)>();

            foreach (var answerDto in request.Answers)
            {
                var question = quiz.Questions.FirstOrDefault(q => q.Id == answerDto.QuestionId);
                if (question == null) continue;

                var correctOptionIds = question.QuizOptions
                    .Where(o => o.IsCorrect)
                    .Select(o => o.Id)
                    .OrderBy(id => id)
                    .ToList();

                var selectedIds = answerDto.SelectedOptionIds.OrderBy(id => id).ToList();

                bool isCorrect = correctOptionIds.SequenceEqual(selectedIds);
                decimal earnedScore = isCorrect ? question.Points : 0;

                totalScore += earnedScore;
                if (isCorrect) correctAnswers++;

                var firstSelectedId = selectedIds.FirstOrDefault();
                evaluatedAnswers.Add((question.Id, firstSelectedId, isCorrect));

                var quizAnswer = new QuizAnswer
                {
                    QuestionId = question.Id,
                    IsCorrect = isCorrect,
                    EarnedScore = earnedScore,
                    SelectedOptions = selectedIds.Select(optId => new QuizAnswerOption
                    {
                        QuizOptionId = optId
                    }).ToList()
                };

                quizAnswers.Add(quizAnswer);
            }

            bool isPassed = totalScore >= quiz.PassScore;

            var newAttempt = new QuizAttempt
            {
                ClientAttemptId = request.ClientAttemptId,
                AccountId = accountId,
                QuizId = quiz.Id,
                QuizVersion = quiz.Version,
                Score = totalScore,
                IsPassed = isPassed,
                StartedAt = request.StartedAt,
                SubmittedAt = DateTime.UtcNow,
                CreatedAt = DateTime.UtcNow,
                QuizAnswers = quizAnswers
            };

            _dbContext.QuizAttempts.Add(newAttempt);
            await _dbContext.SaveChangesAsync();

            // Ghi nhận lỗi sai vào Sổ tay ôn tập (Mistake Review Vault)
            try
            {
                await _mistakeVaultService.RecordMistakesFromAttemptAsync(accountId, quiz.Id, quiz.LessonId, evaluatedAnswers);
            }
            catch
            {
                // Không chặn hoàn thành bài thi nếu việc lưu sổ tay gặp lỗi tạm thời
            }

            // Nếu vượt qua bài thi trắc nghiệm: Đánh dấu hoàn thành bài học và kích hoạt Streak ngày
            if (isPassed)
            {
                try
                {
                    var lessonProgress = await _dbContext.LessonProgresses
                        .FirstOrDefaultAsync(p => p.AccountId == accountId && p.LessonId == quiz.LessonId);

                    if (lessonProgress == null)
                    {
                        lessonProgress = new LessonProgress
                        {
                            AccountId = accountId,
                            LessonId = quiz.LessonId,
                            WatchedSeconds = 300,
                            Percent = 100,
                            IsCompleted = true,
                            CompletedAt = DateTime.UtcNow,
                            LastPlayedAt = DateTime.UtcNow,
                            CreatedAt = DateTime.UtcNow
                        };
                        _dbContext.LessonProgresses.Add(lessonProgress);
                    }
                    else
                    {
                        lessonProgress.IsCompleted = true;
                        lessonProgress.Percent = Math.Max(lessonProgress.Percent, 100);
                        if (lessonProgress.CompletedAt == null)
                        {
                            lessonProgress.CompletedAt = DateTime.UtcNow;
                        }
                        lessonProgress.UpdatedAt = DateTime.UtcNow;
                    }

                    await _dbContext.SaveChangesAsync();
                    await _streakService.RecordDailyLearningAsync(accountId);
                }
                catch (Exception ex)
                {
                    _logger.LogWarning(ex, "Lỗi khi kích hoạt streak từ bài thi cho tài khoản {AccountId}", accountId);
                }
            }

            return new QuizAttemptResultResponse(
                newAttempt.Id,
                newAttempt.ClientAttemptId,
                newAttempt.QuizId,
                newAttempt.Score,
                newAttempt.IsPassed,
                IsDuplicate: false,
                newAttempt.SubmittedAt,
                correctAnswers,
                quiz.Questions.Count
            );
        }

        public async Task<List<QuizAttemptHistoryResponse>> GetQuizHistoryAsync(string accountId, int quizId)
        {
            var history = await _dbContext.QuizAttempts
                .AsNoTracking()
                .Include(a => a.Quiz)
                .Include(a => a.QuizAnswers)
                .Where(a => a.AccountId == accountId && a.QuizId == quizId)
                .OrderByDescending(a => a.SubmittedAt)
                .Select(a => new QuizAttemptHistoryResponse(
                    a.Id,
                    a.ClientAttemptId,
                    a.QuizId,
                    a.Quiz!.Title,
                    a.Score,
                    a.IsPassed,
                    a.StartedAt,
                    a.SubmittedAt,
                    a.QuizAnswers.Count
                ))
                .ToListAsync();

            return history;
        }

        public async Task<QuizDetailResponse> CreateQuizAsync(int lessonId, CreateQuizRequest request)
        {
            var lessonExists = await _dbContext.Lessons.AnyAsync(l => l.Id == lessonId);
            if (!lessonExists)
            {
                throw new BusinessException($"Bài học với mã {lessonId} không tồn tại.");
            }

            var existingQuiz = await _dbContext.Quizzes.FirstOrDefaultAsync(q => q.LessonId == lessonId);
            if (existingQuiz != null)
            {
                throw new BusinessException($"Bài học với mã {lessonId} đã có đề thi. Vui lòng cập nhật thay vì tạo mới.");
            }

            var quiz = new Model.Entities.Quiz
            {
                LessonId = lessonId,
                Title = request.Title.Trim(),
                PassScore = request.PassScore,
                Version = 1,
                CreatedAt = DateTime.UtcNow
            };

            if (request.Questions != null && request.Questions.Any())
            {
                foreach (var qDto in request.Questions)
                {
                    var question = new Question
                    {
                        Content = qDto.Content.Trim(),
                        Explanation = qDto.Explanation?.Trim(),
                        Points = qDto.Points,
                        SortOrder = qDto.SortOrder,
                        QuestionType = qDto.QuestionType
                    };

                    if (qDto.Options != null && qDto.Options.Any())
                    {
                        foreach (var optDto in qDto.Options)
                        {
                            question.QuizOptions.Add(new QuizOption
                            {
                                OptionText = optDto.OptionText.Trim(),
                                IsCorrect = optDto.IsCorrect,
                                SortOrder = optDto.SortOrder
                            });
                        }
                    }

                    quiz.Questions.Add(question);
                }
            }

            _dbContext.Quizzes.Add(quiz);
            await _dbContext.SaveChangesAsync();

            return await GetQuizByLessonIdAsync(lessonId);
        }
    }
}
