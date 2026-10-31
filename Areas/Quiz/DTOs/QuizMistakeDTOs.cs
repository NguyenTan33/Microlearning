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
        int CourseId,
        string CourseTitle,
        string SubjectTitle,
        int SelectedOptionId,
        int FailedCount,
        bool IsResolved,
        DateTime LastFailedAt,
        DateTime? ResolvedAt,
        List<QuizMistakeOptionDto> Options
    );

    public record LessonMistakeGroupDto(
        int LessonId,
        string LessonTitle,
        int CourseId,
        string CourseTitle,
        string SubjectTitle,
        int TotalMistakes,
        int UnresolvedCount,
        List<QuizMistakeItemDto> Mistakes
    );

    public record CourseMistakeGroupDto(
        int CourseId,
        string CourseTitle,
        int TotalMistakes,
        int UnresolvedCount,
        List<LessonMistakeGroupDto> Lessons
    );

    public record QuizPracticeSessionDto(
        int TotalMistakes,
        List<QuizMistakeItemDto> Mistakes,
        int? CurrentLessonId = null,
        string? CurrentLessonTitle = null,
        int? CurrentCourseId = null,
        string? CurrentCourseTitle = null
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
