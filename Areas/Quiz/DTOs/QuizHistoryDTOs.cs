namespace Microlearning.Areas.Quiz.DTOs
{
    public record QuizAttemptHistoryResponse(
        int AttemptId,
        Guid ClientAttemptId,
        int QuizId,
        string QuizTitle,
        decimal Score,
        bool IsPassed,
        DateTime StartedAt,
        DateTime SubmittedAt,
        int TotalAnswers
    );
}
