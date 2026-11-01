namespace Microlearning.Areas.Catalog.DTOs
{
    public record CreateCourseRequest(
        string Title,
        string? Description = null,
        string? ThumbnailUrl = null,
        bool IsPublished = true,
        bool IsPrivate = false,
        string? AccessPassword = null
    );

    public record UpdateCourseRequest(
        string Title,
        string? Description = null,
        string? ThumbnailUrl = null,
        bool IsPublished = true,
        bool IsPrivate = false,
        string? AccessPassword = null
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
        int TotalSubjects = 0,
        bool IsPrivate = false,
        string? AuthorName = null,
        string? CreatedByAccountId = null,
        bool CanEdit = true
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
        List<SubjectResponse> Subjects,
        bool IsPrivate = false,
        bool HasAccess = true,
        string? AuthorName = null,
        string? CreatedByAccountId = null,
        bool CanEdit = true
    );
}
