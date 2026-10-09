namespace Microlearning.Model.Entities
{
    public class UserCourseAccess
    {
        public string AccountId { get; set; } = string.Empty;

        public int CourseId { get; set; }

        public int UnlockedPasswordVersion { get; set; } = 1;

        public DateTime UnlockedAt { get; set; } = DateTime.UtcNow;

        public virtual Account? Account { get; set; }

        public virtual Course? Course { get; set; }
    }
}
