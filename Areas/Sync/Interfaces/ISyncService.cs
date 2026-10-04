using Microlearning.Areas.Sync.DTOs;

namespace Microlearning.Areas.Sync.Interfaces
{
    public interface ISyncService
    {
        /// <summary>
        /// Tiếp nhận và xử lý hàng loạt thao tác đồng bộ từ Mobile (Batch Sync Push).
        /// Hỗ trợ Deduplication chống trùng lặp và Transaction Rollback khi có sự cố.
        /// </summary>
        Task<SyncPushResponse> PushSyncOperationsAsync(
            string accountId,
            SyncPushRequest request,
            CancellationToken cancellationToken = default);
    }
}