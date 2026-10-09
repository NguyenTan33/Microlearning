using System.ComponentModel.DataAnnotations;

namespace Microlearning.Areas.AI.DTOs
{
    public class AskAiRequest
    {
        [Required(ErrorMessage = "Câu hỏi không được để trống")]
        public string Question { get; set; } = string.Empty;

        /// <summary>
        /// ID bài học thực tế từ SQL (dùng để AI lấy ngữ cảnh bài giảng chính xác)
        /// </summary>
        public int? LessonId { get; set; }

        /// <summary>
        /// ID môn học (tùy chọn, dùng để lấy thêm context)
        /// </summary>
        public int? SubjectId { get; set; }

        /// <summary>
        /// ID khóa học thực tế từ SQL (dùng để AI liệt kê cấu trúc môn học)
        /// </summary>
        public int? CourseId { get; set; }

        /// <summary>
        /// Ngữ cảnh bổ sung từ Notebook Sources (tài liệu đã nạp vào sổ tay)
        /// </summary>
        public string? CustomContext { get; set; }

        /// <summary>
        /// Lịch sử hội thoại để AI duy trì ngữ cảnh cuộc trò chuyện
        /// </summary>
        public List<ChatHistoryItem>? History { get; set; }
    }

    public class ChatHistoryItem
    {
        public string Role { get; set; } = "user"; // "user" hoặc "model"
        public string Text { get; set; } = string.Empty;
    }

    public class AskAiResponse
    {
        public bool Success { get; set; } = true;
        public string Answer { get; set; } = string.Empty;
        public string? SourceReference { get; set; }
        public DateTime AnsweredAt { get; set; } = DateTime.UtcNow;
        public List<string> SuggestedFollowUps { get; set; } = new();
        public string? ModelUsed { get; set; }
    }
}
