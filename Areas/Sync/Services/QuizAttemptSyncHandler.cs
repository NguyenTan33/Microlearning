using System.Text.Json;
using Microlearning.Areas.Sync.DTOs;
using Microlearning.Areas.Sync.Interfaces;
using Microlearning.Exceptions;
using Microlearning.Model;
using Microlearning.Model.Entities;
using Microsoft.EntityFrameworkCore;

namespace Microlearning.Areas.Sync.Services
{
    public class QuizAttemptSyncHandler : ISyncOperationHandler
    {
        private readonly ApplicationDbContext _context;
        private readonly ILogger<QuizAttemptSyncHandler> _logger;

        public QuizAttemptSyncHandler(
            ApplicationDbContext context,
            ILogger<QuizAttemptSyncHandler> logger)
        {
            _context = context;
            _logger = logger;
        }

        public string OperationType => "QUIZ_ATTEMPT";

        public async Task<string?> HandleAsync(
            string accountId,
            string deviceId,
            string payloadJson,
            CancellationToken cancellationToken = default)
        {
            var payload = JsonSerializer.Deserialize<QuizAttemptPayload>(payloadJson, new JsonSerializerOptions
            {
                PropertyNameCaseInsensitive = true
            });

            if (payload == null || payload.ClientAttemptId == Guid.Empty || payload.QuizId <= 0)
            {
                throw new BusinessException("Dữ liệu nộp bài trắc nghiệm (QUIZ_ATTEMPT) không hợp lệ.");
            }

            // 1. Kiểm tra Idempotency theo ClientAttemptId (chống nộp trùng lặp)
            var existingAttempt = await _context.QuizAttempts
                .FirstOrDefaultAsync(a => a.ClientAttemptId == payload.ClientAttemptId, cancellationToken);

            if (existingAttempt != null)
            {
                _logger.LogWarning("Phát hiện lần nộp Quiz trùng lặp ClientAttemptId={AttemptId}. Trả lại kết quả cũ.", payload.ClientAttemptId);
                return JsonSerializer.Serialize(new
                {
                    clientAttemptId = existingAttempt.ClientAttemptId,
                    score = existingAttempt.Score,
                    isPassed = existingAttempt.IsPassed,
                    isDuplicate = true
                });
            }

            // 2. Lấy thông tin đề thi và các câu hỏi kèm đáp án đúng từ DB
            var quiz = await _context.Quizzes
                .Include(q => q.Questions)
                    .ThenInclude(qs => qs.QuizOptions)
                .FirstOrDefaultAsync(q => q.Id == payload.QuizId, cancellationToken);

            if (quiz == null)
            {
                throw new BusinessException($"Không tìm thấy bài Quiz với ID = {payload.QuizId}.");
            }

            // 3. Tiến hành chấm điểm an toàn trên Server (Server-side Grading)
            int totalQuestions = quiz.Questions.Count;
            int correctCount = 0;

            var attempt = new QuizAttempt
            {
                ClientAttemptId = payload.ClientAttemptId,
                AccountId = accountId,
                QuizId = payload.QuizId,
                QuizVersion = quiz.Version,
                StartedAt = payload.StartedAt,
                SubmittedAt = payload.SubmittedAt,
                CreatedAt = DateTime.UtcNow
            };

            foreach (var question in quiz.Questions)
            {
                var userAnswer = payload.Answers.FirstOrDefault(a => a.QuestionId == question.Id);
                var isCorrect = false;

                if (userAnswer != null)
                {
                    var selectedOption = question.QuizOptions.FirstOrDefault(o => o.Id == userAnswer.SelectedOptionId);
                    if (selectedOption != null && selectedOption.IsCorrect)
                    {
                        isCorrect = true;
                        correctCount++;
                    }
                }

                // Ghi nhận câu trả lời vào QuizAnswer
                var quizAnswer = new QuizAnswer
                {
                    QuestionId = question.Id,
                    IsCorrect = isCorrect,
                };

                if (userAnswer != null)
                {
                    quizAnswer.SelectedOptions.Add(new QuizAnswerOption
                    {
                        QuizOptionId = userAnswer.SelectedOptionId
                    });
                }

                attempt.QuizAnswers.Add(quizAnswer);
            }

            // 4. Tính điểm theo thang điểm 100
            decimal finalScore = totalQuestions > 0 ? ((decimal)correctCount / totalQuestions) * 100m : 0m;
            attempt.Score = Math.Round(finalScore, 2);
            attempt.IsPassed = attempt.Score >= quiz.PassScore;

            _context.QuizAttempts.Add(attempt);

            _logger.LogInformation(
                "Đã chấm điểm Quiz thành công: User={User}, Quiz={Quiz}, Score={Score}, Passed={Passed}",
                accountId, quiz.Id, attempt.Score, attempt.IsPassed);

            return JsonSerializer.Serialize(new
            {
                clientAttemptId = attempt.ClientAttemptId,
                score = attempt.Score,
                isPassed = attempt.IsPassed,
                correctAnswers = $"{correctCount}/{totalQuestions}"
            });
        }
    }
}