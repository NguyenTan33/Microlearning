using EdgeTtsSharp;
using Microlearning.Areas.Media.Interfaces;
using Microlearning.Exceptions;
using Microlearning.Model;
using Microlearning.Model.Entities.Enums;
using Microsoft.EntityFrameworkCore;

namespace Microlearning.Areas.Media.Services
{
    public class TtsService : ITtsService
    {
        private readonly ApplicationDbContext _dbContext;
        private readonly IWebHostEnvironment _env;
        private readonly ILogger<TtsService> _logger;

        public TtsService(
            ApplicationDbContext dbContext,
            IWebHostEnvironment env,
            ILogger<TtsService> logger)
        {
            _dbContext = dbContext;
            _env = env;
            _logger = logger;
        }

        public async Task<string> SynthesizeAudioAsync(
            string text,
            string voiceName,
            string outputFilePath,
            CancellationToken cancellationToken = default)
        {
            if (string.IsNullOrWhiteSpace(text))
            {
                throw new BusinessException("Nội dung kịch bản cần đọc không được để trống.");
            }

            if (string.IsNullOrWhiteSpace(voiceName))
            {
                voiceName = "vi-VN-HoaiMyNeural";
            }

            // Đảm bảo thư mục lưu trữ tồn tại
            var directory = Path.GetDirectoryName(outputFilePath);
            if (!string.IsNullOrEmpty(directory) && !Directory.Exists(directory))
            {
                Directory.CreateDirectory(directory);
            }

            _logger.LogInformation("Bắt đầu sinh giọng đọc AI voice: {Voice}, độ dài: {Length} ký tự", voiceName, text.Length);

            try
            {
                var voice = await EdgeTts.GetVoice(voiceName);
                await voice.SaveAudioToFile(text, outputFilePath);

                _logger.LogInformation("Sinh tệp âm thanh thành công tại: {Path}", outputFilePath);
                return outputFilePath;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Lỗi khi tổng hợp giọng đọc AI cho văn bản: {Text}", text);
                throw new BusinessException($"Không thể sinh giọng đọc AI: {ex.Message}");
            }
        }

        public async Task<string> SynthesizeNarrationScriptAsync(
            int narrationScriptId,
            CancellationToken cancellationToken = default)
        {
            var script = await _dbContext.NarrationScripts
                .FirstOrDefaultAsync(s => s.Id == narrationScriptId, cancellationToken);

            if (script == null)
            {
                throw new BusinessException($"Không tìm thấy kịch bản NarrationScript với ID {narrationScriptId}.");
            }

            // Đánh dấu trạng thái đang sinh giọng nói
            script.Status = NarrationScriptStatus.Synthesizing;
            script.UpdatedAt = DateTime.UtcNow;
            await _dbContext.SaveChangesAsync(cancellationToken);

            // Xác định thư mục lưu trữ wwwroot/Audios
            var webRoot = _env.WebRootPath ?? Path.Combine(Directory.GetCurrentDirectory(), "wwwroot");
            var audioDir = Path.Combine(webRoot, "Audios");
            if (!Directory.Exists(audioDir))
            {
                Directory.CreateDirectory(audioDir);
            }

            var fileName = $"narration_{script.Id}_{DateTime.UtcNow:yyyyMMddHHmmss}.mp3";
            var outputPath = Path.Combine(audioDir, fileName);

            try
            {
                var voiceToUse = string.IsNullOrWhiteSpace(script.VoiceName) ? "vi-VN-HoaiMyNeural" : script.VoiceName;
                await SynthesizeAudioAsync(script.ScriptText, voiceToUse, outputPath, cancellationToken);

                // Cập nhật trạng thái hoàn tất
                script.Status = NarrationScriptStatus.Completed;
                script.UpdatedAt = DateTime.UtcNow;
                await _dbContext.SaveChangesAsync(cancellationToken);

                return outputPath;
            }
            catch (Exception)
            {
                // Ghi nhận trạng thái thất bại
                script.Status = NarrationScriptStatus.Failed;
                script.UpdatedAt = DateTime.UtcNow;
                await _dbContext.SaveChangesAsync(cancellationToken);
                throw;
            }
        }
    }
}