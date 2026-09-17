using fnb_pos_inventory_system.Areas.Auth.DTOs;
using fnb_pos_inventory_system.Areas.Auth.Services.Interfaces;
using fnb_pos_inventory_system.Exceptions;
using fnb_pos_inventory_system.Infrastructure.Factory;

namespace fnb_pos_inventory_system.Infrastructure.Validation.Auth
{
    public class ForgotPasswordValidationRule : IValidationRule<ForgotPasswordRequest>
    {
        private readonly IPhoneService _phoneService;

        public ForgotPasswordValidationRule(IPhoneService phoneService)
        {
            _phoneService = phoneService;
        }

        public Task ValidateAsync(ForgotPasswordRequest request, CancellationToken ct = default)
        {
            if (request == null)
                throw new BusinessException("Dữ liệu quên mật khẩu không được để trống.");

            if (string.IsNullOrWhiteSpace(request.PhoneNumber))
                throw new BusinessException("Số điện thoại không được để trống.");

            var normalizedPhone = _phoneService.Normalize(request.PhoneNumber);
            if (!_phoneService.IsValid(normalizedPhone))
                throw new BusinessException("Số điện thoại không hợp lệ.");

            return Task.CompletedTask;
        }
    }

    public class ResetPasswordValidationRule : IValidationRule<ResetPasswordRequest>
    {
        private readonly IPhoneService _phoneService;

        public ResetPasswordValidationRule(IPhoneService phoneService)
        {
            _phoneService = phoneService;
        }

        public Task ValidateAsync(ResetPasswordRequest request, CancellationToken ct = default)
        {
            if (request == null)
                throw new BusinessException("Dữ liệu đặt lại mật khẩu không được để trống.");

            if (string.IsNullOrWhiteSpace(request.PhoneNumber))
                throw new BusinessException("Số điện thoại không được để trống.");

            var normalizedPhone = _phoneService.Normalize(request.PhoneNumber);
            if (!_phoneService.IsValid(normalizedPhone))
                throw new BusinessException("Số điện thoại không hợp lệ.");

            if (string.IsNullOrWhiteSpace(request.ResetToken))
                throw new BusinessException("Reset Token không hợp lệ.");

            if (string.IsNullOrWhiteSpace(request.NewPassword) || request.NewPassword.Length < 6)
                throw new BusinessException("Mật khẩu mới phải có độ dài tối thiểu 6 ký tự.");

            if (!string.IsNullOrEmpty(request.ConfirmNewPassword) && request.NewPassword != request.ConfirmNewPassword)
                throw new BusinessException("Mật khẩu xác nhận không khớp.");

            return Task.CompletedTask;
        }
    }

    public class ChangePasswordValidationRule : IValidationRule<ChangePasswordRequest>
    {
        public Task ValidateAsync(ChangePasswordRequest request, CancellationToken ct = default)
        {
            if (request == null)
                throw new BusinessException("Dữ liệu đổi mật khẩu không được để trống.");

            if (string.IsNullOrWhiteSpace(request.CurrentPassword))
                throw new BusinessException("Mật khẩu hiện tại không được để trống.");

            if (string.IsNullOrWhiteSpace(request.NewPassword) || request.NewPassword.Length < 6)
                throw new BusinessException("Mật khẩu mới phải có độ dài tối thiểu 6 ký tự.");

            if (!string.IsNullOrEmpty(request.ConfirmNewPassword) && request.NewPassword != request.ConfirmNewPassword)
                throw new BusinessException("Mật khẩu xác nhận không khớp.");

            if (request.NewPassword == request.CurrentPassword)
                throw new BusinessException("Mật khẩu mới không được trùng với mật khẩu hiện tại.");

            return Task.CompletedTask;
        }
    }
}
