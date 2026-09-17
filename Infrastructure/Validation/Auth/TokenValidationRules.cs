using Microlearning.Areas.Auth.DTOs;
using Microlearning.Exceptions;
using Microlearning.Infrastructure.Factory;

namespace Microlearning.Infrastructure.Validation.Auth
{
    public class RefreshTokenValidationRule : IValidationRule<RefreshTokenRequest>
    {
        public Task ValidateAsync(RefreshTokenRequest request, CancellationToken ct = default)
        {
            if (request == null)
                throw new BusinessException("Dữ liệu làm mới token không được để trống.");

            if (string.IsNullOrWhiteSpace(request.RefreshToken))
                throw new BusinessException("Refresh Token không hợp lệ.");

            return Task.CompletedTask;
        }
    }

    public class LogoutValidationRule : IValidationRule<LogoutRequest>
    {
        public Task ValidateAsync(LogoutRequest request, CancellationToken ct = default)
        {
            if (request == null)
                throw new BusinessException("Dữ liệu đăng xuất không được để trống.");

            if (string.IsNullOrWhiteSpace(request.RefreshToken))
                throw new BusinessException("Refresh Token không hợp lệ.");

            return Task.CompletedTask;
        }
    }
}
