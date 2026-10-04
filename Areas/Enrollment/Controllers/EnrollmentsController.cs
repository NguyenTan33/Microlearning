using System.Security.Claims;
using Microlearning.Areas.Enrollment.DTOs;
using Microlearning.Areas.Enrollment.Interfaces;
using Microlearning.Exceptions;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Microlearning.Areas.Enrollment.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    [Authorize]
    public class EnrollmentsController : ControllerBase
    {
        private readonly IEnrollmentService _enrollmentService;

        public EnrollmentsController(IEnrollmentService enrollmentService)
        {
            _enrollmentService = enrollmentService;
        }

        /// <summary>
        /// Ghi danh tham gia một khóa học
        /// </summary>
        [HttpPost("course/{courseId}")]
        public async Task<IActionResult> EnrollCourse(int courseId)
        {
            var accountId = User.FindFirstValue(ClaimTypes.NameIdentifier);
            if (string.IsNullOrWhiteSpace(accountId))
            {
                throw new BusinessException("Không xác định được danh tính tài khoản từ Token.");
            }

            var result = await _enrollmentService.EnrollCourseAsync(accountId, courseId);
            return Ok(result);
        }

        /// <summary>
        /// Lấy danh sách các khóa học mà tài khoản hiện tại đang tham gia
        /// </summary>
        [HttpGet("my-courses")]
        public async Task<IActionResult> GetMyEnrollments()
        {
            var accountId = User.FindFirstValue(ClaimTypes.NameIdentifier);
            if (string.IsNullOrWhiteSpace(accountId))
            {
                throw new BusinessException("Không xác định được danh tính tài khoản từ Token.");
            }

            var result = await _enrollmentService.GetMyEnrollmentsAsync(accountId);
            return Ok(result);
        }
    }
}
