namespace Microlearning.Areas.Quiz.DTOs
{
    public record SubmitAnswerItemRequest(
        int QuestionId,
        List<int> SelectedOptionIds
    );

    public record SubmitQuizAttemptRequest(
        Guid ClientAttemptId,
        int QuizId,
        DateTime StartedAt,
        List<SubmitAnswerItemRequest> Answers
    );

    public record QuizAttemptResultResponse(
        int AttemptId,
        Guid ClientAttemptId,
        int QuizId,
        decimal Score,
        bool IsPassed,
        bool IsDuplicate,
        DateTime SubmittedAt,
        int CorrectAnswersCount,
        int TotalQuestionsCount
    );
}
