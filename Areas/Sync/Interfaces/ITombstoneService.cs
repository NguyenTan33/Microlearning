using Microlearning.Areas.Sync.DTOs;

namespace Microlearning.Areas.Sync.Interfaces
{
    public interface ITombstoneService
    {
        /// <summary>
        /// Gỡ xuất bản đối tượng và tạo bản ghi Tombstone trong ContentChanges để Client tự xóa file offline.
        /// </summary>
        Task<TombstoneResponse> CreateTombstoneAsync(TombstoneRequest request, CancellationToken cancellationToken = default);
    }
}