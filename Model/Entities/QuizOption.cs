namespace Microlearning.Model.Entities
{
    public class QuizOption
    {
        public int Id { get; set; }

        public int QuestionId { get; set; }

        public string OptionText { get; set; } = string.Empty;

        public bool IsCorrect { get; set; } = false;

        public int SortOrder { get; set; } = 0;

        public virtual Question? Question { get; set; }

        public virtual ICollection<QuizAnswerOption> QuizAnswerOptions { get; set; } = new List<QuizAnswerOption>();
    }
}
