namespace Microlearning.Model.Entities
{
    public class UserQuizMistake
    {
        public long Id { get; set; }

        public string AccountId { get; set; } = string.Empty;

        public int QuestionId { get; set; }

        public int QuizId { get; set; }

        public int LessonId { get; set; }

        public int SelectedOptionId { get; set; }

        public int FailedCount { get; set; } = 1;

        public bool IsResolved { get; set; } = false;

        public DateTime LastFailedAt { get; set; } = DateTime.UtcNow;

        public DateTime? ResolvedAt { get; set; }

        public virtual Account? Account { get; set; }

        public virtual Question? Question { get; set; }

        public virtual Quiz? Quiz { get; set; }

        public virtual Lesson? Lesson { get; set; }
    }
}
