using Microlearning.Areas.Auth.DTOs;
using Microlearning.Areas.Auth.Interfaces;
using Microlearning.Model;
using Microlearning.Model.Entities;
using Microlearning.Exceptions;
using Microlearning.Infrastructure.Factory;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using System.Security.Cryptography;

namespace Microlearning.Areas.Auth.Services;

public class OtpService : IOtpService
{
    private readonly ApplicationDbContext _context;
    private readonly IHashService _hashService;
    private readonly IPhoneService _phoneService;
    private readonly ISmsService _smsService;
    private readonly UserManager<Account> _userManager;
    private readonly IConfiguration _configuration;
    private readonly IValidationFactory _validationFactory;

    public OtpService(
        ApplicationDbContext context,
        IHashService hashService,
        IPhoneService phoneService,
        ISmsService smsService,
        UserManager<Account> userManager,
        IConfiguration configuration,
        IValidationFactory validationFactory)
    {
        _context = context;
        _hashService = hashService;
        _phoneService = phoneService;
        _smsService = smsService;
        _userManager = userManager;
        _configuration = configuration;
        _validationFactory = validationFactory;
    }

    // Helper: Get OTP Secret from configuration
    private string GetOtpSecret() =>
        _configuration["Otp:Secret"] ?? throw new InvalidOperationException("OTP Secret chưa được cấu hình.");

    // Helper: Generate 6-digit OTP and save to database
    public async Task<string> GenerateAndSaveOtpAsync(string phoneNumber, string purpose)
    {
        // 1. Generate random 6-digit OTP using CSPRNG
        var otp = RandomNumberGenerator.GetInt32(100000, 1000000).ToString();

        // 2. Hash OTP before storing
        var otpHash = _hashService.Hash(otp, GetOtpSecret());

        // 3. Create OtpVerification entity
        var otpVerification = new OtpVerification
        {
            PhoneNumber = phoneNumber,
            OtpHash = otpHash,
            ExpiresAt = DateTime.UtcNow.AddMinutes(5),
            FailedAttempts = 0,
            IsUsed = false,
            Purpose = purpose
        };

        // 4. Save to database
        _context.OtpVerifications.Add(otpVerification);
        await _context.SaveChangesAsync();

        return otp;
    }

    // Helper: Validate OTP code against database record
    public async Task ValidateOtpAsync(string phoneNumber, string otp, string purpose)
    {
        // 1. Query latest unused OTP for phone number & purpose
        var otpVerification = await _context.OtpVerifications
            .Where(x => x.PhoneNumber == phoneNumber && !x.IsUsed && x.Purpose == purpose)
            .OrderByDescending(x => x.CreatedAt)
            .FirstOrDefaultAsync();

        if (otpVerification == null)
            throw new BusinessException("Mã OTP không tồn tại hoặc đã được sử dụng.");

        // 2. Check expiration
        if (DateTime.UtcNow > otpVerification.ExpiresAt)
            throw new BusinessException("Mã OTP đã hết hạn.");

        // 3. Check failed attempts limit
        if (otpVerification.FailedAttempts >= 5)
            throw new BusinessException("Mã OTP đã bị khóa do nhập sai quá nhiều lần.");

        // 4. Verify OTP hash
        if (!_hashService.Verify(otp, otpVerification.OtpHash, GetOtpSecret()))
        {
            otpVerification.FailedAttempts++;
            await _context.SaveChangesAsync();
            throw new BusinessException("Mã OTP không hợp lệ.");
        }

        // 5. Mark OTP as used
        otpVerification.IsUsed = true;
        await _context.SaveChangesAsync();
    }

    // Helper: Invalidate all active OTPs for phone number & purpose
    public async Task InvalidateActiveOtpsAsync(string phoneNumber, string purpose)
    {
        var oldOtps = await _context.OtpVerifications
            .Where(x => x.PhoneNumber == phoneNumber && x.Purpose == purpose && !x.IsUsed)
            .ToListAsync();

        foreach (var item in oldOtps)
        {
            item.IsUsed = true;
        }

        if (oldOtps.Any())
        {
            await _context.SaveChangesAsync();
        }
    }

    // Helper: Check cooldown time between OTP requests
    public async Task CheckCooldownAsync(string phoneNumber, string purpose, int cooldownSeconds = 60)
    {
        var latestOtp = await _context.OtpVerifications
            .Where(x => x.PhoneNumber == phoneNumber && x.Purpose == purpose)
            .OrderByDescending(x => x.CreatedAt)
            .FirstOrDefaultAsync();

        if (latestOtp != null && DateTime.UtcNow < latestOtp.CreatedAt.AddSeconds(cooldownSeconds))
        {
            throw new BusinessException($"Vui lòng chờ {cooldownSeconds} giây trước khi gửi lại OTP.");
        }
    }

