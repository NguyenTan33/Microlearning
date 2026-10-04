namespace Microlearning.Areas.Sync.DTOs
{
    // DTO giải mã dữ liệu tiến độ bài học
    public record LessonProgressPayload
    {
        public int LessonId { get; init; }
        public int WatchedSeconds { get; init; }
        public decimal Percent { get; init; }
    }

    // DTO câu trả lời cho từng câu hỏi Quiz
    public record QuizAnswerItem
    {
        public int QuestionId { get; init; }
        public int SelectedOptionId { get; init; }
    }

    // DTO giải mã dữ liệu nộp bài Quiz offline
    public record QuizAttemptPayload
    {
        public Guid ClientAttemptId { get; init; }
        public int QuizId { get; init; }
        public List<QuizAnswerItem> Answers { get; init; } = new();
        public DateTime StartedAt { get; init; } = DateTime.UtcNow;
        public DateTime SubmittedAt { get; init; } = DateTime.UtcNow;
    }
}