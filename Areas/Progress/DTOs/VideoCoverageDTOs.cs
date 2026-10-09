namespace Microlearning.Areas.Progress.DTOs
{
    public record TimeRangeDto(double Start, double End);

    public record RecordVideoCoverageRequest(
        int LessonId,
        double TotalDuration,
        double CurrentPosition,
        List<TimeRangeDto> WatchedIntervals
    );

    public record VideoCoverageResponse(
        int LessonId,
        double WatchedCoveragePercent,
        double SkippedRatio,
        bool IsEligibleForCompletion,
        bool IsCompleted,
        DateTime? CompletedAt,
        string? Message
    );

    public record VideoCompletionEvaluation(
        double CoverageSeconds,
        double CoveragePercent,
        double SkippedRatio,
        bool IsEligibleForCompletion,
        bool IsCompleted
    );
}
