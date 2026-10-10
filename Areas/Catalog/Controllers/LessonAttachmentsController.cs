using Microlearning.Areas.Catalog.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Microlearning.Areas.Catalog.Controllers
{
    [ApiController]
    [Route("api/lessons/{lessonId:int}/attachments")]
    public class LessonAttachmentsController : ControllerBase
    {
        private readonly ILessonAttachmentService _attachmentService;

        public LessonAttachmentsController(ILessonAttachmentService attachmentService)
        {
            _attachmentService = attachmentService;
        }

        /// <summary>
        /// Lấy danh sách các tệp tài liệu đính kèm (Word/PDF) của bài học
        /// </summary>
        [HttpGet]
        [AllowAnonymous]
        public async Task<IActionResult> GetAttachments(int lessonId, CancellationToken cancellationToken)
        {
            var attachments = await _attachmentService.GetAttachmentsByLessonIdAsync(lessonId, cancellationToken);
            return Ok(attachments);
        }

        /// <summary>
        /// Lấy toàn bộ tài liệu đính kèm (Word/PDF) thuộc mọi bài học của một khóa học
        /// </summary>
        [HttpGet("/api/courses/{courseId:int}/attachments")]
        [AllowAnonymous]
        public async Task<IActionResult> GetCourseAttachments(int courseId, CancellationToken cancellationToken)
        {
            var attachments = await _attachmentService.GetAttachmentsByCourseIdAsync(courseId, cancellationToken);
            return Ok(attachments);
        }

        /// <summary>
        /// Tải lên tệp tài liệu đính kèm (Word/PDF) cho bài học (Yêu cầu quyền Giáo viên hoặc Admin)
        /// </summary>
        [HttpPost]
        [Authorize(Roles = "Admin,Teacher")]
        [RequestSizeLimit(52428800)] // 50MB
        public async Task<IActionResult> UploadAttachment(int lessonId, IFormFile file, CancellationToken cancellationToken)
        {
            var result = await _attachmentService.AddAttachmentAsync(lessonId, file, cancellationToken);
            return CreatedAtAction(nameof(GetAttachments), new { lessonId }, result);
        }

        /// <summary>
        /// Xóa tệp tài liệu đính kèm (Yêu cầu quyền Giáo viên hoặc Admin)
        /// </summary>
        [HttpDelete("{attachmentId:int}")]
        [Authorize(Roles = "Admin,Teacher")]
        public async Task<IActionResult> DeleteAttachment(int lessonId, int attachmentId, CancellationToken cancellationToken)
        {
            var success = await _attachmentService.DeleteAttachmentAsync(attachmentId, cancellationToken);
            if (!success)
            {
                return NotFound(new { message = $"Không tìm thấy tệp đính kèm với ID {attachmentId}." });
            }
            return NoContent();
        }
    }
}
