using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microlearning.DTOs;
using Microlearning.Service.Interfaces;

namespace Microlearning.Controllers
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
        /// Lấy danh sách các bài học thuộc về 1 môn học
        /// </summary>
        [HttpGet("subject/{subjectId}")]
        public async Task<IActionResult> GetLessonsBySubject(int subjectId)
        {
            var lessons = await _lessonService.GetLessonsBySubjectId(subjectId);
            return Ok(lessons);
        }

        /// <summary>
        /// Lấy chi tiết thông tin của 1 bài học
        /// </summary>
        [HttpGet("{id}")]
        public async Task<IActionResult> GetLessonById(int id)
        {
            try
            {
                var lesson = await _lessonService.GetLessonById(id);
                return Ok(lesson);
            }
            catch (Exception ex)
            {
                return NotFound(new { message = ex.Message });
            }
        }

        /// <summary>
        /// Tạo mới một bài học
        /// </summary>
        [HttpPost]
        [Authorize]
        public async Task<IActionResult> CreateLesson([FromBody] CreateLessonDTO dto)
        {
            await _lessonService.CreateLesson(dto);
            return Ok(new { message = "Tạo bài học thành công." });
        }

        /// <summary>
        /// Cập nhật thông tin bài học (Tự động tăng Version)
        /// </summary>
        [HttpPut("{id}")]
        [Authorize]
        public async Task<IActionResult> UpdateLesson(int id, [FromBody] UpdateLessonDTO dto)
        {
            try
            {
                await _lessonService.UpdateLesson(id, dto);
                return Ok(new { message = "Cập nhật bài học thành công." });
            }
            catch (Exception ex)
            {
                return NotFound(new { message = ex.Message });
            }
        }

        /// <summary>
        /// Ẩn hoặc Xuất bản bài học
        /// </summary>
        [HttpPatch("{id}/toggle-publish")]
        [Authorize]
        public async Task<IActionResult> TogglePublish(int id)
        {
            try
            {
                await _lessonService.TogglePublishLesson(id);
                return Ok(new { message = "Thay đổi trạng thái xuất bản bài học thành công." });
            }
            catch (Exception ex)
            {
                return NotFound(new { message = ex.Message });
            }
        }

        /// <summary>
        /// Xóa bài học
        /// </summary>
        [HttpDelete("{id}")]
        [Authorize]
        public async Task<IActionResult> DeleteLesson(int id)
        {
            try
            {
                await _lessonService.DeleteLesson(id);
                return Ok(new { message = "Xóa bài học thành công." });
            }
            catch (Exception ex)
            {
                return NotFound(new { message = ex.Message });
            }
        }
    }
}
