namespace Microlearning.Areas.Sync.DTOs
{
    // DTO yêu cầu gỡ/xóa bài học hoặc khóa học
    public record TombstoneRequest
    {
        public string EntityType { get; init; } = string.Empty; // "Course", "Lesson", "Subject", "Quiz"
        public int EntityId { get; init; }
        public string? Reason { get; init; } // Lý do gỡ bỏ
    }

    // DTO kết quả sau khi tạo Tombstone
    public record TombstoneResponse
    {
        public long Sequence { get; init; }
        public string EntityType { get; init; } = string.Empty;
        public int EntityId { get; init; }
        public string ChangeType { get; init; } = "Deleted";
        public int Version { get; init; }
        public DateTime TombstonedAt { get; init; }
        public string Message { get; init; } = string.Empty;
    }
}