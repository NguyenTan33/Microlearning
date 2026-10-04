using Microlearning.Areas.Admin.DTOs;
using Microlearning.Areas.Admin.Interfaces;
using Microlearning.Areas.Auth.Interfaces;
using Microlearning.Exceptions;
using Microlearning.Model.Entities;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;

namespace Microlearning.Areas.Admin.Services
{
    public class UserManagementService : IUserManagementService
    {
        private readonly UserManager<Account> _userManager;
        private readonly RoleManager<IdentityRole> _roleManager;
        private readonly IPhoneService _phoneService;

        public UserManagementService(
            UserManager<Account> userManager,
            RoleManager<IdentityRole> roleManager,
            IPhoneService phoneService)
        {
            _userManager = userManager;
            _roleManager = roleManager;
            _phoneService = phoneService;
        }

        public async Task<List<UserListItemDto>> GetUsersAsync(string? search, string? role, int page = 1, int pageSize = 50)
        {
            if (page < 1) page = 1;
            if (pageSize < 1 || pageSize > 100) pageSize = 50;

            var query = _userManager.Users.AsNoTracking().AsQueryable();

            if (!string.IsNullOrWhiteSpace(search))
            {
                var s = search.Trim();
                query = query.Where(u =>
                    (u.FullName != null && u.FullName.Contains(s)) ||
                    (u.PhoneNumber != null && u.PhoneNumber.Contains(s)) ||
                    (u.UserName != null && u.UserName.Contains(s)) ||
                    (u.Email != null && u.Email.Contains(s)));
            }

            var users = await query
                .OrderByDescending(u => u.Id)
                .Skip((page - 1) * pageSize)
                .Take(pageSize)
                .ToListAsync();

            var result = new List<UserListItemDto>();

            foreach (var user in users)
            {
                var roles = (await _userManager.GetRolesAsync(user)).ToList();

                // Nếu có lọc theo role mà user không chứa role đó thì bỏ qua
                if (!string.IsNullOrWhiteSpace(role) && !roles.Any(r => r.Equals(role, StringComparison.OrdinalIgnoreCase)))
                {
                    continue;
                }

                var isLockedOut = await _userManager.IsLockedOutAsync(user);

                result.Add(new UserListItemDto(
                    user.Id,
                    user.FullName ?? user.UserName ?? string.Empty,
                    user.PhoneNumber ?? string.Empty,
                    user.Email,
                    roles,
                    isLockedOut,
                    user.LockoutEnd,
                    user.PhoneNumberConfirmed
                ));
            }

            return result;
        }

        public async Task<UserDetailDto> GetUserByIdAsync(string id)
        {
            var user = await _userManager.FindByIdAsync(id);
            if (user == null)
            {
                throw new BusinessException($"Không tìm thấy người dùng với mã '{id}'.");
            }

            var roles = (await _userManager.GetRolesAsync(user)).ToList();
            var isLockedOut = await _userManager.IsLockedOutAsync(user);

            return new UserDetailDto(
                user.Id,
                user.FullName ?? user.UserName ?? string.Empty,
                user.PhoneNumber ?? string.Empty,
                user.Email,
                roles,
                isLockedOut,
                user.LockoutEnd,
                user.PhoneNumberConfirmed,
                user.AccessFailedCount
            );
        }

