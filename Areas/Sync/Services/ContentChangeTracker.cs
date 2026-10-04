using Microlearning.Areas.Sync.Interfaces;
using Microlearning.Exceptions;
using Microlearning.Model;
using Microlearning.Model.Entities;
using Microlearning.Model.Entities.Enums;
using Microsoft.EntityFrameworkCore;

namespace Microlearning.Areas.Sync.Services
{
    public class ContentChangeTracker : IContentChangeTracker
    {
        private readonly ApplicationDbContext _dbContext;
        private readonly ILogger<ContentChangeTracker> _logger;

        public ContentChangeTracker(ApplicationDbContext dbContext, ILogger<ContentChangeTracker> logger)
        {
            _dbContext = dbContext;
            _logger = logger;
        }

        public async Task<ContentChange> LogChangeAsync(string entityType, int entityId, ContentChangeType changeType, int version, CancellationToken cancellationToken = default)
        {
            // 1. Kiểm tra tính hợp lệ của tham số
            if (string.IsNullOrWhiteSpace(entityType))
            {
                throw new BusinessException("EntityType không được để trống khi ghi log thay đổi.");
            }
            if (entityId <= 0)
            {
                throw new BusinessException("EntityId phải là số nguyên dương hợp lệ.");
            }
            if (version <= 0)
            {
                throw new BusinessException("Version phải lớn hơn 0.");
            }
            // 2. Khởi tạo đối tượng ContentChange
            var contentChange = new ContentChange
            {
                EntityType = entityType.Trim(),
                EntityId = entityId,
                ChangeType = changeType,
                Version = version,
                ChangedAt = DateTime.UtcNow
            };
            // 3. Thêm vào DbContext và lưu xuống SQL Server
            _dbContext.ContentChanges.Add(contentChange);
            await _dbContext.SaveChangesAsync(cancellationToken);
            _logger.LogInformation($"Đã ghi nhận thay đổi ContentChange: Sequence={contentChange.Sequence}, Entity={contentChange.EntityType}#{contentChange.EntityId}, Type={contentChange.ChangeType}, Version={contentChange.Version}");
            return contentChange;
        }
    }
}

