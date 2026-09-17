using Microlearning.Areas.Auth.DTOs;

namespace Microlearning.Areas.Auth.Interfaces
{

    public interface IAuthenticationService
    {
        // Register new account and send OTP
        Task<RegisterResponse> RegisterAsync(RegisterRequest request);

        // Login with phone number and password
        Task<LoginResponse> LoginAsync(LoginRequest request);

        // Logout and revoke Refresh Token
        Task LogoutAsync(LogoutRequest request);
    }
}