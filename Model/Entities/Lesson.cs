namespace Microlearning.Model.Entities
{
    public class Lesson
    {
        public int Id { get; set; }

        public int SubjectId { get; set; }

        public string Title { get; set; } = string.Empty;

        public string? Description { get; set; }

        public int DurationSeconds { get; set; } = 0;

        public int SortOrder { get; set; } = 0;

        public int Version { get; set; } = 1;

        public bool IsPublished { get; set; } = false;

        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

        public DateTime? UpdatedAt { get; set; }

        public virtual Subject? Subject { get; set; }

        public virtual Quiz? Quiz { get; set; }

        public virtual ICollection<MediaAsset> MediaAssets { get; set; } = new List<MediaAsset>();

        public virtual ICollection<LessonProgress> LessonProgresses { get; set; } = new List<LessonProgress>();
    }
}
