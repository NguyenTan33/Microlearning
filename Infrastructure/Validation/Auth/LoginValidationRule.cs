using fnb_pos_inventory_system.Areas.Auth.DTOs;
using fnb_pos_inventory_system.Areas.Auth.Services.Interfaces;
using fnb_pos_inventory_system.Exceptions;
using fnb_pos_inventory_system.Infrastructure.Factory;

namespace fnb_pos_inventory_system.Infrastructure.Validation.Auth
{
    public class LoginValidationRule : IValidationRule<LoginRequest>
    {
        private readonly IPhoneService _phoneService;

        public LoginValidationRule(IPhoneService phoneService)
        {
            _phoneService = phoneService;
        }

        public Task ValidateAsync(LoginRequest request, CancellationToken ct = default)
        {
            if (request == null)
                throw new BusinessException("Dữ liệu đăng nhập không được để trống.");

            if (string.IsNullOrWhiteSpace(request.PhoneNumber))
                throw new BusinessException("Số điện thoại không được để trống.");

            var normalizedPhone = _phoneService.Normalize(request.PhoneNumber);
            if (!_phoneService.IsValid(normalizedPhone))
                throw new BusinessException("Số điện thoại không hợp lệ.");

            if (string.IsNullOrWhiteSpace(request.Password))
                throw new BusinessException("Mật khẩu không được để trống.");

            return Task.CompletedTask;
        }
    }
}
