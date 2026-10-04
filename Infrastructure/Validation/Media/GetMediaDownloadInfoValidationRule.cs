using Microlearning.Areas.Media.DTOs;
using Microlearning.Exceptions;
using Microlearning.Infrastructure.Factory;


namespace Microlearning.Infrastructure.Validation.Media
{
    public class GetMediaDownloadInfoValidationRule : IValidationRule<GetMediaDownloadInfoRequest>
    {
        public Task ValidateAsync(GetMediaDownloadInfoRequest request, CancellationToken cancellationToken = default)
        {
            if (request == null)
            {
                throw new BusinessException("Yêu cầu lấy thông tin tải video không được để trống.");
            }

            if (request.MediaId <= 0)
            {
                throw new BusinessException("Mã tệp video (MediaId) phải là số nguyên dương hợp lệ.");
            }

            if (string.IsNullOrWhiteSpace(request.BaseUrl))
            {
                throw new BusinessException("Đường dẫn máy chủ (BaseUrl) không được để trống.");
            }

            // Kiểm tra format Url hợp lệ (phải bắt đầu bằng http:// hoặc https://)
            if (!Uri.TryCreate(request.BaseUrl, UriKind.Absolute, out var uriResult) ||
                (uriResult.Scheme != Uri.UriSchemeHttp && uriResult.Scheme != Uri.UriSchemeHttps))
            {
                throw new BusinessException("Đường dẫn máy chủ (BaseUrl) không đúng định dạng HTTP/HTTPS.");
            }

            return Task.CompletedTask;
        }
    }
}