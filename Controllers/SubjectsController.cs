using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microlearning.DTOs;
using Microlearning.Service.Interfaces;

namespace Microlearning.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class SubjectsController : ControllerBase
    {
        private readonly ISubjectService _subjectService;

        public SubjectsController(ISubjectService subjectService)
        {
            _subjectService = subjectService;
        }

        /// <summary>
        /// Lấy danh sách môn học thuộc về 1 khóa học (sắp xếp theo SortOrder)
        /// </summary>
        [HttpGet("course/{courseId}")]
        public async Task<IActionResult> GetSubjectsByCourse(int courseId)
        {
            var subjects = await _subjectService.GetSubjectsByCourseId(courseId);
            return Ok(subjects);
        }

        /// <summary>
        /// Tạo mới một môn học trong khóa học
        /// </summary>
        [HttpPost]
        [Authorize]
        public async Task<IActionResult> CreateSubject([FromBody] CreateSubjectDTO dto)
        {
            await _subjectService.CreateSubject(dto);
            return Ok(new { message = "Tạo môn học thành công." });
        }

        /// <summary>
        /// Cập nhật thông tin môn học
        /// </summary>
        [HttpPut("{id}")]
        [Authorize]
        public async Task<IActionResult> UpdateSubject(int id, [FromBody] UpdateSubjectDTO dto)
        {
            try
            {
                await _subjectService.UpdateSubject(id, dto);
                return Ok(new { message = "Cập nhật môn học thành công." });
            }
            catch (Exception ex)
            {
                return NotFound(new { message = ex.Message });
            }
        }

        /// <summary>
        /// Xóa môn học
        /// </summary>
        [HttpDelete("{id}")]
        [Authorize]
        public async Task<IActionResult> DeleteSubject(int id)
        {
            try
            {
                await _subjectService.DeleteSubject(id);
                return Ok(new { message = "Xóa môn học thành công." });
            }
            catch (Exception ex)
            {
                return NotFound(new { message = ex.Message });
            }
        }
    }
}
