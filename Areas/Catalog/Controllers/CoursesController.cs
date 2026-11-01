using System.Security.Claims;
using Microlearning.Areas.Catalog.DTOs;
using Microlearning.Areas.Catalog.Interfaces;
using Microlearning.Model;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace Microlearning.Areas.Catalog.Controllers
{
    [ApiController]
    [Authorize]
    [Route("api/[controller]")]
    public class CoursesController : ControllerBase
    {
        private readonly ICourseService _courseService;
        private readonly ApplicationDbContext _dbContext;

        public CoursesController(ICourseService courseService, ApplicationDbContext dbContext)
        {
            _courseService = courseService;
            _dbContext = dbContext;
        }

        private (string? userId, bool isAdmin, string authorName) GetCurrentUserInfo()
        {
            var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
            var isAdmin = User.IsInRole("Admin");
            var authorName = User.FindFirst("FullName")?.Value 
                          ?? User.FindFirstValue(ClaimTypes.Name) 
                          ?? User.Identity?.Name 
                          ?? "Giảng viên EduSync";
            return (userId, isAdmin, authorName);
        }

        /// <summary>
        /// Lấy danh sách toàn bộ các khóa học (hỗ trợ includeUnpublished cho Studio Quản lý)
        /// </summary>
        [HttpGet]
        public async Task<IActionResult> GetAllCourses([FromQuery] bool includeUnpublished = false)
        {
            Response.Headers.CacheControl = "no-cache, no-store, must-revalidate";
            var (userId, isAdmin, _) = GetCurrentUserInfo();
            var courses = await _courseService.GetAllCoursesAsync(includeUnpublished, userId, isAdmin);
            return Ok(courses);
        }

        /// <summary>
        /// Lấy chi tiết khóa học kèm danh sách môn học và bài học bên trong
        /// </summary>
        [HttpGet("{id}")]
        public async Task<IActionResult> GetCourseById(int id, [FromQuery] bool includeUnpublished = false)
        {
            Response.Headers.CacheControl = "no-cache, no-store, must-revalidate";
            var (userId, isAdmin, _) = GetCurrentUserInfo();
            var course = await _courseService.GetCourseByIdAsync(id, includeUnpublished, userId, isAdmin);
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
            var (userId, isAdmin, rawAuthor) = GetCurrentUserInfo();
            var roleLabel = isAdmin ? "[Admin]" : "[Giáo viên]";
            var authorName = $"{roleLabel} {rawAuthor}";

            if (!string.IsNullOrEmpty(userId))
            {
                var acc = await _dbContext.Users.AsNoTracking().FirstOrDefaultAsync(u => u.Id == userId);
                if (acc != null)
                {
                    var name = !string.IsNullOrWhiteSpace(acc.FullName) ? acc.FullName : acc.UserName;
                    var contact = !string.IsNullOrWhiteSpace(acc.Email) ? acc.Email : acc.UserName;
                    authorName = $"{roleLabel} {name} ({contact})";
                }
            }

            var result = await _courseService.CreateCourseAsync(request, userId, authorName);
            return CreatedAtAction(nameof(GetCourseById), new { id = result.Id }, result);
        }

        /// <summary>
        /// Cập nhật thông tin khóa học (Chỉ Admin hoặc Tác giả khóa học)
        /// </summary>
        [HttpPut("{id}")]
        [Authorize(Roles = "Admin,Teacher")]
        public async Task<IActionResult> UpdateCourse(int id, [FromBody] UpdateCourseRequest request)
        {
            Response.Headers.CacheControl = "no-cache, no-store, must-revalidate";
            var (userId, isAdmin, _) = GetCurrentUserInfo();
            var result = await _courseService.UpdateCourseAsync(id, request, userId, isAdmin);
            return Ok(result);
        }

        /// <summary>
        /// Thay đổi trạng thái xuất bản (Chỉ Admin hoặc Tác giả khóa học)
        /// </summary>
        [HttpPatch("{id}/toggle-publish")]
        [Authorize(Roles = "Admin,Teacher")]
        public async Task<IActionResult> TogglePublish(int id)
        {
            Response.Headers.CacheControl = "no-cache, no-store, must-revalidate";
            var (userId, isAdmin, _) = GetCurrentUserInfo();
            var isPublished = await _courseService.TogglePublishAsync(id, userId, isAdmin);
            return Ok(new 
            { 
                courseId = id, 
                isPublished = isPublished, 
                message = isPublished ? "Khóa học đã được xuất bản." : "Khóa học đã được chuyển sang chế độ ẩn." 
            });
        }

        /// <summary>
        /// Xóa khóa học (Chỉ Admin hoặc Tác giả khóa học)
        /// </summary>
        [HttpDelete("{id}")]
        [Authorize(Roles = "Admin,Teacher")]
        public async Task<IActionResult> DeleteCourse(int id)
        {
            Response.Headers.CacheControl = "no-cache, no-store, must-revalidate";
            var (userId, isAdmin, _) = GetCurrentUserInfo();
            await _courseService.DeleteCourseAsync(id, userId, isAdmin);
            return Ok(new { message = "Xóa khóa học thành công." });
        }

        /// <summary>
        /// Tải lên ảnh đại diện thumbnail khóa học (PNG, JPG, WebP)
        /// </summary>
        [HttpPost("upload-thumbnail")]
        [Authorize(Roles = "Admin,Teacher")]
        public async Task<IActionResult> UploadThumbnail([FromForm] IFormFile file, CancellationToken cancellationToken)
        {
            Response.Headers.CacheControl = "no-cache, no-store, must-revalidate";
            var url = await _courseService.UploadThumbnailAsync(file, cancellationToken);
            return Ok(new { url, message = "Tải ảnh đại diện khóa học thành công." });
        }
    }
}
