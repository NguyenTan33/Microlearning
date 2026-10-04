using Microlearning.Areas.Sync.DTOs;
using Microlearning.Exceptions;
using Microlearning.Infrastructure.Factory;

namespace Microlearning.Infrastructure.Validation.Sync
{
    public class SyncPullValidationRule : IValidationRule<SyncPullRequest>
    {
        public Task ValidateAsync(SyncPullRequest request, CancellationToken cancellationToken = default)
        {
            if (request == null)
            {
                throw new BusinessException("Yêu cầu kéo dữ liệu (SyncPullRequest) không được để trống.");
            }

            if (request.AfterSequence < 0)
            {
                throw new BusinessException("Mốc Sequence (AfterSequence) phải lớn hơn hoặc bằng 0.");
            }

            if (request.Limit <= 0 || request.Limit > 100)
            {
                throw new BusinessException("Số lượng bản ghi yêu cầu (Limit) phải nằm trong khoảng từ 1 đến 100.");
            }

            return Task.CompletedTask;
        }
    }
}