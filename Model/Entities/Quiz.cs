namespace Microlearning.Model.Entities
{
    public class Quiz
    {
        public int Id { get; set; }

        public int LessonId { get; set; }

        public string Title { get; set; } = string.Empty;

        public int PassScore { get; set; } = 80;

        public int Version { get; set; } = 1;

        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

        public DateTime? UpdatedAt { get; set; }

        public virtual Lesson? Lesson { get; set; }

        public virtual ICollection<Question> Questions { get; set; } = new List<Question>();

        public virtual ICollection<QuizAttempt> QuizAttempts { get; set; } = new List<QuizAttempt>();
    }
}
