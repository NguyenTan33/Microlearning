using System.ComponentModel.DataAnnotations;

namespace Microlearning.Areas.AI.DTOs
{
    public class AskAiRequest
    {
        [Required(ErrorMessage = "Câu hỏi không được để trống")]
        public string Question { get; set; } = string.Empty;

        /// <summary>
        /// ID bài học cần hỏi đáp (nếu có để AI lấy ngữ cảnh bài giảng)
        /// </summary>
        public int? LessonId { get; set; }

        /// <summary>
        /// ID khóa học (nếu có để AI lấy danh mục môn học)
        /// </summary>
        public int? CourseId { get; set; }

        /// <summary>
        /// Ngữ cảnh tài liệu hoặc văn bản bổ sung từ ứng dụng bên ngoài
        /// </summary>
        public string? CustomContext { get; set; }
    }

    public class AskAiResponse
    {
        public bool Success { get; set; } = true;
        public string Answer { get; set; } = string.Empty;
        public string? SourceReference { get; set; }
        public DateTime AnsweredAt { get; set; } = DateTime.UtcNow;
        public List<string> SuggestedFollowUps { get; set; } = new();
    }
}
