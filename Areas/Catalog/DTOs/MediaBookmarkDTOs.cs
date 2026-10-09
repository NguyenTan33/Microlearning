namespace Microlearning.Areas.Catalog.DTOs
{
    public record CreateMediaBookmarkRequest(
        int LessonId,
        int? MediaId,
        int CourseId,
        string? CourseTitle,
        string? LessonTitle,
        double Timestamp,
        string Title,
        string? Note = null,
        string? Id = null
    );

    public record MediaBookmarkResponse(
        string Id,
        int LessonId,
        int? MediaId,
        int CourseId,
        string CourseTitle,
        string LessonTitle,
        double Timestamp,
        string FormattedTime,
        string Title,
        string? Note,
        DateTime CreatedAt
    );
}
