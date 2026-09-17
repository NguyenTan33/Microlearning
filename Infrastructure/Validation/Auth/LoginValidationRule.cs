using Microlearning.Areas.Auth.DTOs;
using Microlearning.Areas.Auth.Interfaces;
using Microlearning.Exceptions;
using Microlearning.Infrastructure.Factory;

namespace Microlearning.Infrastructure.Validation.Auth
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
