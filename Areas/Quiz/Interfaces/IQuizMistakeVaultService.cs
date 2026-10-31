using Microlearning.Areas.Quiz.DTOs;

namespace Microlearning.Areas.Quiz.Interfaces
{
    public interface IQuizMistakeVaultService
    {
        Task<IReadOnlyList<QuizMistakeItemDto>> GetMyMistakesAsync(string userId, bool includeResolved = false, CancellationToken cancellationToken = default);
        Task<List<CourseMistakeGroupDto>> GetGroupedMistakesAsync(string userId, bool includeResolved = false, CancellationToken cancellationToken = default);
        Task<QuizPracticeSessionDto> GenerateReviewSessionAsync(string userId, int? lessonId = null, int? courseId = null, CancellationToken cancellationToken = default);
        Task<MistakeAnswerResultDto> SubmitPracticeAnswerAsync(string userId, long mistakeId, int selectedOptionId, CancellationToken cancellationToken = default);
        Task RecordMistakesFromAttemptAsync(string userId, int quizId, int lessonId, IEnumerable<(int questionId, int selectedOptionId, bool isCorrect)> answers, CancellationToken cancellationToken = default);
    }
}
