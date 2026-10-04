using Microlearning.Areas.Sync.DTOs;
using Microlearning.Exceptions;
using Microlearning.Infrastructure.Factory;

namespace Microlearning.Infrastructure.Validation.Sync
{
    public class TombstoneValidationRule : IValidationRule<TombstoneRequest>
    {
        private static readonly string[] AllowedEntityTypes = { "Course", "Subject", "Lesson", "Quiz" };

        public Task ValidateAsync(TombstoneRequest request, CancellationToken cancellationToken = default)
        {
            if (request == null)
            {
                throw new BusinessException("Yêu cầu gỡ bỏ (TombstoneRequest) không được để trống.");
            }

            if (string.IsNullOrWhiteSpace(request.EntityType))
            {
                throw new BusinessException("Loại đối tượng (EntityType) không được để trống.");
            }

            if (!AllowedEntityTypes.Contains(request.EntityType.Trim(), StringComparer.OrdinalIgnoreCase))
            {
                throw new BusinessException($"Loại đối tượng '{request.EntityType}' không hợp lệ. Chỉ chấp nhận: Course, Subject, Lesson, Quiz.");
            }

            if (request.EntityId <= 0)
            {
                throw new BusinessException("Mã đối tượng (EntityId) phải là số nguyên dương hợp lệ.");
            }

            return Task.CompletedTask;
        }
    }
}