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
        /// Lấy danh sách toàn bộ các khóa học đang được xuất bản
        /// </summary>
        [HttpGet]
        [AllowAnonymous]
        public async Task<IActionResult> GetAllCourses()
        {
            var courses = await _courseService.GetAllCoursesAsync();
            return Ok(courses);
        }

        /// <summary>
        /// Lấy chi tiết khóa học kèm danh sách môn học và bài học bên trong
        /// </summary>
        [HttpGet("{id}")]
        [AllowAnonymous]
        public async Task<IActionResult> GetCourseById(int id)
        {
            var course = await _courseService.GetCourseByIdAsync(id);
            return Ok(course);
        }

        /// <summary>
        /// Tạo mới một khóa học (Yêu cầu đăng nhập)
        /// </summary>
        [HttpPost]
        [Authorize]
        public async Task<IActionResult> CreateCourse([FromBody] CreateCourseRequest request)
        {
            var result = await _courseService.CreateCourseAsync(request);
            return CreatedAtAction(nameof(GetCourseById), new { id = result.Id }, result);
        }

        /// <summary>
        /// Cập nhật thông tin khóa học (Tự động tăng Version)
        /// </summary>
        [HttpPut("{id}")]
        [Authorize]
        public async Task<IActionResult> UpdateCourse(int id, [FromBody] UpdateCourseRequest request)
        {
            var result = await _courseService.UpdateCourseAsync(id, request);
            return Ok(result);
        }

        /// <summary>
        /// Thay đổi trạng thái xuất bản (Ẩn / Hiện khóa học)
        /// </summary>
        [HttpPatch("{id}/toggle-publish")]
        [Authorize]
        public async Task<IActionResult> TogglePublish(int id)
        {
            var isPublished = await _courseService.TogglePublishAsync(id);
            return Ok(new 
            { 
                courseId = id, 
                isPublished = isPublished, 
                message = isPublished ? "Khóa học đã được xuất bản." : "Khóa học đã được chuyển sang chế độ ẩn." 
            });
        }

        /// <summary>
        /// Xóa khóa học
        /// </summary>
        [HttpDelete("{id}")]
        [Authorize]
        public async Task<IActionResult> DeleteCourse(int id)
        {
            await _courseService.DeleteCourseAsync(id);
            return Ok(new { message = "Xóa khóa học thành công." });
        }
    }
}
