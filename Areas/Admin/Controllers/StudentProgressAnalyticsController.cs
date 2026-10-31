using Microlearning.Areas.Admin.DTOs;
using Microlearning.Areas.Admin.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Microlearning.Areas.Admin.Controllers
{
    [ApiController]
    [Route("api/admin/courses/{courseId:int}/analytics")]
    [Authorize(Roles = "Admin,Teacher")]
    public class StudentProgressAnalyticsController : ControllerBase
    {
        private readonly IStudentProgressAnalyticsService _analyticsService;

        public StudentProgressAnalyticsController(IStudentProgressAnalyticsService analyticsService)
        {
            _analyticsService = analyticsService;
        }

        /// <summary>
        /// Lấy số liệu thống kê tổng quan tiến độ học viên của khóa học (video + bài tập)
        /// </summary>
        [HttpGet("overview")]
        public async Task<IActionResult> GetCourseOverview(int courseId, CancellationToken cancellationToken)
        {
            var overview = await _analyticsService.GetCourseMetricsOverviewAsync(courseId, cancellationToken);
            return Ok(overview);
        }

        /// <summary>
        /// Lấy bảng danh sách chi tiết tiến độ (% xem video và tiến độ làm bài tập) của từng học viên trong khóa học
        /// </summary>
        [HttpGet("students-progress")]
        public async Task<IActionResult> GetStudentsProgress(
            int courseId,
            [FromQuery] StudentProgressFilterDto filter,
            CancellationToken cancellationToken)
        {
            var result = await _analyticsService.GetCourseStudentsProgressAsync(courseId, filter, cancellationToken);
            return Ok(result);
        }

        /// <summary>
        /// Lấy chi tiết tiến độ từng bài học (video + quiz) của một sinh viên cụ thể trong khóa học
        /// </summary>
        [HttpGet("students/{studentId}/detail")]
        public async Task<IActionResult> GetStudentCourseDetail(
            int courseId,
            string studentId,
            CancellationToken cancellationToken)
        {
            var result = await _analyticsService.GetStudentCourseDetailAsync(courseId, studentId, cancellationToken);
            return Ok(result);
        }
    }
}
