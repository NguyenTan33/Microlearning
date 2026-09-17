using Microlearning.Model.Entities.Enums;

namespace Microlearning.Model.Entities
{
    public class Enrollment
    {
        public int Id { get; set; }

        public string AccountId { get; set; } = string.Empty;

        public int CourseId { get; set; }

        public EnrollmentStatus Status { get; set; } = EnrollmentStatus.Active;

        public DateTime EnrolledAt { get; set; } = DateTime.UtcNow;

        public virtual Account? Account { get; set; }

        public virtual Course? Course { get; set; }
    }
}
