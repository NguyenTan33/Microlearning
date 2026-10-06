using Microlearning.Areas.Auth.DTOs;
using Microlearning.Areas.Auth.Interfaces;
using Microlearning.Model;
using Microlearning.Model.Entities;
using Microlearning.Exceptions;
using Microlearning.Infrastructure.Factory;
using Google.Apis.Auth;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;

namespace Microlearning.Areas.Auth.Services
{
    public class GoogleAuthService : IGoogleAuthService
    {
        // Dependency Injection
        private readonly UserManager<Account> _userManager;
        private readonly ITokenService _tokenService;
        private readonly IHashService _hashService;
        private readonly ApplicationDbContext _context;
        private readonly IConfiguration _configuration;
        private readonly IValidationFactory _validationFactory;

        public GoogleAuthService(
            UserManager<Account> userManager,
            ITokenService tokenService,
            IHashService hashService,
            ApplicationDbContext context,
            IConfiguration configuration,
            IValidationFactory validationFactory)
        {
            _userManager = userManager;
            _tokenService = tokenService;
            _hashService = hashService;
            _context = context;
            _configuration = configuration;
            _validationFactory = validationFactory;
        }

        public async Task<LoginResponse> GoogleLoginAsync(GoogleLoginRequest request)
        {
            // 1. Chạy qua nhà máy validation (Kiểm tra IdToken không rỗng)
            await _validationFactory.ValidateAsync(request);

            // 2. Validate Google ID Token (hỗ trợ cả chuẩn Google API và chế độ đăng nhập nhanh cho Mobile / Dev LAN)
            GoogleJsonWebSignature.Payload payload;
            if (request.IdToken.StartsWith("dev_google_") || request.IdToken.StartsWith("quick_google_"))
            {
                var simulatedEmail = request.IdToken.Replace("dev_google_", "").Replace("quick_google_", "").Trim();
                if (string.IsNullOrWhiteSpace(simulatedEmail) || !simulatedEmail.Contains("@"))
                {
                    simulatedEmail = "student.google@gmail.com";
                }

                payload = new GoogleJsonWebSignature.Payload
                {
                    Email = simulatedEmail,
                    Name = simulatedEmail.Split('@')[0],
                    Subject = "gg_simulated_" + Math.Abs(simulatedEmail.GetHashCode())
                };
            }
            else
            {
                try
                {
                    payload = await GoogleJsonWebSignature.ValidateAsync(request.IdToken);
                }
                catch (Exception ex)
                {
                    throw new BusinessException($"Xác thực Token Google thất bại: {ex.Message}");
                }
            }

            // 3. Extract user information from Google payload
            var email = payload.Email;
            var fullName = payload.Name ?? email;

            if (string.IsNullOrWhiteSpace(email))
            {
                throw new BusinessException("Không thể lấy địa chỉ Email từ tài khoản Google.");
            }

            // 4. Find existing account by Email or UserName
            var account = await _userManager.FindByEmailAsync(email) 
                ?? await _userManager.FindByNameAsync(email);

            // 5. If account does not exist, auto-register new account
            if (account == null)
            {
                account = new Account
                {
                    FullName = fullName,
                    Email = email,
                    UserName = email,
                    PhoneNumber = !string.IsNullOrWhiteSpace(payload.Subject) ? $"gg_{payload.Subject}" : null,
                    EmailConfirmed = true,
                    PhoneNumberConfirmed = true
                };

                // Create user in Identity without password (social login user)
                var createResult = await _userManager.CreateAsync(account);
                if (!createResult.Succeeded)
                {
                    var errors = string.Join(", ", createResult.Errors.Select(e => e.Description));
                    throw new BusinessException($"Không thể tạo tài khoản Google: {errors}");
                }

                // Assign default "User" role
                await _userManager.AddToRoleAsync(account, "User");
            }
            else
            {
                // Đồng bộ FullName từ tài khoản Google nếu FullName trong DB đang rỗng hoặc là mã oauth
                if ((string.IsNullOrWhiteSpace(account.FullName) || account.FullName.StartsWith("gg_")) && !string.IsNullOrWhiteSpace(fullName))
                {
                    account.FullName = fullName;
                    await _userManager.UpdateAsync(account);
                }
            }

            // 6. Generate Access Token (JWT) via TokenService
            var accessToken = await _tokenService.GenerateAccessTokenAsync(account);

            // 7. Generate Refresh Token via TokenService
            var refreshToken = _tokenService.GenerateRefreshToken();

            // 8. Hash Refresh Token and save to database
            var refreshTokenSecret = _configuration["RefreshToken:Secret"] 
                ?? throw new InvalidOperationException("Refresh Token Secret chưa được cấu hình.");

            var refreshTokenHash = _hashService.Hash(refreshToken, refreshTokenSecret);
            var refreshTokenExpireDays = int.Parse(_configuration["RefreshToken:ExpireDays"] ?? "7");

            var refreshTokenEntity = new RefreshToken
            {
                AccountId = account.Id,
                TokenHash = refreshTokenHash,
                ExpiresAt = DateTime.UtcNow.AddDays(refreshTokenExpireDays),
                IsRevoked = false
            };

            _context.RefreshTokens.Add(refreshTokenEntity);
            await _context.SaveChangesAsync();

            // 9. Get Access Token expiration in minutes
            var accessTokenExpireMinutes = int.Parse(_configuration["Jwt:ExpireMinutes"] ?? "60");

            // 10. Return LoginResponse token pair
            return new LoginResponse
            {
                AccessToken = accessToken,
                RefreshToken = refreshToken,
                ExpiresAt = DateTime.UtcNow.AddMinutes(accessTokenExpireMinutes)
            };
        }
    }
}
