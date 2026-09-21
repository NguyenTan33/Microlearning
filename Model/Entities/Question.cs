using Microlearning.Model.Entities.Enums;

namespace Microlearning.Model.Entities
{
    public class Question
    {
        public int Id { get; set; }

        public int QuizId { get; set; }

        public string Content { get; set; } = string.Empty;

        public string? Explanation { get; set; }

        public QuestionType QuestionType { get; set; } = QuestionType.SingleChoice;

        public int SortOrder { get; set; } = 0;

        public int Points { get; set; } = 1;

        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

        public DateTime? UpdatedAt { get; set; }

        public virtual Quiz? Quiz { get; set; }

        public virtual ICollection<QuizOption> QuizOptions { get; set; } = new List<QuizOption>();

        public virtual ICollection<QuizAnswer> QuizAnswers { get; set; } = new List<QuizAnswer>();
    }
}
