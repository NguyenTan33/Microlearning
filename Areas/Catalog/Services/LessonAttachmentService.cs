using Microlearning.Areas.Catalog.DTOs;
using Microlearning.Areas.Catalog.Interfaces;
using Microlearning.Exceptions;
using Microlearning.Model;
using Microlearning.Model.Entities;
using Microsoft.EntityFrameworkCore;

namespace Microlearning.Areas.Catalog.Services
{
    public class LessonAttachmentService : ILessonAttachmentService
    {
        private readonly ApplicationDbContext _dbContext;
        private readonly IAttachmentStorageProvider _storageProvider;
        private readonly ILogger<LessonAttachmentService> _logger;

        private static readonly HashSet<string> AllowedExtensions = new(StringComparer.OrdinalIgnoreCase)
        {
            ".pdf", ".docx", ".doc"
        };

        private const long MAX_FILE_SIZE_BYTES = 50 * 1024 * 1024; // 50MB

        public LessonAttachmentService(
            ApplicationDbContext dbContext,
            IAttachmentStorageProvider storageProvider,
            ILogger<LessonAttachmentService> logger)
        {
            _dbContext = dbContext;
            _storageProvider = storageProvider;
            _logger = logger;
        }

        public async Task<LessonAttachmentDto> AddAttachmentAsync(int lessonId, IFormFile file, CancellationToken cancellationToken = default)
        {
            if (file == null || file.Length == 0)
            {
                throw new BusinessException("Tệp đính kèm không được để trống.");
            }

            if (file.Length > MAX_FILE_SIZE_BYTES)
            {
                throw new BusinessException("Kích thước tệp đính kèm vượt quá giới hạn tối đa 50MB.");
            }

            var extension = Path.GetExtension(file.FileName);
            if (!AllowedExtensions.Contains(extension))
            {
                throw new BusinessException("Chỉ chấp nhận các tệp tài liệu định dạng Word (.docx, .doc) hoặc PDF (.pdf).");
            }

            var lessonExists = await _dbContext.Lessons.AnyAsync(l => l.Id == lessonId, cancellationToken);
            if (!lessonExists)
            {
                throw new BusinessException($"Không tìm thấy bài học với ID {lessonId}.");
            }

            var fileType = extension.Equals(".pdf", StringComparison.OrdinalIgnoreCase) ? "PDF" : "WORD";

            using var stream = file.OpenReadStream();
            var uploadResult = await _storageProvider.UploadAsync(
                stream,
                file.FileName,
                file.ContentType,
                cancellationToken
            );

            var attachment = new LessonAttachment
            {
                LessonId = lessonId,
                FileName = uploadResult.FileName,
                OriginalFileName = file.FileName,
                FileType = fileType,
                FileUrl = uploadResult.FileUrl,
                FileSizeBytes = uploadResult.FileSizeBytes,
                Sha256Checksum = uploadResult.Sha256Checksum,
                CreatedAt = DateTime.UtcNow
            };

            _dbContext.LessonAttachments.Add(attachment);
            await _dbContext.SaveChangesAsync(cancellationToken);

            _logger.LogInformation("Đã đính kèm tệp {FileName} vào bài học {LessonId}", file.FileName, lessonId);

            return new LessonAttachmentDto(
                attachment.Id,
                attachment.LessonId,
                attachment.FileName,
                attachment.OriginalFileName,
                attachment.FileType,
                attachment.FileUrl,
                attachment.FileSizeBytes,
                attachment.Sha256Checksum,
                attachment.CreatedAt
            );
        }

        public async Task<bool> DeleteAttachmentAsync(int attachmentId, CancellationToken cancellationToken = default)
        {
            var attachment = await _dbContext.LessonAttachments
                .FirstOrDefaultAsync(a => a.Id == attachmentId, cancellationToken);

            if (attachment == null)
            {
                return false;
            }

            await _storageProvider.DeleteAsync(attachment.FileUrl, cancellationToken);

            _dbContext.LessonAttachments.Remove(attachment);
            await _dbContext.SaveChangesAsync(cancellationToken);

            _logger.LogInformation("Đã xóa tệp đính kèm ID {AttachmentId}", attachmentId);
            return true;
        }

        public async Task<IReadOnlyList<LessonAttachmentDto>> GetAttachmentsByLessonIdAsync(int lessonId, CancellationToken cancellationToken = default)
        {
            return await _dbContext.LessonAttachments
                .AsNoTracking()
                .Where(a => a.LessonId == lessonId)
                .OrderBy(a => a.CreatedAt)
                .Select(a => new LessonAttachmentDto(
                    a.Id,
                    a.LessonId,
                    a.FileName,
                    a.OriginalFileName,
                    a.FileType,
                    a.FileUrl,
                    a.FileSizeBytes,
                    a.Sha256Checksum,
                    a.CreatedAt
                ))
                .ToListAsync(cancellationToken);
        }

        public async Task<IReadOnlyList<LessonAttachmentDto>> GetAttachmentsByCourseIdAsync(int courseId, CancellationToken cancellationToken = default)
        {
            return await _dbContext.LessonAttachments
                .AsNoTracking()
                .Where(a => a.Lesson != null && a.Lesson.Subject != null && a.Lesson.Subject.CourseId == courseId)
                .OrderBy(a => a.CreatedAt)
                .Select(a => new LessonAttachmentDto(
                    a.Id,
                    a.LessonId,
                    a.FileName,
                    a.OriginalFileName,
                    a.FileType,
                    a.FileUrl,
                    a.FileSizeBytes,
                    a.Sha256Checksum,
                    a.CreatedAt
                ))
                .ToListAsync(cancellationToken);
        }
    }
}
