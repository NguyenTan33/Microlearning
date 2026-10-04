using Microlearning.Areas.Media.DTOs;
using Microlearning.Exceptions;
using Microlearning.Infrastructure.Factory;

namespace Microlearning.Infrastructure.Validation.Media
{
    public class TtsSynthesizeTestValidationRule : IValidationRule<TtsSynthesizeTestRequest>
    {
        public Task ValidateAsync(TtsSynthesizeTestRequest request, CancellationToken cancellationToken = default)
        {
            if (request == null)
            {
                throw new BusinessException("Yêu cầu tổng hợp giọng đọc AI không được để trống.");
            }

            if (string.IsNullOrWhiteSpace(request.Text))
            {
                throw new BusinessException("Nội dung kịch bản cần đọc không được để trống.");
            }

            if (request.Text.Length > 2000)
            {
                throw new BusinessException("Nội dung kịch bản thử nghiệm không được vượt quá 2000 ký tự.");
            }

            return Task.CompletedTask;
        }
    }
}