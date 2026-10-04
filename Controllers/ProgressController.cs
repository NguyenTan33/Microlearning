using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microlearning.DTOs;
using Microlearning.Service.Interfaces;

namespace Microlearning.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    [Authorize]
    public class ProgressController : ControllerBase
    {
        private readonly IProgressService _progressService;

        public ProgressController(IProgressService progressService)
        {
            _progressService = progressService;
        }

        /// <summary>
        /// Lưu hoặc cập nhật tiến độ xem video (áp dụng thuật toán Monotonic Math.Max)
        /// </summary>
        [HttpPost("events")]
        public async Task<IActionResult> SaveProgress([FromBody] SaveProgressDTO dto)
        {
            var accountId = User.FindFirstValue(ClaimTypes.NameIdentifier);
            if (string.IsNullOrWhiteSpace(accountId))
            {
                return Unauthorized(new { message = "Không xác định được danh tính tài khoản từ Token." });
            }

            await _progressService.SaveProgress(accountId, dto);
            return Ok(new { message = "Lưu tiến độ bài học thành công." });
        }

        /// <summary>
        /// Lấy chi tiết tiến độ xem của một bài học (số giây đang xem dở, %)
        /// </summary>
        [HttpGet("lesson/{lessonId}")]
        public async Task<IActionResult> GetLessonProgress(int lessonId)
        {
            var accountId = User.FindFirstValue(ClaimTypes.NameIdentifier);
            if (string.IsNullOrWhiteSpace(accountId))
            {
                return Unauthorized(new { message = "Không xác định được danh tính tài khoản từ Token." });
            }

            var progress = await _progressService.GetLessonProgress(accountId, lessonId);
            return Ok(progress);
        }

        /// <summary>
        /// Tính tổng % tiến độ hoàn thành của cả khóa học
        /// </summary>
        [HttpGet("course/{courseId}")]
        public async Task<IActionResult> GetCourseProgress(int courseId)
        {
            var accountId = User.FindFirstValue(ClaimTypes.NameIdentifier);
            if (string.IsNullOrWhiteSpace(accountId))
            {
                return Unauthorized(new { message = "Không xác định được danh tính tài khoản từ Token." });
            }

            var overallPercent = await _progressService.GetCourseProgress(accountId, courseId);
            return Ok(new 
            { 
                courseId = courseId, 
                overallPercent = overallPercent 
            });
        }
    }
}
