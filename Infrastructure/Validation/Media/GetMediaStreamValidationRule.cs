using Microlearning.Areas.Media.DTOs;
using Microlearning.Exceptions;
using Microlearning.Infrastructure.Factory;

namespace Microlearning.Infrastructure.Validation.Media
{
    public class GetMediaStreamValidationRule : IValidationRule<GetMediaStreamRequest>
    {
        public Task ValidateAsync(GetMediaStreamRequest request, CancellationToken cancellationToken = default)
        {
            if (request == null)
            {
                throw new BusinessException("Yêu cầu phát video không được để trống.");
            }

            if (request.MediaId <= 0)
            {
                throw new BusinessException("Mã tệp video (MediaId) phải là số nguyên dương hợp lệ.");
            }

            return Task.CompletedTask;
        }
    }
}