    public async Task<string> SendRegisterOtpAsync(string phoneNumber)
    {
        var normalizedPhone = _phoneService.Normalize(phoneNumber);

        if (!_phoneService.IsValid(normalizedPhone))
        {
            throw new BusinessException("Số điện thoại không hợp lệ.");
        }

        await CheckCooldownAsync(normalizedPhone, "Register", 60);
        await InvalidateActiveOtpsAsync(normalizedPhone, "Register");

        var otp = await GenerateAndSaveOtpAsync(normalizedPhone, "Register");
        await _smsService.SendOtpAsync(normalizedPhone, otp);

        return otp;
    }

    public async Task<VerifyRegisterOtpResponse> VerifyRegisterOtpAsync(VerifyRegisterOtpRequest request)
    {
        // 1. Chạy qua nhà máy validation (Format SĐT, OTP đúng 6 ký tự số)
        await _validationFactory.ValidateAsync(request);

        var phoneNumber = _phoneService.Normalize(request.PhoneNumber);

        // 2. Validate OTP code from DB
        await ValidateOtpAsync(phoneNumber, request.Otp, "Register");

        // 3. Find account by phone number
        var account = await _userManager.Users.FirstOrDefaultAsync(x => x.PhoneNumber == phoneNumber);

        if (account == null)
        {
            throw new BusinessException("Tài khoản không tồn tại.");
        }

        // 4. Confirm phone number
        account.PhoneNumberConfirmed = true;
        await _context.SaveChangesAsync();

        return new VerifyRegisterOtpResponse
        {
            Message = "Xác thực số điện thoại thành công.",
            UserId = account.Id
        };
    }

    public async Task<string> SendForgotPasswordOtpAsync(string phoneNumber)
    {
        var normalizedPhone = _phoneService.Normalize(phoneNumber);

        if (!_phoneService.IsValid(normalizedPhone))
        {
            throw new BusinessException("Số điện thoại không hợp lệ.");
        }

        await CheckCooldownAsync(normalizedPhone, "ForgotPassword", 60);
        await InvalidateActiveOtpsAsync(normalizedPhone, "ForgotPassword");

        var otp = await GenerateAndSaveOtpAsync(normalizedPhone, "ForgotPassword");
        await _smsService.SendOtpAsync(normalizedPhone, otp);

        return otp;
    }

    public async Task<VerifyForgotPasswordOtpResponse> VerifyForgotPasswordOtpAsync(VerifyForgotPasswordOtpRequest request)
    {
        // 1. Chạy qua nhà máy validation (Format SĐT, OTP đúng 6 ký tự số)
        await _validationFactory.ValidateAsync(request);

        var phoneNumber = _phoneService.Normalize(request.PhoneNumber);

        // 2. Find account by phone number
        var account = await _userManager.Users.FirstOrDefaultAsync(x => x.PhoneNumber == phoneNumber);

        if (account == null)
        {
            throw new BusinessException("Tài khoản không tồn tại.");
        }

        // 3. Validate Forgot Password OTP
        await ValidateOtpAsync(phoneNumber, request.Otp, "ForgotPassword");

        // 4. Generate Identity Password Reset Token
        var resetToken = await _userManager.GeneratePasswordResetTokenAsync(account);

        return new VerifyForgotPasswordOtpResponse
        {
            ResetToken = resetToken,
            UserId = account.Id,
            Otp = string.Empty
        };
    }

    public async Task<ResendOtpResponse> ResendOtpAsync(ResendOtpRequest request)
    {
        // 1. Chạy qua nhà máy validation (Format SĐT, Purpose hợp lệ)
        await _validationFactory.ValidateAsync(request);

        var phoneNumber = _phoneService.Normalize(request.PhoneNumber);

        var account = await _userManager.Users.FirstOrDefaultAsync(x => x.PhoneNumber == phoneNumber);

        if (request.Purpose == "Register")
        {
            if (account == null)
            {
                throw new BusinessException("Tài khoản không tồn tại.");
            }

            if (account.PhoneNumberConfirmed)
            {
                throw new BusinessException("Số điện thoại đã được xác thực.");
            }
        }
        else if (request.Purpose == "ForgotPassword")
        {
            if (account == null)
            {
                throw new BusinessException("Tài khoản không tồn tại.");
            }
        }

        await CheckCooldownAsync(phoneNumber, request.Purpose, 60);
        await InvalidateActiveOtpsAsync(phoneNumber, request.Purpose);

        var otp = await GenerateAndSaveOtpAsync(phoneNumber, request.Purpose);
        await _smsService.SendOtpAsync(phoneNumber, otp);

        return new ResendOtpResponse
        {
            Message = "Mã OTP mới đã được gửi.",
            Otp = otp
        };
    }
}