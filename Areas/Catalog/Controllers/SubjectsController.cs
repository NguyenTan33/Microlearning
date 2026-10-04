using Microlearning.Areas.Catalog.DTOs;
using Microlearning.Areas.Catalog.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Microlearning.Areas.Catalog.Controllers
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
        /// Lấy danh sách toàn bộ môn học thuộc về một khóa học
        /// </summary>
        [HttpGet("course/{courseId}")]
        [AllowAnonymous]
        public async Task<IActionResult> GetSubjectsByCourse(int courseId)
        {
            var subjects = await _subjectService.GetSubjectsByCourseIdAsync(courseId);
            return Ok(subjects);
        }

        /// <summary>
        /// Lấy chi tiết thông tin môn học
        /// </summary>
        [HttpGet("{id}")]
        [AllowAnonymous]
        public async Task<IActionResult> GetSubjectById(int id)
        {
            var subject = await _subjectService.GetSubjectByIdAsync(id);
            return Ok(subject);
        }

        /// <summary>
        /// Tạo mới một môn học (Yêu cầu đăng nhập)
        /// </summary>
        [HttpPost]
        [Authorize]
        public async Task<IActionResult> CreateSubject([FromBody] CreateSubjectRequest request)
        {
            var result = await _subjectService.CreateSubjectAsync(request);
            return CreatedAtAction(nameof(GetSubjectById), new { id = result.Id }, result);
        }

        /// <summary>
        /// Cập nhật thông tin môn học
        /// </summary>
        [HttpPut("{id}")]
        [Authorize]
        public async Task<IActionResult> UpdateSubject(int id, [FromBody] UpdateSubjectRequest request)
        {
            var result = await _subjectService.UpdateSubjectAsync(id, request);
            return Ok(result);
        }

        /// <summary>
        /// Xóa môn học
        /// </summary>
        [HttpDelete("{id}")]
        [Authorize]
        public async Task<IActionResult> DeleteSubject(int id)
        {
            await _subjectService.DeleteSubjectAsync(id);
            return Ok(new { message = "Xóa môn học thành công." });
        }
    }
}
