using Microlearning.Model.Entities;
using Microlearning.Model.Entities.Enums;

namespace Microlearning.Areas.Sync.Interfaces
{
    public interface IContentChangeTracker
    {
        /// <summary>
        /// Ghi nhận một biến động nội dung vào bảng ContentChanges phục vụ Delta Sync.
        /// </summary>
        /// <param name="entityType">Loại đối tượng (ví dụ: "Course", "Subject", "Lesson", "Quiz")</param>
        /// <param name="entityId">ID của đối tượng</param>
        /// <param name="changeType">Hành động: Created (1), Updated (2), Deleted (3)</param>
        /// <param name="version">Phiên bản dữ liệu của đối tượng sau khi thay đổi</param>
        /// <param name="cancellationToken">Token hủy tác vụ</param>
        /// <returns>Bản ghi ContentChange vừa được lưu (chứa Sequence tự tăng)</returns>
        Task<ContentChange> LogChangeAsync(
            string entityType,
            int entityId,
            ContentChangeType changeType,
            int version,
            CancellationToken cancellationToken = default);
    }
}