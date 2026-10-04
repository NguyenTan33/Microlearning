using System.Security.Claims;
using Microlearning.Areas.Device.DTOs;
using Microlearning.Areas.Device.Interfaces;
using Microlearning.Exceptions;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Microlearning.Areas.Device.Controllers
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
        /// Đăng ký hoặc cập nhật thông tin thiết bị di động (phục vụ quản lý phiên và Offline Sync)
        /// </summary>
        [HttpPost("register")]
        public async Task<IActionResult> RegisterDevice([FromBody] RegisterDeviceRequest request)
        {
            var accountId = User.FindFirstValue(ClaimTypes.NameIdentifier);
            if (string.IsNullOrWhiteSpace(accountId))
            {
                throw new BusinessException("Không xác định được danh tính tài khoản từ Token.");
            }

            var result = await _deviceService.RegisterDeviceAsync(accountId, request);
            return Ok(result);
        }
    }
}
