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
                    .ThenInclude(l => l.Subject)
                        .ThenInclude(s => s.Course)
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
                    m.Lesson.Subject != null && m.Lesson.Subject.Course != null ? m.Lesson.Subject.Course.Id : 0,
                    m.Lesson.Subject != null && m.Lesson.Subject.Course != null ? m.Lesson.Subject.Course.Title : "Chưa phân khóa",
                    m.Lesson.Subject != null ? m.Lesson.Subject.Title : "Chưa phân môn",
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

        public async Task<List<CourseMistakeGroupDto>> GetGroupedMistakesAsync(string userId, bool includeResolved = false, CancellationToken cancellationToken = default)
        {
            var rawMistakes = await GetMyMistakesAsync(userId, includeResolved, cancellationToken);
            if (!rawMistakes.Any())
            {
                return new List<CourseMistakeGroupDto>();
            }

            var courseGroups = rawMistakes
                .GroupBy(m => new { m.CourseId, m.CourseTitle })
                .Select(cg =>
                {
                    var lessonGroups = cg
                        .GroupBy(m => new { m.LessonId, m.LessonTitle, m.SubjectTitle })
                        .Select(lg => new LessonMistakeGroupDto(
                            lg.Key.LessonId,
                            lg.Key.LessonTitle,
                            cg.Key.CourseId,
                            cg.Key.CourseTitle,
                            lg.Key.SubjectTitle,
                            lg.Count(),
                            lg.Count(x => !x.IsResolved),
                            lg.OrderByDescending(x => x.FailedCount).ThenByDescending(x => x.LastFailedAt).ToList()
                        ))
                        .OrderByDescending(l => l.UnresolvedCount)
                        .ThenBy(l => l.LessonTitle)
                        .ToList();

                    return new CourseMistakeGroupDto(
                        cg.Key.CourseId,
                        cg.Key.CourseTitle,
                        cg.Count(),
                        cg.Count(x => !x.IsResolved),
                        lessonGroups
                    );
                })
                .OrderByDescending(c => c.UnresolvedCount)
                .ThenBy(c => c.CourseTitle)
                .ToList();

            return courseGroups;
        }

        public async Task<QuizPracticeSessionDto> GenerateReviewSessionAsync(
            string userId,
            int? lessonId = null,
            int? courseId = null,
            CancellationToken cancellationToken = default)
        {
            var query = _dbContext.UserQuizMistakes
                .AsNoTracking()
                .Include(m => m.Question)
                    .ThenInclude(q => q.QuizOptions)
                .Include(m => m.Lesson)
                    .ThenInclude(l => l.Subject)
                        .ThenInclude(s => s.Course)
                .Where(m => m.AccountId == userId && !m.IsResolved);

            if (lessonId.HasValue && lessonId.Value > 0)
            {
                query = query.Where(m => m.LessonId == lessonId.Value);
            }
            else if (courseId.HasValue && courseId.Value > 0)
            {
                query = query.Where(m => m.Lesson.Subject.CourseId == courseId.Value);
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
                    m.Lesson.Subject != null && m.Lesson.Subject.Course != null ? m.Lesson.Subject.Course.Id : 0,
                    m.Lesson.Subject != null && m.Lesson.Subject.Course != null ? m.Lesson.Subject.Course.Title : "Chưa phân khóa",
                    m.Lesson.Subject != null ? m.Lesson.Subject.Title : "Chưa phân môn",
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

            string? lessonTitle = null;
            string? courseTitle = null;

            if (mistakes.Any())
            {
                var first = mistakes.First();
                lessonTitle = lessonId.HasValue ? first.LessonTitle : null;
                courseTitle = courseId.HasValue ? first.CourseTitle : null;
            }

            return new QuizPracticeSessionDto(
                mistakes.Count,
                mistakes,
                lessonId,
                lessonTitle,
                courseId,
                courseTitle
            );
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
                ? "Chính xác! Bạn đã hiểu bài và khắc phục thành công câu hỏi sai này."
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
