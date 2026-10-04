using Microlearning.Areas.Sync.DTOs;

namespace Microlearning.Areas.Sync.Interfaces
{
    public interface ISyncService
    {
        Task<SyncPushResponse> PushSyncOperationsAsync(
            string accountId,
            SyncPushRequest request,
            CancellationToken cancellationToken = default);

        /// <summary>
        /// Kéo danh sách thay đổi vi sai từ máy chủ về thiết bị dựa trên mốc Sequence (Delta Sync Pull).
        /// </summary>
        Task<SyncPullResponse> PullSyncChangesAsync(
            SyncPullRequest request,
            CancellationToken cancellationToken = default);
    }
}