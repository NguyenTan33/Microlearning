using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microlearning.DTOs;
using Microlearning.Service.Interfaces;

namespace Microlearning.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    [Authorize]
    public class DevicesController : ControllerBase
    {
        private readonly IDeviceService _deviceService;

        public DevicesController(IDeviceService deviceService)
        {
            _deviceService = deviceService;
        }

        /// <summary>
        /// Đăng ký hoặc cập nhật thông tin thiết bị (Upsert)
        /// </summary>
        [HttpPost("register")]
        public async Task<IActionResult> RegisterDevice([FromBody] RegisterDeviceDTO dto)
        {
            var accountId = User.FindFirstValue(ClaimTypes.NameIdentifier);
            if (string.IsNullOrWhiteSpace(accountId))
            {
                return Unauthorized(new { message = "Không xác định được danh tính tài khoản từ Token." });
            }

            // Gán AccountId lấy từ Token đăng nhập để đảm bảo an toàn bảo mật
            var finalDto = string.IsNullOrWhiteSpace(dto.accountID) 
                ? dto with { accountID = accountId } 
                : dto;

            await _deviceService.registerDevice(finalDto);

            return Ok(new { message = "Đăng ký thiết bị thành công." });
        }
    }
}
