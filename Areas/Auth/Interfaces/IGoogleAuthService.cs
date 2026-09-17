using Microlearning.Areas.Auth.DTOs;

namespace Microlearning.Areas.Auth.Interfaces
{
    public interface IGoogleAuthService
    {
        // Authenticate Google IdToken, auto-register account if not existing, return LoginResponse with tokens
        Task<LoginResponse> GoogleLoginAsync(GoogleLoginRequest request);
    }
}
