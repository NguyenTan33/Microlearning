using Microlearning.Areas.Auth.DTOs;
using Microlearning.Areas.Auth.Interfaces;
using Microlearning.Model;
using Microlearning.Model.Entities;
using Microlearning.Exceptions;
using Microlearning.Infrastructure.Factory;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;

namespace Microlearning.Areas.Auth.Services
{
    public class AuthenticationService : IAuthenticationService
    {
        // Dependency Injection
        private readonly UserManager<Account> _userManager;
        private readonly IPhoneService _phoneService;
        private readonly IOtpService _otpService;
        private readonly ITokenService _tokenService;
        private readonly IHashService _hashService;
        private readonly ApplicationDbContext _context;
        private readonly IConfiguration _configuration;
        private readonly IValidationFactory _validationFactory;

        public AuthenticationService(
            UserManager<Account> userManager,
            IPhoneService phoneService,
            IOtpService otpService,
            ITokenService tokenService,
            IHashService hashService,
            ApplicationDbContext context,
            IConfiguration configuration,
            IValidationFactory validationFactory)
        {
            _userManager = userManager;
            _phoneService = phoneService;
            _otpService = otpService;
            _tokenService = tokenService;
            _hashService = hashService;
            _context = context;
            _configuration = configuration;
            _validationFactory = validationFactory;
        }

        public async Task<RegisterResponse> RegisterAsync(RegisterRequest request)
        {
            // 1. Chạy qua nhà máy validation (Format SĐT, độ mạnh mật khẩu, trùng SĐT)
            await _validationFactory.ValidateAsync(request);

            var phoneNumber = _phoneService.Normalize(request.PhoneNumber);

            // 2. Create account entity
            var account = new Account
            {
                FullName = request.FullName,
                PhoneNumber = phoneNumber,
                UserName = phoneNumber,
                PhoneNumberConfirmed = false
            };

            // 3. Create account using ASP.NET Core Identity
            var result = await _userManager.CreateAsync(account, request.Password);

            if (!result.Succeeded)
            {
                var errors = string.Join(", ", result.Errors.Select(e => e.Description));
                throw new BusinessException(errors);
            }

            // 4. Assign default "User" role
            var roleResult = await _userManager.AddToRoleAsync(account, "User");

            if (!roleResult.Succeeded)
            {
                var errors = string.Join(", ", roleResult.Errors.Select(e => e.Description));
                throw new BusinessException(errors);
            }

            // 5. Generate and send Register OTP via OtpService
            var otp = await _otpService.SendRegisterOtpAsync(phoneNumber);

            // 6. Return registration response (including plain OTP for testing)
            return new RegisterResponse
            {
                Message = $"Đăng ký thành công. Mã OTP là: {otp}",
                UserId = account.Id
            };
        }

        public async Task<LoginResponse> LoginAsync(LoginRequest request)
        {
            // 1. Chạy qua nhà máy validation (Format SĐT, mật khẩu không rỗng)
            await _validationFactory.ValidateAsync(request);

            var phoneNumber = _phoneService.Normalize(request.PhoneNumber);

            // 2. Find account by phone number
            var account = await _userManager.Users.FirstOrDefaultAsync(x => x.PhoneNumber == phoneNumber);

            if (account == null)
            {
                throw new BusinessException("Số điện thoại hoặc mật khẩu không chính xác.");
            }

            // 3. Check phone number confirmation status
            if (!account.PhoneNumberConfirmed)
            {
                throw new BusinessException("Số điện thoại chưa được xác thực.");
            }

            // 4. Validate password using Identity
            var isPasswordValid = await _userManager.CheckPasswordAsync(account, request.Password);

            if (!isPasswordValid)
            {
                throw new BusinessException("Số điện thoại hoặc mật khẩu không chính xác.");
            }

            // 5. Generate Access Token (JWT) via TokenService
            var accessToken = await _tokenService.GenerateAccessTokenAsync(account);

            // 6. Generate Refresh Token via TokenService
            var refreshToken = _tokenService.GenerateRefreshToken();

            // 7. Get Refresh Token secret key and hash it
            var refreshTokenSecret = _configuration["RefreshToken:Secret"]
                ?? throw new InvalidOperationException("Refresh Token Secret chưa được cấu hình.");

            var refreshTokenHash = _hashService.Hash(refreshToken, refreshTokenSecret);

            // 8. Save Refresh Token record to database
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

            // 9. Get Access Token expiration time in minutes
            var accessTokenExpireMinutes = int.Parse(_configuration["Jwt:ExpireMinutes"] ?? "60");

            // 10. Return LoginResponse with token pair
            return new LoginResponse
            {
                AccessToken = accessToken,
                RefreshToken = refreshToken,
                ExpiresAt = DateTime.UtcNow.AddMinutes(accessTokenExpireMinutes)
            };
        }

        public async Task LogoutAsync(LogoutRequest request)
        {
            // 1. Chạy qua nhà máy validation (Kiểm tra Refresh Token không rỗng)
            await _validationFactory.ValidateAsync(request);

            // 2. Get Refresh Token secret key
            var refreshTokenSecret = _configuration["RefreshToken:Secret"]
                ?? throw new InvalidOperationException("Refresh Token Secret chưa được cấu hình.");

            // 3. Compute Hash of provided Refresh Token
            var refreshTokenHash = _hashService.Hash(request.RefreshToken, refreshTokenSecret);

            // 4. Query Refresh Token from database
            var storedRefreshToken = await _context.RefreshTokens
                .FirstOrDefaultAsync(x => x.TokenHash == refreshTokenHash);

            if (storedRefreshToken == null)
            {
                throw new BusinessException("Refresh Token không hợp lệ.");
            }

            // 5. Check if already revoked
            if (storedRefreshToken.IsRevoked)
            {
                throw new BusinessException("Refresh Token đã bị thu hồi.");
            }

            // 6. Revoke Refresh Token
            storedRefreshToken.IsRevoked = true;
            storedRefreshToken.RevokedAt = DateTime.UtcNow;

            // 7. Save changes to database
            await _context.SaveChangesAsync();
        }
    }
}
