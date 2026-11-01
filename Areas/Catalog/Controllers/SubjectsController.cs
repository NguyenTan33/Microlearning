using System.Security.Claims;
using Microlearning.Areas.Catalog.DTOs;
using Microlearning.Areas.Catalog.Interfaces;
using Microlearning.Exceptions;
using Microlearning.Model;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace Microlearning.Areas.Catalog.Controllers
{
    [ApiController]
    [Authorize]
    [Route("api/[controller]")]
    public class SubjectsController : ControllerBase
    {
        private readonly ISubjectService _subjectService;
        private readonly ICourseService _courseService;
        private readonly ApplicationDbContext _dbContext;

        public SubjectsController(
            ISubjectService subjectService,
            ICourseService courseService,
            ApplicationDbContext dbContext)
        {
            _subjectService = subjectService;
            _courseService = courseService;
            _dbContext = dbContext;
        }

        private async Task EnsureUserCanManageCourseAsync(int courseId)
        {
            if (User.IsInRole("Admin")) return;
            var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
            var canManage = await _courseService.CanUserManageCourseAsync(courseId, userId, false);
            if (!canManage)
            {
                throw new BusinessException("Bạn không có quyền chỉnh sửa môn học thuộc khóa học của giảng viên khác.");
            }
        }

        /// <summary>
        /// Lấy danh sách toàn bộ môn học thuộc về một khóa học
        /// </summary>
        [HttpGet("course/{courseId}")]
        public async Task<IActionResult> GetSubjectsByCourse(int courseId)
        {
            Response.Headers.CacheControl = "no-cache, no-store, must-revalidate";
            var subjects = await _subjectService.GetSubjectsByCourseIdAsync(courseId);
            return Ok(subjects);
        }

        /// <summary>
        /// Lấy chi tiết thông tin môn học
        /// </summary>
        [HttpGet("{id}")]
        public async Task<IActionResult> GetSubjectById(int id)
        {
            Response.Headers.CacheControl = "no-cache, no-store, must-revalidate";
            var subject = await _subjectService.GetSubjectByIdAsync(id);
            return Ok(subject);
        }

        /// <summary>
        /// Tạo mới một môn học (Yêu cầu quyền Admin hoặc Giáo viên sở hữu khóa học)
        /// </summary>
        [HttpPost]
        [Authorize(Roles = "Admin,Teacher")]
        public async Task<IActionResult> CreateSubject([FromBody] CreateSubjectRequest request)
        {
            await EnsureUserCanManageCourseAsync(request.CourseId);
            var result = await _subjectService.CreateSubjectAsync(request);
            return CreatedAtAction(nameof(GetSubjectById), new { id = result.Id }, result);
        }

        /// <summary>
        /// Cập nhật thông tin môn học (Yêu cầu quyền Admin hoặc Giáo viên sở hữu khóa học)
        /// </summary>
        [HttpPut("{id}")]
        [Authorize(Roles = "Admin,Teacher")]
        public async Task<IActionResult> UpdateSubject(int id, [FromBody] UpdateSubjectRequest request)
        {
            var subject = await _dbContext.Subjects.AsNoTracking().FirstOrDefaultAsync(s => s.Id == id);
            if (subject != null)
            {
                await EnsureUserCanManageCourseAsync(subject.CourseId);
            }
            var result = await _subjectService.UpdateSubjectAsync(id, request);
            return Ok(result);
        }

        /// <summary>
        /// Xóa môn học (Yêu cầu quyền Admin hoặc Giáo viên sở hữu khóa học)
        /// </summary>
        [HttpDelete("{id}")]
        [Authorize(Roles = "Admin,Teacher")]
        public async Task<IActionResult> DeleteSubject(int id)
        {
            var subject = await _dbContext.Subjects.AsNoTracking().FirstOrDefaultAsync(s => s.Id == id);
            if (subject != null)
            {
                await EnsureUserCanManageCourseAsync(subject.CourseId);
            }
            await _subjectService.DeleteSubjectAsync(id);
            return Ok(new { message = "Xóa môn học thành công." });
        }
    }
}
