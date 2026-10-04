namespace Microlearning.Areas.Catalog.DTOs
{
    public record CreateLessonRequest(
        int SubjectId,
        string Title,
        string? Description = null,
        int DurationSeconds = 0,
        int SortOrder = 0,
        bool IsPublished = true
    );

    public record UpdateLessonRequest(
        string Title,
        string? Description = null,
        int DurationSeconds = 0,
        int SortOrder = 0,
        bool IsPublished = true
    );

    public record LessonResponse(
        int Id,
        int SubjectId,
        string Title,
        string? Description,
        int DurationSeconds,
        int SortOrder,
        int Version,
        bool IsPublished,
        DateTime CreatedAt,
        DateTime? UpdatedAt,
        bool HasQuiz = false,
        int MediaAssetCount = 0
    );
}
