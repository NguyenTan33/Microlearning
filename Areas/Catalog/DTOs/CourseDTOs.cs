namespace Microlearning.Areas.Catalog.DTOs
{
    public record CreateCourseRequest(
        string Title,
        string? Description = null,
        string? ThumbnailUrl = null,
        bool IsPublished = true
    );

    public record UpdateCourseRequest(
        string Title,
        string? Description = null,
        string? ThumbnailUrl = null,
        bool IsPublished = true
    );

    public record CourseResponse(
        int Id,
        string Title,
        string? Description,
        string? ThumbnailUrl,
        int Version,
        bool IsPublished,
        DateTime CreatedAt,
        DateTime? UpdatedAt,
        int TotalSubjects = 0
    );

    public record CourseDetailResponse(
        int Id,
        string Title,
        string? Description,
        string? ThumbnailUrl,
        int Version,
        bool IsPublished,
        DateTime CreatedAt,
        DateTime? UpdatedAt,
        List<SubjectResponse> Subjects
    );
}
