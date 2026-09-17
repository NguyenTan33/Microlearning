using fnb_pos_inventory_system.Areas.Auth.DTOs;
using fnb_pos_inventory_system.Areas.Auth.Services.Interfaces;
using fnb_pos_inventory_system.Entities;
using fnb_pos_inventory_system.Exceptions;
using fnb_pos_inventory_system.Infrastructure.Factory;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;

namespace fnb_pos_inventory_system.Infrastructure.Validation.Auth
{
    public class RegisterValidationRule : IValidationRule<RegisterRequest>
    {
        private readonly UserManager<Account> _userManager;
        private readonly IPhoneService _phoneService;

        public RegisterValidationRule(UserManager<Account> userManager, IPhoneService phoneService)
        {
            _userManager = userManager;
            _phoneService = phoneService;
        }

        public async Task ValidateAsync(RegisterRequest request, CancellationToken ct = default)
        {
            if (request == null)
                throw new BusinessException("Dữ liệu đăng ký không được để trống.");

            if (string.IsNullOrWhiteSpace(request.FullName))
                throw new BusinessException("Họ và tên không được để trống.");

            if (string.IsNullOrWhiteSpace(request.Password) || request.Password.Length < 6)
                throw new BusinessException("Mật khẩu phải có độ dài tối thiểu 6 ký tự.");

            if (string.IsNullOrWhiteSpace(request.PhoneNumber))
                throw new BusinessException("Số điện thoại không được để trống.");

            var normalizedPhone = _phoneService.Normalize(request.PhoneNumber);
            if (!_phoneService.IsValid(normalizedPhone))
                throw new BusinessException("Số điện thoại không hợp lệ.");

            var phoneExists = await _userManager.Users
                .AsNoTracking()
                .AnyAsync(x => x.PhoneNumber == normalizedPhone, ct);

            if (phoneExists)
                throw new BusinessException("Số điện thoại đã được đăng ký.");
        }
    }
}
