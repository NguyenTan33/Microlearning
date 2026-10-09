using System.Security.Claims;
using Microlearning.Areas.Catalog.DTOs;
using Microlearning.Areas.Catalog.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Microlearning.Areas.Catalog.Controllers
{
    [ApiController]
    [Route("api/courses/{courseId:int}/access")]
    public class CourseAccessController : ControllerBase
    {
        private readonly ICourseAccessService _courseAccessService;

        public CourseAccessController(ICourseAccessService courseAccessService)
        {
            _courseAccessService = courseAccessService;
        }

        /// <summary>
        /// Kiểm tra quyền truy cập vào khóa học (Hỗ trợ cả Public và Private)
        /// </summary>
        [HttpGet("check")]
        [AllowAnonymous]
        public async Task<IActionResult> CheckAccess(int courseId, CancellationToken cancellationToken)
        {
            var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
            var status = await _courseAccessService.CheckAccessAsync(userId, courseId, cancellationToken);
            return Ok(status);
        }

        /// <summary>
        /// Mở khóa học Private bằng mật khẩu
        /// </summary>
        [HttpPost("unlock")]
        [Authorize]
        public async Task<IActionResult> UnlockCourse(int courseId, [FromBody] UnlockCourseRequest request, CancellationToken cancellationToken)
        {
            var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
            if (string.IsNullOrEmpty(userId))
            {
                return Unauthorized();
            }

            var success = await _courseAccessService.UnlockCourseWithPasswordAsync(userId, courseId, request.Password, cancellationToken);
            if (!success)
            {
                return BadRequest(new { message = "Mật khẩu khóa học không chính xác." });
            }

            return Ok(new { message = "Mở khóa thành công." });
        }

        /// <summary>
        /// Cấu hình quyền riêng tư và mật khẩu cho khóa học (Giảng viên / Admin)
        /// </summary>
        [HttpPost("privacy")]
        [Authorize(Roles = "Admin,Teacher")]
        public async Task<IActionResult> SetPrivacy(int courseId, [FromBody] SetCoursePrivacyRequest request, CancellationToken cancellationToken)
        {
            var success = await _courseAccessService.SetCoursePrivacyAsync(courseId, request, cancellationToken);
            return Ok(new { message = "Cập nhật quyền riêng tư thành công.", success });
        }
    }
}
