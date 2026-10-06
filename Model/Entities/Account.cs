using Microsoft.AspNetCore.Identity;

namespace Microlearning.Model.Entities
{
    public class Account : IdentityUser
    {
        public string FullName { get; set; } = string.Empty;

        public int? BranchId { get; set; }

        public bool IsActive { get; set; } = true;

        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

        public virtual ICollection<RefreshToken> RefreshTokens { get; set; } = new List<RefreshToken>();

        public virtual ICollection<Enrollment> Enrollments { get; set; } = new List<Enrollment>();

        public virtual ICollection<LessonProgress> LessonProgresses { get; set; } = new List<LessonProgress>();

        public virtual ICollection<QuizAttempt> QuizAttempts { get; set; } = new List<QuizAttempt>();

        public virtual ICollection<Device> Devices { get; set; } = new List<Device>();

        public virtual ICollection<SyncOperation> SyncOperations { get; set; } = new List<SyncOperation>();

        public virtual ICollection<UserCourseAccess> CourseAccesses { get; set; } = new List<UserCourseAccess>();

        public virtual UserStreak? Streak { get; set; }

        public virtual ICollection<UserQuizMistake> QuizMistakes { get; set; } = new List<UserQuizMistake>();

        public virtual ICollection<UserFavoriteSubject> FavoriteSubjects { get; set; } = new List<UserFavoriteSubject>();
    }
}
