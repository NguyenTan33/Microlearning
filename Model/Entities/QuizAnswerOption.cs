namespace Microlearning.Model.Entities
{
    public class QuizAnswerOption
    {
        public int Id { get; set; }

        public int QuizAnswerId { get; set; }

        public int QuizOptionId { get; set; }

        public virtual QuizAnswer? QuizAnswer { get; set; }

        public virtual QuizOption? QuizOption { get; set; }
    }
}
