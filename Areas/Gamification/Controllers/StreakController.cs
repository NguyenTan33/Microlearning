using System.Security.Claims;
using Microlearning.Areas.Gamification.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Microlearning.Areas.Gamification.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    [Authorize]
    public class StreakController : ControllerBase
    {
        private readonly IUserStreakService _streakService;

        public StreakController(IUserStreakService streakService)
        {
            _streakService = streakService;
        }

        /// <summary>
        /// Lấy chuỗi streak học tập hàng ngày và trạng thái Vương Miện Danh Dự
        /// </summary>
        [HttpGet("my-streak")]
        public async Task<IActionResult> GetMyStreak(CancellationToken cancellationToken)
        {
            var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
            if (string.IsNullOrEmpty(userId))
            {
                return Unauthorized();
            }

            var streak = await _streakService.GetUserStreakAsync(userId, cancellationToken);
            return Ok(streak);
        }

        /// <summary>
        /// Ghi nhận điểm danh học tập hàng ngày
        /// </summary>
        [HttpPost("ping")]
        public async Task<IActionResult> RecordActivity(CancellationToken cancellationToken)
        {
            var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
            if (string.IsNullOrEmpty(userId))
            {
                return Unauthorized();
            }

            var streak = await _streakService.RecordDailyLearningAsync(userId, cancellationToken);
            return Ok(streak);
        }
    }
}
