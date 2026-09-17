namespace Microlearning.Model.Entities
{
    public class QuizAttempt
    {
        public int Id { get; set; }

        public Guid ClientAttemptId { get; set; }

        public string AccountId { get; set; } = string.Empty;

        public int QuizId { get; set; }

        public int QuizVersion { get; set; } = 1;

        public decimal Score { get; set; } = 0;

        public bool IsPassed { get; set; } = false;

        public DateTime StartedAt { get; set; }

        public DateTime SubmittedAt { get; set; }

        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

        public virtual Account? Account { get; set; }

        public virtual Quiz? Quiz { get; set; }

        public virtual ICollection<QuizAnswer> QuizAnswers { get; set; } = new List<QuizAnswer>();
    }
}
