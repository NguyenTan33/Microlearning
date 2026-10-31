using System.ComponentModel.DataAnnotations.Schema;

namespace Microlearning.Model.Entities
{
    public class Lesson
    {
        public int Id { get; set; }

        public int SubjectId { get; set; }

        public string Title { get; set; } = string.Empty;

        public string? Description { get; set; }

        public int DurationSeconds { get; set; } = 0;

        public int SortOrder { get; set; } = 0;

        public int Version { get; set; } = 1;

        public bool IsPublished { get; set; } = false;

        public string? SlideUrl { get; set; }

        public string? SlideType { get; set; } // 'canva' | 'ppt' | 'pptx'

        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

        public DateTime? UpdatedAt { get; set; }

        public virtual Subject? Subject { get; set; }

        public virtual ICollection<Quiz> Quizzes { get; set; } = new List<Quiz>();

        // Thuộc tính tương thích ngược (NotMapped) để các đoạn code cũ gọi lesson.Quiz không bị vỡ
        [NotMapped]
        public virtual Quiz? Quiz
        {
            get => Quizzes?.FirstOrDefault();
            set
            {
                if (value != null && !Quizzes.Contains(value))
                {
                    Quizzes.Add(value);
                }
            }
        }

        public virtual ICollection<MediaAsset> MediaAssets { get; set; } = new List<MediaAsset>();

        public virtual ICollection<LessonProgress> LessonProgresses { get; set; } = new List<LessonProgress>();

        public virtual ICollection<LessonAttachment> Attachments { get; set; } = new List<LessonAttachment>();

        public virtual ICollection<UserQuizMistake> QuizMistakes { get; set; } = new List<UserQuizMistake>();
    }
}
