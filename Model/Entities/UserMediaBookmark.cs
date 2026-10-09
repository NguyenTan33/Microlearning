namespace Microlearning.Model.Entities
{
    public class UserMediaBookmark
    {
        public string Id { get; set; } = string.Empty;

        public string AccountId { get; set; } = string.Empty;

        public int LessonId { get; set; }

        public int? MediaId { get; set; }

        public int CourseId { get; set; }

        public string CourseTitle { get; set; } = string.Empty;

        public string LessonTitle { get; set; } = string.Empty;

        public double Timestamp { get; set; }

        public string FormattedTime { get; set; } = string.Empty;

        public string Title { get; set; } = string.Empty;

        public string? Note { get; set; }

        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

        public virtual Account? Account { get; set; }

        public virtual Lesson? Lesson { get; set; }
    }
}
