namespace Microlearning.Areas.Sync.DTOs
{
    // DTO nhận tham số query từ Client
    public record SyncPullRequest
    {
        public long AfterSequence { get; init; } = 0;
        public int Limit { get; init; } = 50;
    }

    // DTO của một bản ghi thay đổi vi sai
    public record ContentChangeItemDto
    {
        public long Sequence { get; init; }
        public string EntityType { get; init; } = string.Empty;
        public int EntityId { get; init; }
        public string ChangeType { get; init; } = string.Empty;
        public int Version { get; init; }
        public DateTime ChangedAt { get; init; }
        public object? Payload { get; init; } // Chứa dữ liệu chi tiết nếu cần
    }

    // DTO trả về cho Mobile kèm mốc Checkpoint mới
    public record SyncPullResponse
    {
        public long CurrentCheckpointSequence { get; init; }
        public long NewCheckpointSequence { get; init; }
        public bool HasMoreChanges { get; init; }
        public List<ContentChangeItemDto> Changes { get; init; } = new();
    }
}