using Microlearning.Areas.Quiz.DTOs;
using Microlearning.Areas.Quiz.Interfaces;
using Microlearning.Exceptions;
using Microlearning.Model;
using Microlearning.Model.Entities;
using Microsoft.EntityFrameworkCore;

namespace Microlearning.Areas.Quiz.Services
{
    public class QuizMistakeVaultService : IQuizMistakeVaultService
    {
        private readonly ApplicationDbContext _dbContext;
        private readonly ILogger<QuizMistakeVaultService> _logger;

        public QuizMistakeVaultService(
            ApplicationDbContext dbContext,
            ILogger<QuizMistakeVaultService> logger)
        {
            _dbContext = dbContext;
            _logger = logger;
        }

        public async Task<IReadOnlyList<QuizMistakeItemDto>> GetMyMistakesAsync(string userId, bool includeResolved = false, CancellationToken cancellationToken = default)
        {
            var query = _dbContext.UserQuizMistakes
                .AsNoTracking()
                .Include(m => m.Question)
                    .ThenInclude(q => q.QuizOptions)
                .Include(m => m.Lesson)
                .Where(m => m.AccountId == userId);

            if (!includeResolved)
            {
                query = query.Where(m => !m.IsResolved);
            }

            var mistakes = await query
                .OrderByDescending(m => m.LastFailedAt)
                .Select(m => new QuizMistakeItemDto(
                    m.Id,
                    m.QuestionId,
                    m.Question.Content,
                    m.Question.Explanation,
                    m.QuizId,
                    m.LessonId,
                    m.Lesson.Title,
                    m.SelectedOptionId,
                    m.FailedCount,
                    m.IsResolved,
                    m.LastFailedAt,
                    m.ResolvedAt,
                    m.Question.QuizOptions
                        .OrderBy(o => o.SortOrder)
                        .Select(o => new QuizMistakeOptionDto(o.Id, o.OptionText, o.SortOrder))
                        .ToList()
                ))
                .ToListAsync(cancellationToken);

            return mistakes;
        }

        public async Task<QuizPracticeSessionDto> GenerateReviewSessionAsync(string userId, int? lessonId = null, CancellationToken cancellationToken = default)
        {
            var query = _dbContext.UserQuizMistakes
                .AsNoTracking()
                .Include(m => m.Question)
                    .ThenInclude(q => q.QuizOptions)
                .Include(m => m.Lesson)
                .Where(m => m.AccountId == userId && !m.IsResolved);

            if (lessonId.HasValue && lessonId.Value > 0)
            {
                query = query.Where(m => m.LessonId == lessonId.Value);
            }

            var mistakes = await query
                .OrderByDescending(m => m.FailedCount)
                .ThenByDescending(m => m.LastFailedAt)
                .Select(m => new QuizMistakeItemDto(
                    m.Id,
                    m.QuestionId,
                    m.Question.Content,
                    m.Question.Explanation,
                    m.QuizId,
                    m.LessonId,
                    m.Lesson.Title,
                    m.SelectedOptionId,
                    m.FailedCount,
                    m.IsResolved,
                    m.LastFailedAt,
                    m.ResolvedAt,
                    m.Question.QuizOptions
                        .OrderBy(o => o.SortOrder)
                        .Select(o => new QuizMistakeOptionDto(o.Id, o.OptionText, o.SortOrder))
                        .ToList()
                ))
                .ToListAsync(cancellationToken);

            return new QuizPracticeSessionDto(mistakes.Count, mistakes);
        }

        public async Task<MistakeAnswerResultDto> SubmitPracticeAnswerAsync(string userId, long mistakeId, int selectedOptionId, CancellationToken cancellationToken = default)
        {
            var mistake = await _dbContext.UserQuizMistakes
                .Include(m => m.Question)
                    .ThenInclude(q => q.QuizOptions)
                .FirstOrDefaultAsync(m => m.Id == mistakeId && m.AccountId == userId, cancellationToken);

            if (mistake == null)
            {
                throw new BusinessException($"Không tìm thấy câu hỏi ôn tập với mã {mistakeId}.");
            }

            var question = mistake.Question;
            var correctOption = question.QuizOptions.FirstOrDefault(o => o.IsCorrect);
            int correctOptionId = correctOption?.Id ?? 0;

            bool isCorrect = selectedOptionId == correctOptionId;

            if (isCorrect)
            {
                mistake.IsResolved = true;
                mistake.ResolvedAt = DateTime.UtcNow;
            }
            else
            {
                mistake.FailedCount += 1;
                mistake.LastFailedAt = DateTime.UtcNow;
            }

            mistake.SelectedOptionId = selectedOptionId;
            await _dbContext.SaveChangesAsync(cancellationToken);

            string feedback = isCorrect
                ? "Chính xác! Bạn đã hiểu bài và khắc phục thành công lỗi sai này."
                : "Rất tiếc, câu trả lời vẫn chưa đúng. Hãy đọc kỹ phần giải thích để củng cố kiến thức!";

            return new MistakeAnswerResultDto(
                mistake.Id,
                mistake.QuestionId,
                isCorrect,
                correctOptionId,
                question.Explanation,
                mistake.IsResolved,
                mistake.FailedCount,
                feedback
            );
        }

        public async Task RecordMistakesFromAttemptAsync(string userId, int quizId, int lessonId, IEnumerable<(int questionId, int selectedOptionId, bool isCorrect)> answers, CancellationToken cancellationToken = default)
        {
            foreach (var item in answers)
            {
                var mistake = await _dbContext.UserQuizMistakes
                    .FirstOrDefaultAsync(m => m.AccountId == userId && m.QuestionId == item.questionId, cancellationToken);

                if (!item.isCorrect)
                {
                    if (mistake == null)
                    {
                        mistake = new UserQuizMistake
                        {
                            AccountId = userId,
                            QuizId = quizId,
                            LessonId = lessonId,
                            QuestionId = item.questionId,
                            SelectedOptionId = item.selectedOptionId,
                            FailedCount = 1,
                            IsResolved = false,
                            LastFailedAt = DateTime.UtcNow
                        };
                        _dbContext.UserQuizMistakes.Add(mistake);
                    }
                    else
                    {
                        mistake.FailedCount += 1;
                        mistake.IsResolved = false;
                        mistake.SelectedOptionId = item.selectedOptionId;
                        mistake.LastFailedAt = DateTime.UtcNow;
                        mistake.ResolvedAt = null;
                    }
                }
                else
                {
                    // Nếu trước đó câu này từng sai và chưa giải quyết, nay làm đúng thì đánh dấu đã khắc phục
                    if (mistake != null && !mistake.IsResolved)
                    {
                        mistake.IsResolved = true;
                        mistake.ResolvedAt = DateTime.UtcNow;
                    }
                }
            }

            await _dbContext.SaveChangesAsync(cancellationToken);
        }
    }
}
