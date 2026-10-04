using Microlearning.Model;
using Microlearning.Model.Common;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Microlearning.Areas.Sync.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    [AllowAnonymous] // Endpoint này để Cloud probe kiểm tra nên cho phép truy cập công khai
    public class HealthController : ControllerBase
    {
        private readonly ApplicationDbContext _context;
        private readonly IWebHostEnvironment _env;
        private readonly ILogger<HealthController> _logger;

        public HealthController(
            ApplicationDbContext context,
            IWebHostEnvironment env,
            ILogger<HealthController> logger)
        {
            _context = context;
            _env = env;
            _logger = logger;
        }

        /// <summary>
        /// API Kiểm tra sức khỏe toàn diện của hệ thống Backend (Database, Disk Storage).
        /// </summary>
        [HttpGet]
        public async Task<IActionResult> GetHealth()
        {
            var checks = new Dictionary<string, string>();
            var isHealthy = true;

            // 1. Kiểm tra kết nối tới cơ sở dữ liệu SQL Server
            try
            {
                var canConnectDb = await _context.Database.CanConnectAsync();
                if (canConnectDb)
                {
                    checks.Add("Database", "Healthy (Đã kết nối thành công tới SQL Server)");
                }
                else
                {
                    checks.Add("Database", "Unhealthy (Không thể kết nối tới cơ sở dữ liệu)");
                    isHealthy = false;
                }
            }
            catch (Exception ex)
            {
                checks.Add("Database", $"Unhealthy (Lỗi: {ex.Message})");
                isHealthy = false;
            }

            // 2. Kiểm tra thư mục lưu trữ Video (Disk Storage)
            try
            {
                var videoPath = Path.Combine(_env.WebRootPath ?? Path.Combine(Directory.GetCurrentDirectory(), "wwwroot"), "Videos");
                if (Directory.Exists(videoPath))
                {
                    checks.Add("MediaStorage", "Healthy (Thư mục Videos sẵn sàng)");
                }
                else
                {
                    Directory.CreateDirectory(videoPath);
                    checks.Add("MediaStorage", "Healthy (Đã tự động khởi tạo thư mục Videos)");
                }
            }
            catch (Exception ex)
            {
                checks.Add("MediaStorage", $"Unhealthy (Lỗi truy cập đĩa: {ex.Message})");
                isHealthy = false;
            }

            var response = new HealthCheckResponse
            {
                Status = isHealthy ? "Healthy" : "Unhealthy",
                Timestamp = DateTime.UtcNow,
                Checks = checks
            };

            if (isHealthy)
            {
                return Ok(response); // HTTP 200 OK
            }

            _logger.LogError("Hệ thống phát hiện sự cố sức khỏe (Unhealthy): {@HealthChecks}", checks);
            return StatusCode(StatusCodes.Status503ServiceUnavailable, response); // HTTP 503
        }
    }
}