using Microlearning.Areas.Admin.DTOs;

namespace Microlearning.Areas.Admin.Interfaces
{
    public interface IUserManagementService
    {
        Task<List<UserListItemDto>> GetUsersAsync(string? search, string? role, int page = 1, int pageSize = 50);
        Task<UserDetailDto> GetUserByIdAsync(string id);
        Task<UserDetailDto> CreateUserAsync(CreateUserRequest request);
        Task ChangePasswordAsync(string id, AdminChangePasswordRequest request);
        Task<bool> ToggleLockoutAsync(string id, AdminToggleLockoutRequest request);
        Task UpdateUserRoleAsync(string id, UpdateUserRoleRequest request);
    }
}