        public async Task<UserDetailDto> CreateUserAsync(CreateUserRequest request)
        {
            if (string.IsNullOrWhiteSpace(request.FullName))
                throw new BusinessException("Họ và tên không được để trống.");

            if (string.IsNullOrWhiteSpace(request.PhoneNumber))
                throw new BusinessException("Số điện thoại không được để trống.");

            if (string.IsNullOrWhiteSpace(request.Password) || request.Password.Length < 6)
                throw new BusinessException("Mật khẩu phải có độ dài tối thiểu 6 ký tự.");

            if (string.IsNullOrWhiteSpace(request.Role))
                throw new BusinessException("Vai trò người dùng không được để trống.");

            // Kiểm tra role có hợp lệ không
            var roleExists = await _roleManager.RoleExistsAsync(request.Role);
            if (!roleExists)
            {
                throw new BusinessException($"Vai trò '{request.Role}' không tồn tại trong hệ thống.");
            }

            var normalizedPhone = _phoneService.Normalize(request.PhoneNumber);
            if (!_phoneService.IsValid(normalizedPhone))
            {
                throw new BusinessException("Số điện thoại không hợp lệ.");
            }

            // Kiểm tra số điện thoại đã đăng ký
            var existingUser = await _userManager.Users.FirstOrDefaultAsync(u => u.PhoneNumber == normalizedPhone);
            if (existingUser != null)
            {
                if (existingUser.PhoneNumberConfirmed)
                {
                    throw new BusinessException("Số điện thoại này đã được đăng ký và kích hoạt.");
                }

                // Nếu là tài khoản chưa kích hoạt dở dang thì xóa đi tạo mới
                await _userManager.DeleteAsync(existingUser);
            }

            var newUser = new Account
            {
                FullName = request.FullName,
                PhoneNumber = normalizedPhone,
                UserName = normalizedPhone,
                PhoneNumberConfirmed = true, // Admin tạo thì tự động kích hoạt
                LockoutEnabled = true
            };

            var createResult = await _userManager.CreateAsync(newUser, request.Password);
            if (!createResult.Succeeded)
            {
                var errors = string.Join(", ", createResult.Errors.Select(e => e.Description));
                throw new BusinessException(errors);
            }

            var addRoleResult = await _userManager.AddToRoleAsync(newUser, request.Role);
            if (!addRoleResult.Succeeded)
            {
                await _userManager.DeleteAsync(newUser);
                var errors = string.Join(", ", addRoleResult.Errors.Select(e => e.Description));
                throw new BusinessException(errors);
            }

            return await GetUserByIdAsync(newUser.Id);
        }

        public async Task ChangePasswordAsync(string id, AdminChangePasswordRequest request)
        {
            if (string.IsNullOrWhiteSpace(request.NewPassword) || request.NewPassword.Length < 6)
            {
                throw new BusinessException("Mật khẩu mới phải có độ dài tối thiểu 6 ký tự.");
            }

            var user = await _userManager.FindByIdAsync(id);
            if (user == null)
            {
                throw new BusinessException($"Không tìm thấy người dùng với mã '{id}'.");
            }

            var token = await _userManager.GeneratePasswordResetTokenAsync(user);
            var resetResult = await _userManager.ResetPasswordAsync(user, token, request.NewPassword);

            if (!resetResult.Succeeded)
            {
                var errors = string.Join(", ", resetResult.Errors.Select(e => e.Description));
                throw new BusinessException(errors);
            }
        }

        public async Task<bool> ToggleLockoutAsync(string id, AdminToggleLockoutRequest request)
        {
            var user = await _userManager.FindByIdAsync(id);
            if (user == null)
            {
                throw new BusinessException($"Không tìm thấy người dùng với mã '{id}'.");
            }

            if (request.Lock)
            {
                // Tạm khóa: đặt thời hạn khóa (mặc định 10 năm nếu không chỉ định)
                var lockDuration = request.LockMinutes ?? (60 * 24 * 365 * 10);
                var lockoutEnd = DateTimeOffset.UtcNow.AddMinutes(lockDuration);
                await _userManager.SetLockoutEndDateAsync(user, lockoutEnd);
                return true;
            }
            else
            {
                // Mở khóa: gỡ bỏ LockoutEnd và reset failed count
                await _userManager.SetLockoutEndDateAsync(user, null);
                await _userManager.ResetAccessFailedCountAsync(user);
                return false;
            }
        }

        public async Task UpdateUserRoleAsync(string id, UpdateUserRoleRequest request)
        {
            if (string.IsNullOrWhiteSpace(request.Role))
            {
                throw new BusinessException("Vai trò mới không được để trống.");
            }

            var roleExists = await _roleManager.RoleExistsAsync(request.Role);
            if (!roleExists)
            {
                throw new BusinessException($"Vai trò '{request.Role}' không tồn tại trong hệ thống.");
            }

            var user = await _userManager.FindByIdAsync(id);
            if (user == null)
            {
                throw new BusinessException($"Không tìm thấy người dùng với mã '{id}'.");
            }

            var currentRoles = await _userManager.GetRolesAsync(user);
            await _userManager.RemoveFromRolesAsync(user, currentRoles);
            var addResult = await _userManager.AddToRoleAsync(user, request.Role);

            if (!addResult.Succeeded)
            {
                var errors = string.Join(", ", addResult.Errors.Select(e => e.Description));
                throw new BusinessException(errors);
            }
        }
    }
}
