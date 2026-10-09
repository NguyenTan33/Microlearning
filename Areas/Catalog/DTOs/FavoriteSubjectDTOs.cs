namespace Microlearning.Areas.Catalog.DTOs
{
    public record FavoriteSubjectDto(
        int SubjectId,
        string Title,
        string? Description,
        int CourseId,
        string CourseTitle,
        int TotalLessons,
        DateTime CreatedAt
    );

    public record ToggleFavoriteResponse(
        int SubjectId,
        bool IsFavorite,
        string Message
    );
}
