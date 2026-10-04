using Microlearning.Areas.Sync.Interfaces;
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

        public SyncController(IContentChangeTracker changeTracker)
        {
            _changeTracker = changeTracker;
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