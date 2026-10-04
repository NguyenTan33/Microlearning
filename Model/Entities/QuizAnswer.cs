namespace Microlearning.Model.Entities
{
    public class QuizAnswer
    {
        public int Id { get; set; }

        public int QuizAttemptId { get; set; }

        public int QuestionId { get; set; }

        public bool IsCorrect { get; set; } = false;

        public decimal EarnedScore { get; set; } = 0;

        public virtual QuizAttempt? QuizAttempt { get; set; }

        public virtual Question? Question { get; set; }

        public virtual ICollection<QuizAnswerOption> SelectedOptions { get; set; } = new List<QuizAnswerOption>();
    }
}
