using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microlearning.DTOs;
using Microlearning.Service.Interfaces;

namespace Microlearning.Controllers
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
        public async Task<IActionResult> GetAllCourses()
        {
            var courses = await _courseService.GetAllCourse();
            return Ok(courses);
        }

        /// <summary>
        /// Lấy chi tiết khóa học kèm danh sách môn học bên trong
        /// </summary>
        [HttpGet("{id}")]
        public async Task<IActionResult> GetCourseById(int id)
        {
            try
            {
                var course = await _courseService.GetCourseByID(id);
                return Ok(course);
            }
            catch (Exception ex)
            {
                return NotFound(new { message = ex.Message });
            }
        }

        /// <summary>
        /// Tạo mới một khóa học
        /// </summary>
        [HttpPost]
        [Authorize]
        public async Task<IActionResult> CreateCourse([FromBody] CreateCourseDTO dto)
        {
            await _courseService.CreateCourse(dto);
            return Ok(new { message = "Tạo khóa học thành công." });
        }

        /// <summary>
        /// Cập nhật thông tin khóa học (Tự động tăng Version)
        /// </summary>
        [HttpPut("{id}")]
        [Authorize]
        public async Task<IActionResult> UpdateCourse(int id, [FromBody] CreateCourseDTO dto)
        {
            try
            {
                await _courseService.UpdateCourse(id, dto);
                return Ok(new { message = "Cập nhật khóa học thành công." });
            }
            catch (Exception ex)
            {
                return NotFound(new { message = ex.Message });
            }
        }

        /// <summary>
        /// Xóa khóa học
        /// </summary>
        [HttpDelete("{id}")]
        [Authorize]
        public async Task<IActionResult> DeleteCourse(int id)
        {
            try
            {
                await _courseService.DeleteCourse(id);
                return Ok(new { message = "Xóa khóa học thành công." });
            }
            catch (Exception ex)
            {
                return NotFound(new { message = ex.Message });
            }
        }

        /// <summary>
        /// Ẩn hoặc Xuất bản khóa học
        /// </summary>
        [HttpPatch("{id}/toggle-publish")]
        [Authorize]
        public async Task<IActionResult> TogglePublish(int id)
        {
            try
            {
                await _courseService.TogglePublishAsync(id);
                return Ok(new { message = "Thay đổi trạng thái xuất bản thành công." });
            }
            catch (Exception ex)
            {
                return NotFound(new { message = ex.Message });
            }
        }
    }
}
