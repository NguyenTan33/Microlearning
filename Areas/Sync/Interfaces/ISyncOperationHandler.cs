namespace Microlearning.Areas.Sync.Interfaces
{
    /// <summary>
    /// Giao diện xử lý một loại thao tác đồng bộ cụ thể (Single Responsibility & Open-Closed).
    /// Khi cần thêm một loại thao tác mới (ví dụ NOTE, BOOKMARK), chỉ cần viết 1 Handler mới mà không sửa code cũ.
    /// </summary>
    public interface ISyncOperationHandler
    {
        /// <summary>
        /// Loại thao tác mà Handler này chịu trách nhiệm (ví dụ: "LESSON_PROGRESS", "QUIZ_ATTEMPT").
        /// </summary>
        string OperationType { get; }

        /// <summary>
        /// Thực thi xử lý payload của thao tác.
        /// </summary>
        Task<string?> HandleAsync(string accountId, string deviceId, string payloadJson, CancellationToken cancellationToken = default);
    }
}