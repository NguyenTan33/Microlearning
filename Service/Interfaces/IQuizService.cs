using Microlearning.DTOs;

namespace Microlearning.Service.Interfaces
{
    public interface IQuizService
    {
        Task<QuizDetailDTO> GetQuizByLessonId(int lessonId);
        Task<QuizAttemptResultDTO> SubmitQuizAttempt(string accountId, SubmitQuizAttemptDTO dto);
        Task CreateQuiz(int lessonId, CreateQuizDTO dto);
    }
}
