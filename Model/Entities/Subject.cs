namespace Microlearning.Model.Entities
{
    public class Subject
    {
        public int Id { get; set; }

        public int CourseId { get; set; }

        public string Title { get; set; } = string.Empty;

        public string? Description { get; set; }

        public int SortOrder { get; set; } = 0;

        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

        public DateTime? UpdatedAt { get; set; }

        public virtual Course? Course { get; set; }

        public virtual ICollection<Lesson> Lessons { get; set; } = new List<Lesson>();

        public virtual ICollection<UserFavoriteSubject> UserFavoriteSubjects { get; set; } = new List<UserFavoriteSubject>();
    }
}
