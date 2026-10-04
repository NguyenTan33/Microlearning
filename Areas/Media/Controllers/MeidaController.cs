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
        /// <param name="id">ID của MediaAsset</param>
        [HttpGet("{id}/stream")]
        public async Task<IActionResult> StreamVideo(int id)
        {
            var (stream, contentType, _, _) = await _mediaService.GetVideoStreamAsync(id);

            // enableRangeProcessing: true kích hoạt cơ chế đọc theo Byte-Range (HTTP 206)
            // Cho phép tua video tới bất kỳ thời điểm nào!
            return File(stream, contentType, enableRangeProcessing: true);
        }
    }
}