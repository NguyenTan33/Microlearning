namespace Microlearning.Areas.Progress.DTOs
{
    public record SaveProgressRequest(
        int LessonId,
        int WatchedSeconds,
        decimal Percent
    );

    public record LessonProgressResponse(
        int LessonId,
        int WatchedSeconds,
        decimal Percent,
        bool IsCompleted,
        DateTime? CompletedAt,
        DateTime LastPlayedAt
    );

    public record CourseProgressResponse(
        int CourseId,
        decimal OverallPercent,
        int CompletedLessons,
        int TotalLessons
    );
}
