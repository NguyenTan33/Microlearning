using Microlearning.Areas.Catalog.DTOs;
using Microlearning.Areas.Catalog.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Microlearning.Areas.Catalog.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class CoursesController : ControllerBase
    {
        private readonly ICourseService _courseService;

        public CoursesController(ICourseService courseService)
        {
            _courseService = courseService;
        }

        /// <summary>
        /// Lấy danh sách toàn bộ các khóa học (hỗ trợ includeUnpublished cho Studio Quản lý)
        /// </summary>
        [HttpGet]
        [AllowAnonymous]
        public async Task<IActionResult> GetAllCourses([FromQuery] bool includeUnpublished = false)
        {
            Response.Headers.CacheControl = "no-cache, no-store, must-revalidate";
            var courses = await _courseService.GetAllCoursesAsync(includeUnpublished);
            return Ok(courses);
        }

        /// <summary>
        /// Lấy chi tiết khóa học kèm danh sách môn học và bài học bên trong
        /// </summary>
        [HttpGet("{id}")]
        [AllowAnonymous]
        public async Task<IActionResult> GetCourseById(int id, [FromQuery] bool includeUnpublished = false)
        {
            Response.Headers.CacheControl = "no-cache, no-store, must-revalidate";
            var course = await _courseService.GetCourseByIdAsync(id, includeUnpublished);
            return Ok(course);
        }

        /// <summary>
        /// Tạo mới một khóa học (Yêu cầu quyền Admin hoặc Giáo viên)
        /// </summary>
        [HttpPost]
        [Authorize(Roles = "Admin,Teacher")]
        public async Task<IActionResult> CreateCourse([FromBody] CreateCourseRequest request)
        {
            Response.Headers.CacheControl = "no-cache, no-store, must-revalidate";
            var result = await _courseService.CreateCourseAsync(request);
            return CreatedAtAction(nameof(GetCourseById), new { id = result.Id }, result);
        }

        /// <summary>
        /// Cập nhật thông tin khóa học (Yêu cầu quyền Admin hoặc Giáo viên)
        /// </summary>
        [HttpPut("{id}")]
        [Authorize(Roles = "Admin,Teacher")]
        public async Task<IActionResult> UpdateCourse(int id, [FromBody] UpdateCourseRequest request)
        {
            Response.Headers.CacheControl = "no-cache, no-store, must-revalidate";
            var result = await _courseService.UpdateCourseAsync(id, request);
            return Ok(result);
        }

        /// <summary>
        /// Thay đổi trạng thái xuất bản (Yêu cầu quyền Admin hoặc Giáo viên)
        /// </summary>
        [HttpPatch("{id}/toggle-publish")]
        [Authorize(Roles = "Admin,Teacher")]
        public async Task<IActionResult> TogglePublish(int id)
        {
            Response.Headers.CacheControl = "no-cache, no-store, must-revalidate";
            var isPublished = await _courseService.TogglePublishAsync(id);
            return Ok(new 
            { 
                courseId = id, 
                isPublished = isPublished, 
                message = isPublished ? "Khóa học đã được xuất bản." : "Khóa học đã được chuyển sang chế độ ẩn." 
            });
        }

        /// <summary>
        /// Xóa khóa học (Yêu cầu quyền Admin hoặc Giáo viên)
        /// </summary>
        [HttpDelete("{id}")]
        [Authorize(Roles = "Admin,Teacher")]
        public async Task<IActionResult> DeleteCourse(int id)
        {
            Response.Headers.CacheControl = "no-cache, no-store, must-revalidate";
            await _courseService.DeleteCourseAsync(id);
            return Ok(new { message = "Xóa khóa học thành công." });
        }
    }
}
