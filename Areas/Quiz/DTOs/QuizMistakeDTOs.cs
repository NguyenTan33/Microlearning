namespace Microlearning.Areas.Quiz.DTOs
{
    public record QuizMistakeOptionDto(
        int Id,
        string OptionText,
        int SortOrder
    );

    public record QuizMistakeItemDto(
        long Id,
        int QuestionId,
        string QuestionText,
        string? Explanation,
        int QuizId,
        int LessonId,
        string LessonTitle,
        int SelectedOptionId,
        int FailedCount,
        bool IsResolved,
        DateTime LastFailedAt,
        DateTime? ResolvedAt,
        List<QuizMistakeOptionDto> Options
    );

    public record QuizPracticeSessionDto(
        int TotalMistakes,
        List<QuizMistakeItemDto> Mistakes
    );

    public record SubmitMistakeAnswerRequest(
        int SelectedOptionId
    );

    public record MistakeAnswerResultDto(
        long MistakeId,
        int QuestionId,
        bool IsCorrect,
        int CorrectOptionId,
        string? Explanation,
        bool IsResolved,
        int FailedCount,
        string FeedbackMessage
    );
}
