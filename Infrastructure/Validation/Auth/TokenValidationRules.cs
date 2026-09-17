using fnb_pos_inventory_system.Areas.Auth.DTOs;
using fnb_pos_inventory_system.Exceptions;
using fnb_pos_inventory_system.Infrastructure.Factory;

namespace fnb_pos_inventory_system.Infrastructure.Validation.Auth
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
