namespace Microlearning.Model.Entities
{
    public class UserStreak
    {
        public string AccountId { get; set; } = string.Empty;

        public int CurrentStreak { get; set; } = 0;

        public int LongestStreak { get; set; } = 0;

        public DateOnly? LastActiveDate { get; set; }

        public bool HasMasterCrown { get; set; } = false;

        public DateTime? CrownAwardedAt { get; set; }

        public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

        public virtual Account? Account { get; set; }
    }
}
