using Microlearning.Areas.Media.Interfaces;
using Microlearning.Exceptions;
using System.Diagnostics;

namespace Microlearning.Areas.Media.Services
{
    public class MediaProcessingService : IMediaProcessingService
    {
        private readonly ILogger<MediaProcessingService> _appLogger;

        public MediaProcessingService(ILogger<MediaProcessingService> appLogger)
        {
            _appLogger = appLogger;
        }

        public async Task<string> MuxAudioAndVideoAsync(
            string videoInputPath,
            string audioInputPath,
            string outputVideoPath,
            CancellationToken cancellationToken = default)
        {
            if (!File.Exists(videoInputPath))
                throw new BusinessException($"Không tìm thấy tệp video nguồn: {videoInputPath}");

            if (!File.Exists(audioInputPath))
                throw new BusinessException($"Không tìm thấy tệp âm thanh nguồn: {audioInputPath}");

            var outDir = Path.GetDirectoryName(outputVideoPath);
            if (!string.IsNullOrEmpty(outDir) && !Directory.Exists(outDir))
            {
                Directory.CreateDirectory(outDir);
            }

            // Tham số ghép stream video và audio không cần render lại hình ảnh
            var commandArgs = $"-y -i \"{videoInputPath}\" -i \"{audioInputPath}\" -c:v copy -c:a aac -map 0:v:0 -map 1:a:0 -shortest \"{outputVideoPath}\"";

            await RunFfmpegAsync(commandArgs, cancellationToken);
            return outputVideoPath;
        }

        public async Task<string> ExtractThumbnailAsync(
            string videoInputPath,
            string outputImagePath,
            int atSecond = 2,
            CancellationToken cancellationToken = default)
        {
            if (!File.Exists(videoInputPath))
                throw new BusinessException($"Không tìm thấy tệp video để tạo thumbnail: {videoInputPath}");

            var outDir = Path.GetDirectoryName(outputImagePath);
            if (!string.IsNullOrEmpty(outDir) && !Directory.Exists(outDir))
            {
                Directory.CreateDirectory(outDir);
            }

            // Chụp đúng 1 khung hình tại giây thứ atSecond
            var commandArgs = $"-y -ss {atSecond} -i \"{videoInputPath}\" -vframes 1 -q:v 2 \"{outputImagePath}\"";

            await RunFfmpegAsync(commandArgs, cancellationToken);
            return outputImagePath;
        }

        private async Task RunFfmpegAsync(string arguments, CancellationToken cancellationToken)
        {
            _appLogger.LogInformation("Thực thi ffmpeg với tham số: {Args}", arguments);

            var startInfo = new ProcessStartInfo
            {
                FileName = "ffmpeg",
                Arguments = arguments,
                RedirectStandardError = true,
                RedirectStandardOutput = true,
                UseShellExecute = false,
                CreateNoWindow = true
            };

            using var process = new Process { StartInfo = startInfo };

            try
            {
                process.Start();
            }
            catch (Exception ex)
            {
                _appLogger.LogError(ex, "Không thể khởi chạy tiến trình ffmpeg.");
                throw new BusinessException("Máy chủ chưa cấu hình công cụ ffmpeg trong hệ thống.");
            }

            var errorTask = process.StandardError.ReadToEndAsync(cancellationToken);
            await process.WaitForExitAsync(cancellationToken);

            var errLog = await errorTask;
            if (process.ExitCode != 0)
            {
                _appLogger.LogError("FFmpeg thất bại với mã {Code}: {Error}", process.ExitCode, errLog);
                throw new BusinessException($"Lỗi xử lý đa phương tiện qua FFmpeg: {errLog}");
            }
        }
    }
}