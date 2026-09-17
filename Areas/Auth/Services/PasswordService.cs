using Microlearning.Areas.Auth.DTOs;
using Microlearning.Areas.Auth.Interfaces;
using Microlearning.Model.Entities;
using Microlearning.Exceptions;
using Microlearning.Infrastructure.Factory;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;

namespace Microlearning.Areas.Auth.Services
{
    public class PasswordService : IPasswordService
    {
        // Dependency Injection
        private readonly UserManager<Account> _userManager;
        private readonly IPhoneService _phoneService;
        private readonly IOtpService _otpService;
        private readonly IValidationFactory _validationFactory;

        public PasswordService(
            UserManager<Account> userManager,
            IPhoneService phoneService,
            IOtpService otpService,
            IValidationFactory validationFactory)
        {
            _userManager = userManager;
            _phoneService = phoneService;
            _otpService = otpService;
            _validationFactory = validationFactory;
        }

        public async Task<ForgotPasswordResponse> ForgotPasswordAsync(ForgotPasswordRequest request)
        {
            // 1. Chạy qua nhà máy validation (Format SĐT)
            await _validationFactory.ValidateAsync(request);

            var phoneNumber = _phoneService.Normalize(request.PhoneNumber);

            // 2. Find account by phone number
            var account = await _userManager.Users.FirstOrDefaultAsync(x => x.PhoneNumber == phoneNumber);

            if (account == null)
            {
                return new ForgotPasswordResponse
                {
                    Message = "Nếu số điện thoại được đăng ký, mã xác thực sẽ được gửi.",
                    Otp = string.Empty
                };
            }

            // 3. Generate and send Forgot Password OTP using OtpService
            var otp = await _otpService.SendForgotPasswordOtpAsync(phoneNumber);

            // 4. Return response (including plain OTP for testing)
            return new ForgotPasswordResponse
            {
                Message = "Nếu số điện thoại được đăng ký, mã xác thực sẽ được gửi.",
                Otp = otp
            };
        }

        public async Task ResetPasswordAsync(ResetPasswordRequest request)
        {
            // 1. Chạy qua nhà máy validation (Format SĐT, ResetToken, NewPassword độ dài/khớp)
            await _validationFactory.ValidateAsync(request);

            var phoneNumber = _phoneService.Normalize(request.PhoneNumber);

            // 2. Find account by phone number
            var account = await _userManager.Users.FirstOrDefaultAsync(x => x.PhoneNumber == phoneNumber);

            if (account == null)
            {
                throw new BusinessException("Yêu cầu đặt lại mật khẩu không hợp lệ.");
            }

            // 3. Reset password using ASP.NET Core Identity
            var result = await _userManager.ResetPasswordAsync(account, request.ResetToken, request.NewPassword);

            // 4. Check result
            if (!result.Succeeded)
            {
                var errors = string.Join(", ", result.Errors.Select(e => e.Description));
                throw new BusinessException(errors);
            }
        }

        public async Task ChangePasswordAsync(string accountId, ChangePasswordRequest request)
        {
            if (string.IsNullOrWhiteSpace(accountId))
            {
                throw new BusinessException("Mã tài khoản không hợp lệ.");
            }

            // 1. Chạy qua nhà máy validation (Mật khẩu cũ/mới, xác nhận mật khẩu, độ dài >= 6, không trùng mật khẩu cũ)
            await _validationFactory.ValidateAsync(request);

            // 2. Find account by Id (extracted from JWT Claims)
            var account = await _userManager.FindByIdAsync(accountId);

            if (account == null)
            {
                throw new BusinessException("Tài khoản không tồn tại.");
            }

            // 3. Change password using Identity
            var result = await _userManager.ChangePasswordAsync(account, request.CurrentPassword, request.NewPassword);

            // 4. Check result
            if (!result.Succeeded)
            {
                var errors = string.Join(", ", result.Errors.Select(e => e.Description));
                throw new BusinessException(errors);
            }
        }
    }
}
