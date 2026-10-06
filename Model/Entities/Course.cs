namespace Microlearning.Model.Entities
{
    public class Course
    {
        public int Id { get; set; }

        public string Title { get; set; } = string.Empty;

        public string? Description { get; set; }

        public string? ThumbnailUrl { get; set; }

        public int Version { get; set; } = 1;

        public bool IsPublished { get; set; } = false;

        public bool IsPrivate { get; set; } = false;

        public string? AccessPasswordHash { get; set; }

        public int PasswordVersion { get; set; } = 1;

        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

        public DateTime? UpdatedAt { get; set; }

        public virtual ICollection<Subject> Subjects { get; set; } = new List<Subject>();

        public virtual ICollection<Enrollment> Enrollments { get; set; } = new List<Enrollment>();

        public virtual ICollection<UserCourseAccess> UserCourseAccesses { get; set; } = new List<UserCourseAccess>();
    }
}
