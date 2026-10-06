namespace Microlearning.Areas.Admin.DTOs
{
    public record StudentProgressDetailDto(
        string AccountId,
        string FullName,
        string? Email,
        string? PhoneNumber,
        int CompletedLessons,
        int TotalLessons,
        double ProgressPercent,
        DateTime? LastActiveAt,
        bool HasCompletedCourse
    );

    public record CourseOverviewMetricsDto(
        int CourseId,
        string CourseTitle,
        int TotalStudentsEnrolled,
        int TotalLessons,
        double AverageProgressPercent,
        int CompletedStudentsCount
    );

    public class StudentProgressFilterDto
    {
        public string? SearchTerm { get; set; }
        public int PageNumber { get; set; } = 1;
        public int PageSize { get; set; } = 20;
        public bool? OnlyCompleted { get; set; }
    }

    public record PagedResult<T>(
        List<T> Items,
        int TotalCount,
        int PageNumber,
        int PageSize,
        int TotalPages
    );
}
