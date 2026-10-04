using Microlearning.Areas.Media.DTOs;
using Microlearning.Areas.Media.Interfaces;
using Microlearning.Infrastructure.Factory;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Authorization;

namespace Microlearning.Areas.Media.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class MediaController : ControllerBase
    {
        private readonly IMediaService _mediaService;
        private readonly ITtsService _ttsService;
        private readonly IValidationFactory _validationFactory;
        private readonly IWebHostEnvironment _env;

        public MediaController(
            IMediaService mediaService,
            ITtsService ttsService,
            IValidationFactory _validationFactory,
            IWebHostEnvironment env)
        {
            _mediaService = mediaService;
            _ttsService = ttsService;
            this._validationFactory = _validationFactory;
            _env = env;
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
            return File(stream, contentType, fileDownloadName: fileName);
        }

        /// <summary>
        /// API Đăng tải tệp video bài giảng mới (MP4, WebM, MOV) và liên kết bài học
        /// </summary>
        [HttpPost("upload")]
        [RequestSizeLimit(500 * 1024 * 1024)] // 500 MB
        public async Task<IActionResult> UploadVideo(
            [FromForm] IFormFile file,
            [FromForm] int? lessonId,
            CancellationToken cancellationToken)
        {
            var baseUrl = $"{Request.Scheme}://{Request.Host}";
            var result = await _mediaService.UploadVideoAsync(file, lessonId, baseUrl, cancellationToken);
            return Ok(result);
        }

        /// <summary>
        /// API Thử nghiệm sinh giọng đọc AI (Text-To-Speech) từ văn bản tiếng Việt.
        /// </summary>
        [HttpPost("tts/test")]
        public async Task<IActionResult> TestTts(
            [FromBody] TtsSynthesizeTestRequest request,
            CancellationToken cancellationToken)
        {
            // 1. Kiểm tra tính hợp lệ dữ liệu qua Validation Factory
            await _validationFactory.ValidateAsync(request, cancellationToken);

            // 2. Chuẩn bị đường dẫn tệp âm thanh trong wwwroot/Audios
            var webRoot = _env.WebRootPath ?? Path.Combine(Directory.GetCurrentDirectory(), "wwwroot");
            var audioDir = Path.Combine(webRoot, "Audios");
            if (!Directory.Exists(audioDir))
            {
                Directory.CreateDirectory(audioDir);
            }

            var fileName = $"test_tts_{Guid.NewGuid():N}.mp3";
            var filePath = Path.Combine(audioDir, fileName);

            // 3. Gọi TtsService sinh file MP3
            var voiceToUse = string.IsNullOrWhiteSpace(request.VoiceName) ? "vi-VN-HoaiMyNeural" : request.VoiceName;
            await _ttsService.SynthesizeAudioAsync(request.Text, voiceToUse, filePath, cancellationToken);

            var fileInfo = new FileInfo(filePath);
            var baseUrl = $"{Request.Scheme}://{Request.Host}";

            // 4. Trả về thông tin tệp âm thanh kèm URL trực tiếp để nghe thử
            var response = new TtsSynthesizeResponse
            {
                AudioUrl = $"{baseUrl}/Audios/{fileName}",
                FileName = fileName,
                FileSizeBytes = fileInfo.Length,
                VoiceUsed = voiceToUse,
                Status = "Completed"
            };

            return Ok(response);
        }

        /// <summary>
        /// API Kích hoạt tổng hợp giọng đọc AI cho một kịch bản NarrationScript đã có trong CSDL.
        /// </summary>
        [HttpPost("tts/narration/{scriptId}")]
        [Authorize]
        public async Task<IActionResult> SynthesizeNarrationScript(
            int scriptId,
            CancellationToken cancellationToken)
        {
            var filePath = await _ttsService.SynthesizeNarrationScriptAsync(scriptId, cancellationToken);
            var fileName = Path.GetFileName(filePath);
            var baseUrl = $"{Request.Scheme}://{Request.Host}";

            return Ok(new
            {
                Message = "Tổng hợp giọng đọc AI cho kịch bản thành công.",
                ScriptId = scriptId,
                FileName = fileName,
                AudioUrl = $"{baseUrl}/Audios/{fileName}"
            });
        }

        /// <summary>
        /// API Xếp hàng một tác vụ xử lý media chạy ngầm (HTTP 202 Accepted).
        /// </summary>
        [HttpPost("jobs/enqueue")]
        [Authorize]
        public async Task<IActionResult> EnqueueJob(
            [FromBody] EnqueueMediaJobRequest request,
            CancellationToken cancellationToken)
        {
            var response = await _mediaService.EnqueueJobAsync(request, cancellationToken);
            return AcceptedAtAction(nameof(GetJobStatus), new { id = response.JobId }, response);
        }

        /// <summary>
        /// API Tra cứu trạng thái tiến độ của MediaJob (Queued, Processing, Completed, Failed).
        /// </summary>
        [HttpGet("jobs/{id}")]
        public async Task<IActionResult> GetJobStatus(int id, CancellationToken cancellationToken)
        {
            var response = await _mediaService.GetJobStatusAsync(id, cancellationToken);
            return Ok(response);
        }
    }
}