using Microlearning.Areas.Quiz.DTOs;

namespace Microlearning.Areas.Quiz.Interfaces
{
    public interface IQuizService
    {
        Task<QuizDetailResponse> GetQuizByLessonIdAsync(int lessonId);
        Task<QuizAttemptResultResponse> SubmitQuizAttemptAsync(string accountId, SubmitQuizAttemptRequest request);
        Task<List<QuizAttemptHistoryResponse>> GetQuizHistoryAsync(string accountId, int quizId);
        Task<QuizDetailResponse> CreateQuizAsync(int lessonId, CreateQuizRequest request);
    }
}
