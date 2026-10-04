using Microlearning.DTOs;
using Microlearning.Model;
using Microlearning.Model.Entities;
using Microsoft.EntityFrameworkCore;

using Microlearning.Service.Interfaces;

namespace Microlearning.Service.Implement
{
    public class QuizService : IQuizService
    {
        public readonly ApplicationDbContext dbContext;
        public QuizService(ApplicationDbContext dbContext)
        {
            this.dbContext = dbContext;
        }
        public async Task<QuizDetailDTO>  GetQuizByLessonId(int lessonId)
        {
            var quiz = await dbContext.Quizzes
                .Include(q => q.Questions)
                    .ThenInclude(ques => ques.QuizOptions)
                .FirstOrDefaultAsync(q => q.LessonId == lessonId);

            if (quiz == null) throw new Exception("Quiz not found");

            // Map sang DTO để GIẤU cột IsCorrect đi
            return new QuizDetailDTO(
                quiz.Id,
                quiz.LessonId,
                quiz.Title,
                quiz.PassScore,
                quiz.Version,
                quiz.Questions.Select(q => new QuestionResponseDTO(
                    q.Id,
                    q.Content,
                    q.Points,
                    q.SortOrder,
                    q.QuestionType,
                    q.QuizOptions.Select(opt => new QuizOptionResponseDTO(
                        opt.Id,
                        opt.OptionText,
                        opt.SortOrder
                    )).ToList() // 👈 Không trả trường IsCorrect để chống gian lận
                )).ToList()
            );
        }

        public async Task<QuizAttemptResultDTO> SubmitQuizAttempt(string accountId, SubmitQuizAttemptDTO dto)
        {
            // ========================================================
            // BƯỚC 1: KIỂM TRA CHỐNG NỘP TRÙNG (IDEMPOTENCY)
            // ========================================================
            var existingAttempt = await dbContext.QuizAttempts
                .FirstOrDefaultAsync(a => a.ClientAttemptId == dto.ClientAttemptId);

            if (existingAttempt != null)
            {
                // Đã từng nộp rồi -> Trả ngay kết quả cũ kèm cờ IsDuplicate = true
                return new QuizAttemptResultDTO(
                    existingAttempt.Id,
                    existingAttempt.ClientAttemptId,
                    existingAttempt.QuizId,
                    existingAttempt.Score,
                    existingAttempt.IsPassed,
                    IsDuplicate: true, // 👈 Báo cho App biết là request này bị trùng
                    existingAttempt.SubmittedAt
                );
            }

            // ========================================================
            // BƯỚC 2: LẤY ĐỀ THI & ĐÁP ÁN ĐÚNG TỪ DATABASE LÊN ĐỂ CHẤM
            // ========================================================
            var quiz = await dbContext.Quizzes
                .Include(q => q.Questions)
                    .ThenInclude(ques => ques.QuizOptions)
                .FirstOrDefaultAsync(q => q.Id == dto.QuizId);

            if (quiz == null) throw new Exception("Quiz not found");

            // ========================================================
            // BƯỚC 3: DUYỆT TỪNG CÂU HỌC VIÊN LÀM ĐỂ SO SÁNH VÀ CHẤM ĐIỂM
            // ========================================================
            decimal totalScore = 0;
            var quizAnswers = new List<QuizAnswer>();

            foreach (var answerDto in dto.Answers)
            {
                var question = quiz.Questions.FirstOrDefault(q => q.Id == answerDto.QuestionId);
                if (question == null) continue;

                // Lấy danh sách ID các đáp án đúng của câu này từ Database
                var correctOptionIds = question.QuizOptions
                    .Where(o => o.IsCorrect)
                    .Select(o => o.Id)
                    .OrderBy(id => id)
                    .ToList();

                // Lấy danh sách ID học viên đã chọn
                var selectedIds = answerDto.SelectedOptionIds.OrderBy(id => id).ToList();

                // So khớp: Học viên chọn ĐÚNG VÀ ĐỦ thì mới được điểm
                bool isCorrect = correctOptionIds.SequenceEqual(selectedIds);
                decimal earnedScore = isCorrect ? question.Points : 0;

                totalScore += earnedScore;

                // Tạo bản ghi QuizAnswer (kèm các lựa chọn con QuizAnswerOption)
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

            // ========================================================
            // BƯỚC 4: LƯU TOÀN BỘ KẾT QUẢ VÀO DATABASE
            // ========================================================
            bool isPassed = totalScore >= quiz.PassScore;

            var newAttempt = new QuizAttempt
            {
                ClientAttemptId = dto.ClientAttemptId,
                AccountId = accountId,
                QuizId = quiz.Id,
                QuizVersion = quiz.Version,
                Score = totalScore,
                IsPassed = isPassed,
                StartedAt = dto.StartedAt,
                SubmittedAt = DateTime.UtcNow,
                CreatedAt = DateTime.UtcNow,
                QuizAnswers = quizAnswers // Lưu luôn cả danh sách câu trả lời
            };

            dbContext.QuizAttempts.Add(newAttempt);
            await dbContext.SaveChangesAsync();

            // Trả về kết quả chấm điểm cho học viên
            return new QuizAttemptResultDTO(
                newAttempt.Id,
                newAttempt.ClientAttemptId,
                newAttempt.QuizId,
                newAttempt.Score,
                newAttempt.IsPassed,
                IsDuplicate: false,
                newAttempt.SubmittedAt
            );
        }
        public async Task CreateQuiz(int lessonId,CreateQuizDTO dto)
        {
            dbContext.Quizzes.Add(new Quiz
            {
                LessonId = lessonId,
                Title = dto.Title,
                PassScore = dto.PassScore,
                Version = 1,
                CreatedAt = DateTime.UtcNow
            });
            await dbContext .SaveChangesAsync();    
        }


    }
}
