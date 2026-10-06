namespace Microlearning.Areas.Gamification.DTOs
{
    public record UserStreakDto(
        int CurrentStreak,
        int LongestStreak,
        DateOnly? LastActiveDate,
        bool HasMasterCrown,
        DateTime? CrownAwardedAt,
        int CompletedLessons,
        int TotalEligibleLessons,
        double OverallProgressPercent,
        string StatusMessage
    );
}
