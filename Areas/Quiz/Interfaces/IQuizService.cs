using Microlearning.Areas.Quiz.DTOs;

namespace Microlearning.Areas.Quiz.Interfaces
{
    public interface IQuizService
    {
        Task<QuizDetailResponse> GetQuizByLessonIdAsync(int lessonId);
        Task<List<QuizSummaryResponse>> GetQuizzesByLessonIdAsync(int lessonId, string? accountId = null);
        Task<QuizDetailResponse> GetQuizByIdAsync(int quizId);
        Task<QuizAttemptResultResponse> SubmitQuizAttemptAsync(string accountId, SubmitQuizAttemptRequest request);
        Task<List<QuizAttemptHistoryResponse>> GetQuizHistoryAsync(string accountId, int quizId);
        Task<QuizDetailResponse> CreateQuizAsync(int lessonId, CreateQuizRequest request);
        Task<QuizDetailResponse> UpdateQuizAsync(int quizId, UpdateQuizRequest request);
        Task<bool> DeleteQuizAsync(int quizId);
    }
}
