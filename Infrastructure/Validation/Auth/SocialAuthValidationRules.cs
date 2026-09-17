using Microlearning.Areas.Auth.DTOs;
using Microlearning.Exceptions;
using Microlearning.Infrastructure.Factory;

namespace Microlearning.Infrastructure.Validation.Auth
{
    public class GoogleLoginValidationRule : IValidationRule<GoogleLoginRequest>
    {
        public Task ValidateAsync(GoogleLoginRequest request, CancellationToken ct = default)
        {
            if (request == null)
                throw new BusinessException("Dữ liệu đăng nhập Google không được để trống.");

            if (string.IsNullOrWhiteSpace(request.IdToken))
                throw new BusinessException("IdToken Google không được để trống.");

            return Task.CompletedTask;
        }
    }

    public class FacebookLoginValidationRule : IValidationRule<FacebookLoginRequest>
    {
        public Task ValidateAsync(FacebookLoginRequest request, CancellationToken ct = default)
        {
            if (request == null)
                throw new BusinessException("Dữ liệu đăng nhập Facebook không được để trống.");

            if (string.IsNullOrWhiteSpace(request.AccessToken))
                throw new BusinessException("AccessToken Facebook không được để trống.");

            return Task.CompletedTask;
        }
    }
}
