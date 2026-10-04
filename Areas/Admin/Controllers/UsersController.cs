using Microlearning.Areas.Admin.DTOs;
using Microlearning.Areas.Admin.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Microlearning.Areas.Admin.Controllers
{
    [ApiController]
    [Route("api/admin/[controller]")]
    [Authorize(Roles = "Admin")]
    public class UsersController : ControllerBase
    {
        private readonly IUserManagementService _userService;

        public UsersController(IUserManagementService userService)
        {
            _userService = userService;
        }

        /// <summary>
        /// Lấy danh sách tài khoản người dùng trong hệ thống (Hỗ trợ tìm kiếm, lọc theo vai trò, phân trang)
        /// </summary>
        [HttpGet]
        public async Task<IActionResult> GetUsers(
            [FromQuery] string? search,
            [FromQuery] string? role,
            [FromQuery] int page = 1,
            [FromQuery] int pageSize = 50)
        {
            var result = await _userService.GetUsersAsync(search, role, page, pageSize);
            return Ok(result);
        }

        /// <summary>
        /// Xem chi tiết thông tin của một người dùng
        /// </summary>
        [HttpGet("{id}")]
        public async Task<IActionResult> GetUserById(string id)
        {
            var result = await _userService.GetUserByIdAsync(id);
            return Ok(result);
        }

        /// <summary>
        /// Quản trị viên thêm mới tài khoản (Admin, Teacher hoặc Student)
        /// </summary>
        [HttpPost]
        public async Task<IActionResult> CreateUser([FromBody] CreateUserRequest request)
        {
            var result = await _userService.CreateUserAsync(request);
            return CreatedAtAction(nameof(GetUserById), new { id = result.Id }, result);
        }

        /// <summary>
        /// Quản trị viên đổi mật khẩu trực tiếp cho tài khoản người dùng
        /// </summary>
        [HttpPut("{id}/password")]
        public async Task<IActionResult> ChangePassword(string id, [FromBody] AdminChangePasswordRequest request)
        {
            await _userService.ChangePasswordAsync(id, request);
            return Ok(new { message = "Đổi mật khẩu người dùng thành công." });
        }

        /// <summary>
        /// Quản trị viên tạm khóa hoặc mở khóa tài khoản người dùng
        /// </summary>
        [HttpPatch("{id}/toggle-lock")]
        public async Task<IActionResult> ToggleLockout(string id, [FromBody] AdminToggleLockoutRequest request)
        {
            var isLocked = await _userService.ToggleLockoutAsync(id, request);
            return Ok(new
            {
                userId = id,
                isLockedOut = isLocked,
                message = isLocked ? "Đã tạm khóa tài khoản thành công." : "Đã mở khóa tài khoản thành công."
            });
        }

        /// <summary>
        /// Quản trị viên cập nhật vai trò (Role) cho người dùng
        /// </summary>
        [HttpPut("{id}/role")]
        public async Task<IActionResult> UpdateRole(string id, [FromBody] UpdateUserRoleRequest request)
        {
            await _userService.UpdateUserRoleAsync(id, request);
            return Ok(new { message = $"Cập nhật vai trò thành công sang '{request.Role}'." });
        }
    }
}
