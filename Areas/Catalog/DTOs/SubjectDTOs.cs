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
        int TotalLessons = 0,
        List<LessonResponse>? Lessons = null
    )
    {
        public SubjectResponse(
            int id,
            int courseId,
            string title,
            string? description,
            int sortOrder,
            DateTime createdAt,
            DateTime? updatedAt,
            int totalLessons
        ) : this(id, courseId, title, description, sortOrder, createdAt, updatedAt, totalLessons, null)
        {
        }

        public SubjectResponse(
            int id,
            int courseId,
            string title,
            string? description,
            int sortOrder,
            DateTime createdAt,
            DateTime? updatedAt
        ) : this(id, courseId, title, description, sortOrder, createdAt, updatedAt, 0, null)
        {
        }
    }
}
