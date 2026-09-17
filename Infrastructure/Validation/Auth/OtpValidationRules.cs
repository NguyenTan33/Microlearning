using fnb_pos_inventory_system.Areas.Auth.DTOs;
using fnb_pos_inventory_system.Areas.Auth.Services.Interfaces;
using fnb_pos_inventory_system.Exceptions;
using fnb_pos_inventory_system.Infrastructure.Factory;

namespace fnb_pos_inventory_system.Infrastructure.Validation.Auth
{
    public class VerifyRegisterOtpValidationRule : IValidationRule<VerifyRegisterOtpRequest>
    {
        private readonly IPhoneService _phoneService;

        public VerifyRegisterOtpValidationRule(IPhoneService phoneService)
        {
            _phoneService = phoneService;
        }

        public Task ValidateAsync(VerifyRegisterOtpRequest request, CancellationToken ct = default)
        {
            if (request == null)
                throw new BusinessException("Dữ liệu xác thực OTP không được để trống.");

            if (string.IsNullOrWhiteSpace(request.PhoneNumber))
                throw new BusinessException("Số điện thoại không được để trống.");

            var normalizedPhone = _phoneService.Normalize(request.PhoneNumber);
            if (!_phoneService.IsValid(normalizedPhone))
                throw new BusinessException("Số điện thoại không hợp lệ.");

            if (string.IsNullOrWhiteSpace(request.Otp) || request.Otp.Length != 6)
                throw new BusinessException("Mã OTP phải gồm 6 chữ số.");

            return Task.CompletedTask;
        }
    }

    public class VerifyForgotPasswordOtpValidationRule : IValidationRule<VerifyForgotPasswordOtpRequest>
    {
        private readonly IPhoneService _phoneService;

        public VerifyForgotPasswordOtpValidationRule(IPhoneService phoneService)
        {
            _phoneService = phoneService;
        }

        public Task ValidateAsync(VerifyForgotPasswordOtpRequest request, CancellationToken ct = default)
        {
            if (request == null)
                throw new BusinessException("Dữ liệu xác thực OTP không được để trống.");

            if (string.IsNullOrWhiteSpace(request.PhoneNumber))
                throw new BusinessException("Số điện thoại không được để trống.");

            var normalizedPhone = _phoneService.Normalize(request.PhoneNumber);
            if (!_phoneService.IsValid(normalizedPhone))
                throw new BusinessException("Số điện thoại không hợp lệ.");

            if (string.IsNullOrWhiteSpace(request.Otp) || request.Otp.Length != 6)
                throw new BusinessException("Mã OTP phải gồm 6 chữ số.");

            return Task.CompletedTask;
        }
    }

    public class ResendOtpValidationRule : IValidationRule<ResendOtpRequest>
    {
        private readonly IPhoneService _phoneService;

        public ResendOtpValidationRule(IPhoneService phoneService)
        {
            _phoneService = phoneService;
        }

        public Task ValidateAsync(ResendOtpRequest request, CancellationToken ct = default)
        {
            if (request == null)
                throw new BusinessException("Dữ liệu gửi lại OTP không được để trống.");

            if (string.IsNullOrWhiteSpace(request.PhoneNumber))
                throw new BusinessException("Số điện thoại không được để trống.");

            var normalizedPhone = _phoneService.Normalize(request.PhoneNumber);
            if (!_phoneService.IsValid(normalizedPhone))
                throw new BusinessException("Số điện thoại không hợp lệ.");

            if (string.IsNullOrWhiteSpace(request.Purpose) || (request.Purpose != "Register" && request.Purpose != "ForgotPassword"))
                throw new BusinessException("Mục đích OTP không hợp lệ (Chỉ chấp nhận 'Register' hoặc 'ForgotPassword').");

            return Task.CompletedTask;
        }
    }
}
