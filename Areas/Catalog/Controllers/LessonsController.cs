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
    public class LessonsController : ControllerBase
    {
        private readonly ILessonService _lessonService;
        private readonly ICourseService _courseService;
        private readonly ApplicationDbContext _dbContext;

        public LessonsController(
            ILessonService lessonService,
            ICourseService courseService,
            ApplicationDbContext dbContext)
        {
            _lessonService = lessonService;
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
                throw new BusinessException("Bạn không có quyền chỉnh sửa bài học thuộc khóa học của giảng viên khác.");
            }
        }

        private async Task EnsureUserCanManageSubjectAsync(int subjectId)
        {
            if (User.IsInRole("Admin")) return;
            var subject = await _dbContext.Subjects.AsNoTracking().FirstOrDefaultAsync(s => s.Id == subjectId);
            if (subject != null)
            {
                await EnsureUserCanManageCourseAsync(subject.CourseId);
            }
        }

        private async Task EnsureUserCanManageLessonAsync(int lessonId)
        {
            if (User.IsInRole("Admin")) return;
            var lesson = await _dbContext.Lessons
                .AsNoTracking()
                .Include(l => l.Subject)
                .FirstOrDefaultAsync(l => l.Id == lessonId);
            if (lesson?.Subject != null)
            {
                await EnsureUserCanManageCourseAsync(lesson.Subject.CourseId);
            }
        }

        /// <summary>
        /// Lấy danh sách các bài học thuộc về một môn học
        /// </summary>
        [HttpGet("subject/{subjectId}")]
        public async Task<IActionResult> GetLessonsBySubject(int subjectId, [FromQuery] bool includeUnpublished = false)
        {
            Response.Headers.CacheControl = "no-cache, no-store, must-revalidate";
            var lessons = await _lessonService.GetLessonsBySubjectIdAsync(subjectId, includeUnpublished);
            return Ok(lessons);
        }

        /// <summary>
        /// Lấy chi tiết thông tin của một bài học
        /// </summary>
        [HttpGet("{id}")]
        public async Task<IActionResult> GetLessonById(int id)
        {
            Response.Headers.CacheControl = "no-cache, no-store, must-revalidate";
            var lesson = await _lessonService.GetLessonByIdAsync(id);
            return Ok(lesson);
        }

        /// <summary>
        /// Lấy trọn gói dữ liệu bài học phục vụ tải ngoại tuyến Offline
        /// </summary>
        [HttpGet("{id}/package")]
        [Authorize]
        public async Task<IActionResult> GetLessonPackage(int id)
        {
            var package = await _lessonService.GetLessonPackageAsync(id);
            return Ok(package);
        }

        /// <summary>
        /// Tạo mới một bài học (Yêu cầu quyền Admin hoặc Giáo viên sở hữu khóa học)
        /// </summary>
        [HttpPost]
        [Authorize(Roles = "Admin,Teacher")]
        public async Task<IActionResult> CreateLesson([FromBody] CreateLessonRequest request)
        {
            await EnsureUserCanManageSubjectAsync(request.SubjectId);
            var result = await _lessonService.CreateLessonAsync(request);
            return CreatedAtAction(nameof(GetLessonById), new { id = result.Id }, result);
        }

        /// <summary>
        /// Cập nhật bài học (Yêu cầu quyền Admin hoặc Giáo viên sở hữu khóa học)
        /// </summary>
        [HttpPut("{id}")]
        [Authorize(Roles = "Admin,Teacher")]
        public async Task<IActionResult> UpdateLesson(int id, [FromBody] UpdateLessonRequest request)
        {
            await EnsureUserCanManageLessonAsync(id);
            var result = await _lessonService.UpdateLessonAsync(id, request);
            return Ok(result);
        }

        /// <summary>
        /// Bật/Tắt trạng thái xuất bản bài học (Yêu cầu quyền Admin hoặc Giáo viên sở hữu khóa học)
        /// </summary>
        [HttpPatch("{id}/toggle-publish")]
        [Authorize(Roles = "Admin,Teacher")]
        public async Task<IActionResult> TogglePublish(int id)
        {
            await EnsureUserCanManageLessonAsync(id);
            var isPublished = await _lessonService.TogglePublishLessonAsync(id);
            return Ok(new 
            { 
                lessonId = id, 
                isPublished = isPublished, 
                message = isPublished ? "Bài học đã được xuất bản." : "Bài học đã được chuyển sang chế độ nháp." 
            });
        }

        /// <summary>
        /// Xóa bài học (Yêu cầu quyền Admin hoặc Giáo viên sở hữu khóa học)
        /// </summary>
        [HttpDelete("{id}")]
        [Authorize(Roles = "Admin,Teacher")]
        public async Task<IActionResult> DeleteLesson(int id)
        {
            await EnsureUserCanManageLessonAsync(id);
            await _lessonService.DeleteLessonAsync(id);
            return Ok(new { message = "Xóa bài học thành công." });
        }

        /// <summary>
        /// Tải lên slide bài học (.ppt, .pptx, .pdf) (Yêu cầu quyền Admin hoặc Giáo viên sở hữu khóa học)
        /// </summary>
        [HttpPost("upload-slide")]
        [Authorize(Roles = "Admin,Teacher")]
        [RequestSizeLimit(104857600)] // 100MB
        public async Task<IActionResult> UploadSlide(IFormFile file, [FromQuery] int? lessonId, CancellationToken cancellationToken)
        {
            if (lessonId.HasValue)
            {
                await EnsureUserCanManageLessonAsync(lessonId.Value);
            }

            var slideUrl = await _lessonService.UploadSlideAsync(file, cancellationToken);

            if (lessonId.HasValue)
            {
                var lesson = await _dbContext.Lessons.FindAsync(new object[] { lessonId.Value }, cancellationToken);
                if (lesson != null)
                {
                    lesson.SlideUrl = slideUrl;
                    lesson.SlideType = "Presentation";
                    lesson.Version += 1;
                    await _dbContext.SaveChangesAsync(cancellationToken);
                }
            }

            return Ok(new { url = slideUrl, message = "Tải lên slide bài giảng thành công." });
        }
    }
}
