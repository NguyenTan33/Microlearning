namespace Microlearning.Areas.Catalog.DTOs
{
    public record CreateSubjectRequest(
        int CourseId,
        string Title,
        string? Description = null,
        int SortOrder = 0
    );

    public record UpdateSubjectRequest(
        string Title,
        string? Description = null,
        int SortOrder = 0
    );

    public record SubjectResponse(
        int Id,
        int CourseId,
        string Title,
        string? Description,
        int SortOrder,
        DateTime CreatedAt,
        DateTime? UpdatedAt,
        int TotalLessons = 0
    );
}
