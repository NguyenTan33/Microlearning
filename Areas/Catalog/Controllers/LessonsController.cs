using Microlearning.Areas.Catalog.DTOs;
using Microlearning.Areas.Catalog.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Microlearning.Areas.Catalog.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class LessonsController : ControllerBase
    {
        private readonly ILessonService _lessonService;

        public LessonsController(ILessonService lessonService)
        {
            _lessonService = lessonService;
        }

        /// <summary>
        /// Lấy danh sách các bài học thuộc về một môn học
        /// </summary>
        [HttpGet("subject/{subjectId}")]
        [AllowAnonymous]
        public async Task<IActionResult> GetLessonsBySubject(int subjectId)
        {
            var lessons = await _lessonService.GetLessonsBySubjectIdAsync(subjectId);
            return Ok(lessons);
        }

        /// <summary>
        /// Lấy chi tiết thông tin của một bài học
        /// </summary>
        [HttpGet("{id}")]
        [AllowAnonymous]
        public async Task<IActionResult> GetLessonById(int id)
        {
            var lesson = await _lessonService.GetLessonByIdAsync(id);
            return Ok(lesson);
        }

        /// <summary>
        /// Lấy trọn gói dữ liệu bài học phục vụ tải ngoại tuyến Offline (Metadata + File Media tải về + Đề thi trắc nghiệm ẩn đáp án)
        /// Đây là endpoint quan trọng nhất cho ứng dụng Mobile/Client chạy Offline-First.
        /// </summary>
        [HttpGet("{id}/package")]
        [Authorize]
        public async Task<IActionResult> GetLessonPackage(int id)
        {
            var package = await _lessonService.GetLessonPackageAsync(id);
            return Ok(package);
        }

        /// <summary>
        /// Tạo mới một bài học (Yêu cầu quyền Admin hoặc Giáo viên)
        /// </summary>
        [HttpPost]
        [Authorize(Roles = "Admin,Teacher")]
        public async Task<IActionResult> CreateLesson([FromBody] CreateLessonRequest request)
        {
            var result = await _lessonService.CreateLessonAsync(request);
            return CreatedAtAction(nameof(GetLessonById), new { id = result.Id }, result);
        }

        /// <summary>
        /// Cập nhật thông tin bài học (Yêu cầu quyền Admin hoặc Giáo viên)
        /// </summary>
        [HttpPut("{id}")]
        [Authorize(Roles = "Admin,Teacher")]
        public async Task<IActionResult> UpdateLesson(int id, [FromBody] UpdateLessonRequest request)
        {
            var result = await _lessonService.UpdateLessonAsync(id, request);
            return Ok(result);
        }

        /// <summary>
        /// Thay đổi trạng thái xuất bản bài học (Yêu cầu quyền Admin hoặc Giáo viên)
        /// </summary>
        [HttpPatch("{id}/toggle-publish")]
        [Authorize(Roles = "Admin,Teacher")]
        public async Task<IActionResult> TogglePublishLesson(int id)
        {
            var isPublished = await _lessonService.TogglePublishLessonAsync(id);
            return Ok(new 
            { 
                lessonId = id, 
                isPublished = isPublished, 
                message = isPublished ? "Bài học đã được xuất bản." : "Bài học đã được chuyển sang chế độ ẩn." 
            });
        }

        /// <summary>
        /// Xóa bài học (Yêu cầu quyền Admin hoặc Giáo viên)
        /// </summary>
        [HttpDelete("{id}")]
        [Authorize(Roles = "Admin,Teacher")]
        public async Task<IActionResult> DeleteLesson(int id)
        {
            await _lessonService.DeleteLessonAsync(id);
            return Ok(new { message = "Xóa bài học thành công." });
        }
    }
}
