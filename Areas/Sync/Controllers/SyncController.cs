using System.Security.Claims;
using Microlearning.Areas.Sync.DTOs;
using Microlearning.Areas.Sync.Interfaces;
using Microlearning.Exceptions;
using Microlearning.Model.Entities.Enums;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;

namespace Microlearning.Areas.Sync.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    [EnableRateLimiting("SyncPolicy")]
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

        /// <summary>
        /// API Kéo danh sách thay đổi vi sai (Delta Sync Pull) từ Server về thiết bị Mobile.
        /// </summary>
        /// <param name="afterSequence">Mốc Sequence cuối cùng mà điện thoại đang lưu (Mặc định = 0)</param>
        /// <param name="limit">Số lượng thay đổi tối đa muốn lấy (Mặc định = 50)</param>
        [HttpGet("pull")]
        [Authorize] // Bắt buộc đăng nhập để đảm bảo an toàn dữ liệu
        public async Task<IActionResult> PullSync(
            [FromQuery] long afterSequence = 0,
            [FromQuery] int limit = 50)
        {
            var request = new SyncPullRequest
            {
                AfterSequence = afterSequence,
                Limit = limit
            };

            var response = await _syncService.PullSyncChangesAsync(request);
            return Ok(response);
        }


        /// <summary>
        /// API Gỡ bỏ nội dung và kích hoạt cơ chế Tombstone cho Offline Sync (Dành cho Admin & Teacher).
        /// </summary>
        [HttpPost("tombstone")]
        [Authorize(Roles = "Admin,Teacher")]
        public async Task<IActionResult> CreateTombstone(
            [FromBody] TombstoneRequest request,
            [FromServices] ITombstoneService tombstoneService)
        {
            var response = await tombstoneService.CreateTombstoneAsync(request);
            return Ok(response);
        }
    }
}