using System.Security.Claims;
using Microlearning.Areas.Sync.DTOs;
using Microlearning.Areas.Sync.Interfaces;
using Microlearning.Exceptions;
using Microlearning.Model.Entities.Enums;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Microlearning.Areas.Sync.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class SyncController : ControllerBase
    {
        private readonly IContentChangeTracker _changeTracker;
        private readonly ISyncService _syncService;

        public SyncController(
            IContentChangeTracker changeTracker,
            ISyncService syncService)
        {
            _changeTracker = changeTracker;
            _syncService = syncService;
        }

        /// <summary>
        /// API Tiếp nhận mảng thao tác học Offline từ Mobile (Batch Sync Push).
        /// </summary>
        [HttpPost("push")]
        [Authorize] // Bắt buộc đăng nhập để xác định AccountId an toàn từ JWT
        public async Task<IActionResult> PushSync([FromBody] SyncPushRequest request)
        {
            var accountId = User.FindFirstValue(ClaimTypes.NameIdentifier);
            if (string.IsNullOrEmpty(accountId))
            {
                throw new BusinessException("Không xác định được danh tính người dùng từ Token.");
            }

            var response = await _syncService.PushSyncOperationsAsync(accountId, request);
            return Ok(response);
        }

        /// <summary>
        /// Endpoint kiểm thử ghi log thay đổi nội dung (Dành cho Developer/Admin)
        /// </summary>
        [HttpPost("test-log-change")]
        public async Task<IActionResult> TestLogChange(
            [FromQuery] string entityType,
            [FromQuery] int entityId,
            [FromQuery] ContentChangeType changeType,
            [FromQuery] int version)
        {
            var result = await _changeTracker.LogChangeAsync(entityType, entityId, changeType, version);

            return Ok(new
            {
                message = "Ghi log ContentChange thành công!",
                sequence = result.Sequence,
                entityType = result.EntityType,
                entityId = result.EntityId,
                changeType = result.ChangeType.ToString(),
                version = result.Version,
                changedAt = result.ChangedAt
            });
        }
    }
}