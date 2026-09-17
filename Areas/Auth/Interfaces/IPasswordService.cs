using Microlearning.Areas.Auth.DTOs;
namespace Microlearning.Areas.Auth.Interfaces
{

    public interface IPasswordService
    {
        // Process forgot password request and send OTP
        Task<ForgotPasswordResponse> ForgotPasswordAsync(ForgotPasswordRequest request);

        // Reset password using Identity Reset Token after OTP verification
        Task ResetPasswordAsync(ResetPasswordRequest request);

        // Change password for logged-in account using accountId extracted from JWT Token Claims
        Task ChangePasswordAsync(string accountId, ChangePasswordRequest request);
    }
}
