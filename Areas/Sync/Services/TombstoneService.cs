using Microlearning.Areas.Sync.DTOs;
using Microlearning.Areas.Sync.Interfaces;
using Microlearning.Exceptions;
using Microlearning.Infrastructure.Factory;
using Microlearning.Model;
using Microlearning.Model.Entities.Enums;
using Microsoft.EntityFrameworkCore;

namespace Microlearning.Areas.Sync.Services
{
    public class TombstoneService : ITombstoneService
    {
        private readonly ApplicationDbContext _context;
        private readonly IContentChangeTracker _changeTracker;
        private readonly IValidationFactory _validationFactory;
        private readonly ILogger<TombstoneService> _logger;

        public TombstoneService(
            ApplicationDbContext context,
            IContentChangeTracker changeTracker,
            IValidationFactory validationFactory,
            ILogger<TombstoneService> logger)
        {
            _context = context;
            _changeTracker = changeTracker;
            _validationFactory = validationFactory;
            _logger = logger;
        }

        public async Task<TombstoneResponse> CreateTombstoneAsync(
            TombstoneRequest request,
            CancellationToken cancellationToken = default)
        {
            // 1. Chạy qua nhà máy Validation (Kiểm tra EntityType, EntityId)
            await _validationFactory.ValidateAsync(request, cancellationToken);

            int currentVersion = 1;

            // 2. Xử lý gỡ bỏ theo từng loại Entity
            if (request.EntityType.Equals("Lesson", StringComparison.OrdinalIgnoreCase))
            {
                var lesson = await _context.Lessons
                    .FirstOrDefaultAsync(l => l.Id == request.EntityId, cancellationToken);

                if (lesson == null)
                {
                    throw new BusinessException($"Không tìm thấy bài học với ID = {request.EntityId}.");
                }

                // Gỡ xuất bản (Soft-delete / Unpublish)
                lesson.IsPublished = false;
                lesson.Version++;
                lesson.UpdatedAt = DateTime.UtcNow;
                currentVersion = lesson.Version;
            }
            else if (request.EntityType.Equals("Course", StringComparison.OrdinalIgnoreCase))
            {
                var course = await _context.Courses
                    .FirstOrDefaultAsync(c => c.Id == request.EntityId, cancellationToken);

                if (course == null)
                {
                    throw new BusinessException($"Không tìm thấy khóa học với ID = {request.EntityId}.");
                }

                course.IsPublished = false;
                course.Version++;
                course.UpdatedAt = DateTime.UtcNow;
                currentVersion = course.Version;
            }

            await _context.SaveChangesAsync(cancellationToken);

            // 3. Dựng "Bia mộ" Tombstone trong ContentChanges với ChangeType = Deleted
            var changeLog = await _changeTracker.LogChangeAsync(
                request.EntityType,
                request.EntityId,
                ContentChangeType.Deleted, // Cờ Deleted cực kỳ quan trọng cho Mobile
                currentVersion,
                cancellationToken);

            _logger.LogWarning(
                "Đã tạo Tombstone: Entity={EntityType}#{EntityId}, Sequence={Sequence}, Lý do={Reason}",
                request.EntityType, request.EntityId, changeLog.Sequence, request.Reason ?? "Không có lý do");

            return new TombstoneResponse
            {
                Sequence = changeLog.Sequence,
                EntityType = changeLog.EntityType,
                EntityId = changeLog.EntityId,
                ChangeType = changeLog.ChangeType.ToString(),
                Version = changeLog.Version,
                TombstonedAt = changeLog.ChangedAt,
                Message = $"Đã gỡ bỏ {request.EntityType} #{request.EntityId} thành công và phát sinh bia mộ Tombstone (Sequence={changeLog.Sequence})."
            };
        }
    }
}