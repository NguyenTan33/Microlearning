using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using Microlearning.Areas.Auth.DTOs;
using Microlearning.Areas.Auth.Interfaces;

namespace Microlearning.Areas.Auth.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class AuthController : ControllerBase
    {
        // Dependency Injection
        private readonly IAuthenticationService _authenticationService;
        private readonly IOtpService _otpService;
        private readonly IPasswordService _passwordService;
        private readonly ITokenService _tokenService;
        private readonly IGoogleAuthService _googleAuthService;
        private readonly IFacebookAuthService _facebookAuthService;

        // Constructor
        public AuthController(
            IAuthenticationService authenticationService,
            IOtpService otpService,
            IPasswordService passwordService,
            ITokenService tokenService,
            IGoogleAuthService googleAuthService,
            IFacebookAuthService facebookAuthService)
        {
            _authenticationService = authenticationService;
            _otpService = otpService;
            _passwordService = passwordService;
            _tokenService = tokenService;
            _googleAuthService = googleAuthService;
            _facebookAuthService = facebookAuthService;
        }

        // REGISTER
        [AllowAnonymous]
        [EnableRateLimiting("AuthPolicy")]
        [HttpPost("register")]
        public async Task<IActionResult> Register(
            [FromBody] RegisterRequest request)
        {
            var response =
                await _authenticationService.RegisterAsync(request);

            return CreatedAtAction(
                nameof(Register),
                new { id = response.UserId },
                response);
        }

        // VERIFY REGISTER OTP
        [AllowAnonymous]
        [EnableRateLimiting("VerifyOtpPolicy")]
        [HttpPost("verify-otp")]
        public async Task<IActionResult> VerifyRegisterOtp(
            [FromBody] VerifyRegisterOtpRequest request)
        {
            var response =
                await _otpService.VerifyRegisterOtpAsync(request);

            return Ok(response);
        }

        // LOGIN
        [AllowAnonymous]
        [EnableRateLimiting("AuthPolicy")]
        [HttpPost("login")]
        public async Task<IActionResult> Login(
            [FromBody] LoginRequest request)
        {
            var response =
                await _authenticationService.LoginAsync(request);

            return Ok(response);
        }

        // GOOGLE LOGIN
        [AllowAnonymous]
        [EnableRateLimiting("AuthPolicy")]
        [HttpPost("google-login")]
        public async Task<IActionResult> GoogleLogin(
            [FromBody] GoogleLoginRequest request)
        {
            var response =
                await _googleAuthService.GoogleLoginAsync(request);

            return Ok(response);
        }

        // FACEBOOK LOGIN
        [AllowAnonymous]
        [EnableRateLimiting("AuthPolicy")]
        [HttpPost("facebook-login")]
        public async Task<IActionResult> FacebookLogin(
            [FromBody] FacebookLoginRequest request)
        {
            var response =
                await _facebookAuthService.FacebookLoginAsync(request);

            return Ok(response);
        }

        // OAUTH DEEP LINK CALLBACK
        [AllowAnonymous]
        [HttpGet("oauth-callback")]
        public ContentResult OAuthCallback()
        {
            var html = @"<!DOCTYPE html>
<html lang=""vi"">
<head>
  <meta charset=""utf-8"">
  <meta name=""viewport"" content=""width=device-width, initial-scale=1.0"">
  <title>MicroLearning OAuth</title>
  <style>
    body { background-color: #070B18; color: #F8FAFC; font-family: -apple-system, sans-serif; display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100vh; margin: 0; text-align: center; }
    .loader { width: 40px; height: 40px; border: 3px solid #1E293B; border-top-color: #6366F1; border-radius: 50%; animation: spin 0.8s linear infinite; margin-bottom: 20px; }
    @keyframes spin { to { transform: rotate(360deg); } }
    a.btn { display: inline-block; margin-top: 24px; padding: 12px 24px; background: #6366F1; color: #fff; text-decoration: none; border-radius: 12px; font-weight: 600; font-size: 15px; }
  </style>
</head>
<body>
  <div class=""loader""></div>
  <h2>Đang chuyển hướng về MicroLearning...</h2>
  <p style=""color: #94A3B8;"">Vui lòng đợi giây lát hoặc bấm nút bên dưới.</p>
  <div id=""action-container""></div>
  <script>
    (function() {
      var hash = window.location.hash ? window.location.hash.substring(1) : '';
      var search = window.location.search ? window.location.search.substring(1) : '';
      var queryParams = hash || search;
      var deepLink = 'microlearning://oauth-callback?' + queryParams;
      
      window.location.href = deepLink;

      setTimeout(function() {
        var container = document.getElementById('action-container');
        if (container) {
          container.innerHTML = '<a class=""btn"" href=""' + deepLink + '"">Mở Ứng Dụng MicroLearning</a>';
        }
      }, 1200);
    })();
  </script>
</body>
</html>";

            return Content(html, "text/html", System.Text.Encoding.UTF8);
        }

        // REFRESH TOKEN
        [AllowAnonymous]
        [EnableRateLimiting("AuthPolicy")]
        [HttpPost("refresh")]
        public async Task<IActionResult> RefreshToken(
            [FromBody] RefreshTokenRequest request)
        {
            var response =
                await _tokenService.RefreshTokenAsync(request);

            return Ok(response);
        }

        // LOGOUT
        [AllowAnonymous]
        [HttpPost("logout")]
        public async Task<IActionResult> Logout(
            [FromBody] LogoutRequest request)
        {
            await _authenticationService.LogoutAsync(request);

            return Ok(new
            {
                message = "Đăng xuất thành công."
            });
        }

        // FORGOT PASSWORD
        // SEND OTP
        [AllowAnonymous]
        [EnableRateLimiting("SendOtpPolicy")]
        [HttpPost("forgot-password")]
        public async Task<IActionResult> ForgotPassword(
            [FromBody] ForgotPasswordRequest request)
        {
            var response =
                await _passwordService.ForgotPasswordAsync(request);

            return Ok(response);
        }

        // VERIFY FORGOT PASSWORD OTP
        [AllowAnonymous]
        [EnableRateLimiting("VerifyOtpPolicy")]
        [HttpPost("verify-forgot-password-otp")]
        public async Task<IActionResult> VerifyForgotPasswordOtp(
            [FromBody] VerifyForgotPasswordOtpRequest request)
        {
            var response =
                await _otpService.VerifyForgotPasswordOtpAsync(request);

            return Ok(response);
        }

        // RESET PASSWORD
        [AllowAnonymous]
        [EnableRateLimiting("AuthPolicy")]
        [HttpPost("reset-password")]
        public async Task<IActionResult> ResetPassword(
            [FromBody] ResetPasswordRequest request)
        {
            await _passwordService.ResetPasswordAsync(request);

            return Ok(new
            {
                message = "Đặt lại mật khẩu thành công."
            });
        }

        // RESEND OTP
        [AllowAnonymous]
        [EnableRateLimiting("SendOtpPolicy")]
        [HttpPost("resend-otp")]
        public async Task<IActionResult> ResendOtp(
            [FromBody] ResendOtpRequest request)
        {
            var response =
                await _otpService.ResendOtpAsync(request);

            return Ok(response);
        }

        // CHANGE PASSWORD
        [Authorize]
        [EnableRateLimiting("AuthPolicy")]
        [HttpPost("change-password")]
        public async Task<IActionResult> ChangePassword(
            [FromBody] ChangePasswordRequest request)
        {
            // 1. Get AccountId from JWT
            var accountId =
                User.FindFirstValue(
                    ClaimTypes.NameIdentifier);

            // 2. Validate claim
            if (string.IsNullOrWhiteSpace(accountId))
            {
                return Unauthorized(new
                {
                    message = "Token không chứa thông tin tài khoản hợp lệ."
                });
            }

            // 3. Change password for the authenticated account
            await _passwordService.ChangePasswordAsync(accountId, request);

            // 4. Return success
            return Ok(new
            {
                message = "Đổi mật khẩu thành công."
            });
        }
    }
}