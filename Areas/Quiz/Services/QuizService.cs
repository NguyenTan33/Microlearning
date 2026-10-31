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

        public async Task<List<QuizSummaryResponse>> GetQuizzesByLessonIdAsync(int lessonId, string? accountId = null)
        {
            var quizzes = await _dbContext.Quizzes
                .AsNoTracking()
                .Include(q => q.Questions)
                .Where(q => q.LessonId == lessonId)
                .OrderBy(q => q.Id)
                .ToListAsync();

            List<QuizAttempt> attempts = new();
            if (!string.IsNullOrWhiteSpace(accountId) && quizzes.Any())
            {
                var quizIds = quizzes.Select(q => q.Id).ToList();
                attempts = await _dbContext.QuizAttempts
                    .AsNoTracking()
                    .Where(a => a.AccountId == accountId && quizIds.Contains(a.QuizId))
                    .ToListAsync();
            }

            return quizzes.Select(q =>
            {
                var qAttempts = attempts.Where(a => a.QuizId == q.Id).ToList();
                double? bestScore = qAttempts.Any() ? (double)qAttempts.Max(a => a.Score) : null;
                bool isPassed = qAttempts.Any(a => a.IsPassed);
                int attemptsCount = qAttempts.Count;

                return new QuizSummaryResponse(
                    q.Id,
                    q.LessonId,
                    q.Title,
                    q.PassScore,
                    q.Version,
                    q.Questions.Count,
                    bestScore,
                    isPassed,
                    attemptsCount
                );
            }).ToList();
        }

        public async Task<QuizDetailResponse> GetQuizByIdAsync(int quizId)
        {
            var quiz = await _dbContext.Quizzes
                .AsNoTracking()
                .Include(q => q.Questions.OrderBy(ques => ques.SortOrder))
                    .ThenInclude(ques => ques.QuizOptions.OrderBy(opt => opt.SortOrder))
                .FirstOrDefaultAsync(q => q.Id == quizId);

            if (quiz == null)
            {
                throw new BusinessException($"Không tìm thấy đề thi với mã {quizId}.");
            }

            return MapToDetailResponse(quiz);
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

            return MapToDetailResponse(quiz);
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
                    IsDuplicate: true,
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

                var correctOption = question.QuizOptions.FirstOrDefault(opt => opt.IsCorrect);
                bool isCorrect = false;

                if (correctOption != null && answerDto.SelectedOptionIds.Contains(correctOption.Id))
                {
                    isCorrect = true;
                    totalScore += question.Points;
                    correctAnswers++;
                }

                var quizAnswer = new QuizAnswer
                {
                    QuestionId = question.Id,
                    IsCorrect = isCorrect,
                    EarnedScore = isCorrect ? question.Points : 0
                };

                foreach (var optId in answerDto.SelectedOptionIds)
                {
                    quizAnswer.SelectedOptions.Add(new QuizAnswerOption
                    {
                        QuizOptionId = optId
                    });
                }

                quizAnswers.Add(quizAnswer);

                int chosenOptId = answerDto.SelectedOptionIds.FirstOrDefault();
                evaluatedAnswers.Add((question.Id, chosenOptId, isCorrect));
            }

            int totalPossiblePoints = quiz.Questions.Sum(q => q.Points);
            decimal scorePercentage = totalPossiblePoints > 0
                ? Math.Round((totalScore / totalPossiblePoints) * 100, 2)
                : 0;

            bool isPassed = scorePercentage >= quiz.PassScore;

            var newAttempt = new QuizAttempt
            {
                ClientAttemptId = request.ClientAttemptId,
                AccountId = accountId,
                QuizId = quiz.Id,
                QuizVersion = quiz.Version,
                Score = scorePercentage,
                IsPassed = isPassed,
                StartedAt = request.StartedAt,
                SubmittedAt = DateTime.UtcNow,
                CreatedAt = DateTime.UtcNow,
                QuizAnswers = quizAnswers
            };

            _dbContext.QuizAttempts.Add(newAttempt);

            // BƯỚC 4: LƯU SỔ TAY CÂU HỎI SAI
            try
            {
                await _mistakeVaultService.RecordMistakesFromAttemptAsync(
                    accountId,
                    quiz.Id,
                    quiz.LessonId,
                    evaluatedAnswers
                );
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Lỗi khi ghi nhận câu sai vào Sổ tay câu hỏi cho user {AccountId}", accountId);
            }

            // BƯỚC 5: CẬP NHẬT CHUỖI HỌC TẬP (STREAK) NẾU ĐẠT
            if (isPassed)
            {
                try
                {
                    await _streakService.RecordDailyLearningAsync(accountId);
                }
                catch (Exception ex)
                {
                    _logger.LogError(ex, "Lỗi khi cập nhật streak cho user {AccountId}", accountId);
                }
            }

            await _dbContext.SaveChangesAsync();

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
                .Where(a => a.AccountId == accountId && a.QuizId == quizId)
                .OrderByDescending(a => a.SubmittedAt)
                .Select(a => new QuizAttemptHistoryResponse(
                    a.Id,
                    a.ClientAttemptId,
                    a.QuizId,
                    a.Quiz != null ? a.Quiz.Title : "Bài tập",
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

            return await GetQuizByIdAsync(quiz.Id);
        }

        public async Task<QuizDetailResponse> UpdateQuizAsync(int quizId, UpdateQuizRequest request)
        {
            var quiz = await _dbContext.Quizzes
                .Include(q => q.Questions)
                    .ThenInclude(ques => ques.QuizOptions)
                .Include(q => q.QuizAttempts)
                .FirstOrDefaultAsync(q => q.Id == quizId);

            if (quiz == null)
            {
                throw new BusinessException($"Không tìm thấy đề thi với mã {quizId}.");
            }

            quiz.Title = request.Title.Trim();
            quiz.PassScore = request.PassScore;
            quiz.Version += 1;
            quiz.UpdatedAt = DateTime.UtcNow;

            var oldQuestionIds = quiz.Questions.Select(q => q.Id).ToList();

            // Xóa UserQuizMistakes liên quan
            var relatedMistakes = await _dbContext.UserQuizMistakes
                .Where(m => m.QuizId == quiz.Id || (oldQuestionIds.Any() && oldQuestionIds.Contains(m.QuestionId)))
                .ToListAsync();
            if (relatedMistakes.Any())
            {
                _dbContext.UserQuizMistakes.RemoveRange(relatedMistakes);
            }

            // Xóa QuizAnswers & QuizAttempts cũ
            var attemptIds = quiz.QuizAttempts.Select(a => a.Id).ToList();
            if (attemptIds.Any())
            {
                var relatedAnswerIds = await _dbContext.QuizAnswers
                    .Where(a => attemptIds.Contains(a.QuizAttemptId))
                    .Select(a => a.Id)
                    .ToListAsync();

                if (relatedAnswerIds.Any())
                {
                    var relatedAnswerOptions = await _dbContext.QuizAnswerOptions
                        .Where(o => relatedAnswerIds.Contains(o.QuizAnswerId))
                        .ToListAsync();
                    if (relatedAnswerOptions.Any())
                    {
                        _dbContext.QuizAnswerOptions.RemoveRange(relatedAnswerOptions);
                    }

                    var answersToDelete = await _dbContext.QuizAnswers
                        .Where(a => relatedAnswerIds.Contains(a.Id))
                        .ToListAsync();
                    _dbContext.QuizAnswers.RemoveRange(answersToDelete);
                }

                _dbContext.QuizAttempts.RemoveRange(quiz.QuizAttempts);
            }

            // Xóa sạch câu hỏi cũ
            foreach (var ques in quiz.Questions)
            {
                if (ques.QuizOptions.Any())
                {
                    _dbContext.QuizOptions.RemoveRange(ques.QuizOptions);
                }
            }
            _dbContext.Questions.RemoveRange(quiz.Questions);

            // Thêm câu hỏi mới
            if (request.Questions != null && request.Questions.Any())
            {
                foreach (var qDto in request.Questions)
                {
                    var question = new Question
                    {
                        QuizId = quiz.Id,
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

            await _dbContext.SaveChangesAsync();
            return await GetQuizByIdAsync(quiz.Id);
        }

        public async Task<bool> DeleteQuizAsync(int quizId)
        {
            var quiz = await _dbContext.Quizzes
                .Include(q => q.Questions)
                    .ThenInclude(ques => ques.QuizOptions)
                .Include(q => q.QuizAttempts)
                .FirstOrDefaultAsync(q => q.Id == quizId);

            if (quiz == null) return false;

            var oldQuestionIds = quiz.Questions.Select(q => q.Id).ToList();

            var relatedMistakes = await _dbContext.UserQuizMistakes
                .Where(m => m.QuizId == quiz.Id || (oldQuestionIds.Any() && oldQuestionIds.Contains(m.QuestionId)))
                .ToListAsync();
            if (relatedMistakes.Any())
            {
                _dbContext.UserQuizMistakes.RemoveRange(relatedMistakes);
            }

            var attemptIds = quiz.QuizAttempts.Select(a => a.Id).ToList();
            if (attemptIds.Any())
            {
                var relatedAnswerIds = await _dbContext.QuizAnswers
                    .Where(a => attemptIds.Contains(a.QuizAttemptId))
                    .Select(a => a.Id)
                    .ToListAsync();

                if (relatedAnswerIds.Any())
                {
                    var relatedAnswerOptions = await _dbContext.QuizAnswerOptions
                        .Where(o => relatedAnswerIds.Contains(o.QuizAnswerId))
                        .ToListAsync();
                    if (relatedAnswerOptions.Any())
                    {
                        _dbContext.QuizAnswerOptions.RemoveRange(relatedAnswerOptions);
                    }

                    var answersToDelete = await _dbContext.QuizAnswers
                        .Where(a => relatedAnswerIds.Contains(a.Id))
                        .ToListAsync();
                    _dbContext.QuizAnswers.RemoveRange(answersToDelete);
                }

                _dbContext.QuizAttempts.RemoveRange(quiz.QuizAttempts);
            }

            foreach (var ques in quiz.Questions)
            {
                if (ques.QuizOptions.Any())
                {
                    _dbContext.QuizOptions.RemoveRange(ques.QuizOptions);
                }
            }
            _dbContext.Questions.RemoveRange(quiz.Questions);

            _dbContext.Quizzes.Remove(quiz);
            await _dbContext.SaveChangesAsync();
            return true;
        }

        private static QuizDetailResponse MapToDetailResponse(Model.Entities.Quiz quiz)
        {
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
    }
}
