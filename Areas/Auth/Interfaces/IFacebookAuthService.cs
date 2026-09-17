using Microlearning.Areas.Auth.DTOs;

namespace Microlearning.Areas.Auth.Interfaces
{
    public interface IFacebookAuthService
    {
        // Authenticate Facebook AccessToken, auto-register account if not existing, return LoginResponse
        Task<LoginResponse> FacebookLoginAsync(FacebookLoginRequest request);
    }
}
