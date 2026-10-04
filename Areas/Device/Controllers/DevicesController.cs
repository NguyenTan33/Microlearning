using System.Security.Claims;
using Microlearning.Areas.Device.DTOs;
using Microlearning.Areas.Device.Interfaces;
using Microlearning.Exceptions;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Microlearning.Areas.Device.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    [Authorize] // Bắt buộc đăng nhập mới được đăng ký thiết bị
    public class DevicesController : ControllerBase
    {
        private readonly IDeviceService _deviceService;

        public DevicesController(IDeviceService deviceService)
        {
            _deviceService = deviceService;
        }

        [HttpPost("register")]
        public async Task<IActionResult> Register([FromBody] RegisterDeviceRequest request)
        {
            // Trích xuất AccountId an toàn từ Claims trong JWT Token
            var accountId = User.FindFirstValue(ClaimTypes.NameIdentifier);
            if (string.IsNullOrEmpty(accountId))
            {
                throw new BusinessException("Không xác định được danh tính người dùng từ Token.");
            }

            var response = await _deviceService.RegisterDeviceAsync(accountId, request);
            return Ok(response);
        }
    }
}