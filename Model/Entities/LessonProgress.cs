namespace Microlearning.Model.Entities
{
    public class LessonProgress
    {
        public int Id { get; set; }

        public string AccountId { get; set; } = string.Empty;

        public int LessonId { get; set; }

        public int WatchedSeconds { get; set; } = 0;

        public decimal Percent { get; set; } = 0;

        public bool IsCompleted { get; set; } = false;

        public DateTime? CompletedAt { get; set; }

        public DateTime LastPlayedAt { get; set; } = DateTime.UtcNow;

        public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

        public virtual Account? Account { get; set; }

        public virtual Lesson? Lesson { get; set; }
    }
}
