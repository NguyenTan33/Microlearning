namespace Microlearning.Areas.Sync.DTOs
{
    /// <summary>
    /// Một phần tử thao tác được gửi lên từ hàng đợi Outbox của Mobile.
    /// </summary>
    public record SyncOperationItem
    {
        public Guid ClientOperationId { get; init; }
        public string OperationType { get; init; } = string.Empty;
        public string PayloadJson { get; init; } = string.Empty;
        public DateTime CreatedAt { get; init; } = DateTime.UtcNow;
    }

    /// <summary>
    /// Gói tin Batch gửi lên Server khi thiết bị có mạng trở lại.
    /// </summary>
    public record SyncPushRequest
    {
        public string DeviceId { get; init; } = string.Empty;
        public List<SyncOperationItem> Operations { get; init; } = new();
    }

    /// <summary>
    /// Kết quả xử lý của từng phần tử thao tác.
    /// </summary>
    public record SyncOperationResult
    {
        public Guid ClientOperationId { get; init; }
        public bool Success { get; init; }
        public string? Message { get; init; }
    }

    /// <summary>
    /// Kết quả trả về cho Mobile sau khi Server tiếp nhận xử lý xong Batch.
    /// </summary>
    public record SyncPushResponse
    {
        public List<Guid> AcceptedOperationIds { get; init; } = new();
        public List<SyncOperationResult> Results { get; init; } = new();
        public DateTime ProcessedAt { get; init; } = DateTime.UtcNow;
    }
}