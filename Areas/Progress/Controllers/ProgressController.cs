using System.Security.Claims;
using Microlearning.Areas.Progress.DTOs;
using Microlearning.Areas.Progress.Interfaces;
using Microlearning.Exceptions;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Microlearning.Areas.Progress.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    [Authorize]
    public class ProgressController : ControllerBase
    {
        private readonly IProgressService _progressService;
        private readonly IVideoProgressService _videoProgressService;

        public ProgressController(
            IProgressService progressService,
            IVideoProgressService videoProgressService)
        {
            _progressService = progressService;
            _videoProgressService = videoProgressService;
        }

        /// <summary>
        /// Ghi nhận tiến độ xem kèm thuật toán Interval Union chống gian lận tua (> 30% tua bỏ)
        /// </summary>
        [HttpPost("video-coverage")]
        public async Task<IActionResult> RecordVideoCoverage([FromBody] RecordVideoCoverageRequest request, CancellationToken cancellationToken)
        {
            var accountId = User.FindFirstValue(ClaimTypes.NameIdentifier);
            if (string.IsNullOrWhiteSpace(accountId))
            {
                throw new BusinessException("Không xác định được danh tính tài khoản từ Token.");
            }

            var result = await _videoProgressService.RecordProgressWithCoverageAsync(accountId, request, cancellationToken);
            return Ok(result);
        }

        /// <summary>
        /// Lấy chi tiết thông tin chống gian lận & dải xem của bài học
        /// </summary>
        [HttpGet("lesson/{lessonId}/coverage")]
        public async Task<IActionResult> GetCoverageProgress(int lessonId, CancellationToken cancellationToken)
        {
            var accountId = User.FindFirstValue(ClaimTypes.NameIdentifier);
            if (string.IsNullOrWhiteSpace(accountId))
            {
                throw new BusinessException("Không xác định được danh tính tài khoản từ Token.");
            }

            var result = await _videoProgressService.GetCoverageProgressAsync(accountId, lessonId, cancellationToken);
            return Ok(result);
        }

        /// <summary>
        /// Ghi nhận sự kiện xem video (Áp dụng thuật toán Monotonic Math.Max chống tụt tiến độ)
        /// </summary>
        [HttpPost("events")]
        public async Task<IActionResult> SaveProgress([FromBody] SaveProgressRequest request)
        {
            var accountId = User.FindFirstValue(ClaimTypes.NameIdentifier);
            if (string.IsNullOrWhiteSpace(accountId))
            {
                throw new BusinessException("Không xác định được danh tính tài khoản từ Token.");
            }

            var result = await _progressService.SaveProgressAsync(accountId, request);
            return Ok(result);
        }

        /// <summary>
        /// Lấy chi tiết tiến độ xem của một bài học
        /// </summary>
        [HttpGet("lesson/{lessonId}")]
        public async Task<IActionResult> GetLessonProgress(int lessonId)
        {
            var accountId = User.FindFirstValue(ClaimTypes.NameIdentifier);
            if (string.IsNullOrWhiteSpace(accountId))
            {
                throw new BusinessException("Không xác định được danh tính tài khoản từ Token.");
            }

            var progress = await _progressService.GetLessonProgressAsync(accountId, lessonId);
            if (progress == null)
            {
                return Ok(new 
                { 
                    lessonId = lessonId, 
                    watchedSeconds = 0, 
                    percent = 0, 
                    isCompleted = false, 
                    message = "Chưa có tiến độ học tập cho bài này." 
                });
            }

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
                throw new BusinessException("Không xác định được danh tính tài khoản từ Token.");
            }

            var result = await _progressService.GetCourseProgressAsync(accountId, courseId);
            return Ok(result);
        }
    }
}
