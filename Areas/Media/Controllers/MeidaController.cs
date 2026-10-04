using Microlearning.Areas.Media.Interfaces;
using Microsoft.AspNetCore.Mvc;

namespace Microlearning.Areas.Media.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class MediaController : ControllerBase
    {
        private readonly IMediaService _mediaService;

        public MediaController(IMediaService mediaService)
        {
            _mediaService = mediaService;
        }

        /// <summary>
        /// API Stream Video bài giảng hỗ trợ tua video (HTTP 206 Partial Content).
        /// </summary>
        [HttpGet("{id}/stream")]
        public async Task<IActionResult> StreamVideo(int id)
        {
            var (stream, contentType, _, _) = await _mediaService.GetVideoStreamAsync(id);
            return File(stream, contentType, enableRangeProcessing: true);
        }

        /// <summary>
        /// API Lấy thông tin tệp tải về và mã Checksum SHA256 phục vụ kiểm tra toàn vẹn khi tải Offline.
        /// </summary>
        [HttpGet("{id}/download-info")]
        public async Task<IActionResult> GetDownloadInfo(int id)
        {
            // Lấy baseUrl động từ Request hiện tại (ví dụ: https://localhost:7123)
            var baseUrl = $"{Request.Scheme}://{Request.Host}";
            var response = await _mediaService.GetDownloadInfoAsync(id, baseUrl);

            return Ok(response);
        }

        /// <summary>
        /// API Tải tệp tin video bài giảng về máy (Download file đính kèm).
        /// </summary>
        [HttpGet("{id}/download")]
        public async Task<IActionResult> DownloadVideo(int id)
        {
            var (stream, contentType, _, fileName) = await _mediaService.GetVideoStreamAsync(id);

            // Trả về file tải xuống đính kèm tên file thật
            return File(stream, contentType, fileDownloadName: fileName);
        }
    }
}