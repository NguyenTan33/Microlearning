using Microlearning.Areas.Media.Interfaces;
using Microlearning.Model;
using Microlearning.Model.Entities;
using Microlearning.Model.Entities.Enums;
using Microsoft.EntityFrameworkCore;

namespace Microlearning.Areas.Media.Services
{
    public class MediaJobBackgroundWorker : BackgroundService
    {
        private readonly IServiceScopeFactory _scopeFactory;
        private readonly ILogger<MediaJobBackgroundWorker> _logger;
        private readonly IWebHostEnvironment _env;

        public MediaJobBackgroundWorker(
            IServiceScopeFactory scopeFactory,
            ILogger<MediaJobBackgroundWorker> logger,
            IWebHostEnvironment env)
        {
            _scopeFactory = scopeFactory;
            _logger = logger;
            _env = env;
        }

        protected override async Task ExecuteAsync(CancellationToken stoppingToken)
        {
            _logger.LogInformation("MediaJobBackgroundWorker đã khởi động và sẵn sàng quét tác vụ.");

            while (!stoppingToken.IsCancellationRequested)
            {
                try
                {
                    await ProcessPendingJobsAsync(stoppingToken);
                }
                catch (Exception ex)
                {
                    _logger.LogError(ex, "Lỗi xảy ra trong chu kỳ quét của MediaJobBackgroundWorker.");
                }

                // Quét định kỳ mỗi 5 giây
                await Task.Delay(TimeSpan.FromSeconds(5), stoppingToken);
            }

            _logger.LogInformation("MediaJobBackgroundWorker đang dừng lại.");
        }

        private async Task ProcessPendingJobsAsync(CancellationToken stoppingToken)
        {
            // Tạo Scope riêng biệt để lấy DbContext và Services Scoped
            using var scope = _scopeFactory.CreateScope();
            var dbContext = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
            var ttsService = scope.ServiceProvider.GetRequiredService<ITtsService>();
            var mediaProcessing = scope.ServiceProvider.GetRequiredService<IMediaProcessingService>();

            // Lấy tối đa 5 tác vụ đang chờ xếp hàng (Queued)
            var queuedJobs = await dbContext.MediaJobs
                .Include(j => j.MediaAsset)
                    .ThenInclude(m => m!.NarrationScript)
                .Where(j => j.Status == MediaJobStatus.Queued)
                .OrderBy(j => j.CreatedAt)
                .Take(5)
                .ToListAsync(stoppingToken);

            if (!queuedJobs.Any())
            {
                return;
            }

            _logger.LogInformation("Phát hiện {Count} tác vụ MediaJob đang chờ xử lý.", queuedJobs.Count);

            foreach (var job in queuedJobs)
            {
                if (stoppingToken.IsCancellationRequested) break;

                // 1. Chuyển sang Processing
                job.Status = MediaJobStatus.Processing;
                job.StartedAt = DateTime.UtcNow;
                await dbContext.SaveChangesAsync(stoppingToken);

                try
                {
                    await ExecuteJobLogicAsync(job, dbContext, ttsService, mediaProcessing, stoppingToken);

                    // 2. Chuyển sang Completed
                    job.Status = MediaJobStatus.Completed;
                    job.CompletedAt = DateTime.UtcNow;
                    job.ErrorMessage = null;
                    _logger.LogInformation("Hoàn tất xử lý MediaJob ID: {Id} ({Type})", job.Id, job.JobType);
                }
                catch (Exception ex)
                {
                    // 3. Ghi nhận lỗi Failed
                    job.Status = MediaJobStatus.Failed;
                    job.ErrorMessage = ex.Message;
                    job.RetryCount += 1;
                    _logger.LogError(ex, "Thất bại khi thực thi MediaJob ID: {Id}", job.Id);
                }

                await dbContext.SaveChangesAsync(stoppingToken);
            }
        }

        private async Task ExecuteJobLogicAsync(
            MediaJob job,
            ApplicationDbContext dbContext,
            ITtsService ttsService,
            IMediaProcessingService mediaProcessing,
            CancellationToken stoppingToken)
        {
            var webRoot = _env.WebRootPath ?? Path.Combine(Directory.GetCurrentDirectory(), "wwwroot");

            switch (job.JobType)
            {
                case MediaJobType.TtsSynthesize:
                    if (job.MediaAsset?.NarrationScript != null)
                    {
                        await ttsService.SynthesizeNarrationScriptAsync(job.MediaAsset.NarrationScript.Id, stoppingToken);
                    }
                    break;

                case MediaJobType.VideoMux:
                    // Ghép audio và video cho MediaAsset
                    var videoDir = Path.Combine(webRoot, "Videos");
                    var audioDir = Path.Combine(webRoot, "Audios");

                    var rawVideoPath = Path.Combine(videoDir, job.MediaAsset?.FileName ?? "sample.mp4");
                    var rawAudioPath = Path.Combine(audioDir, $"narration_{job.MediaAsset?.NarrationScript?.Id}.mp3");
                    var outputVideoPath = Path.Combine(videoDir, $"final_{job.MediaAssetId}_{DateTime.UtcNow:yyyyMMddHHmmss}.mp4");

                    if (File.Exists(rawVideoPath) && File.Exists(rawAudioPath))
                    {
                        await mediaProcessing.MuxAudioAndVideoAsync(rawVideoPath, rawAudioPath, outputVideoPath, stoppingToken);

                        // Trích xuất thumbnail tại giây thứ 2
                        var thumbnailPath = Path.Combine(webRoot, "Thumbnails", $"thumb_{job.MediaAssetId}.jpg");
                        await mediaProcessing.ExtractThumbnailAsync(outputVideoPath, thumbnailPath, 2, stoppingToken);

                        // Cập nhật thông tin file hoàn chỉnh vào MediaAsset
                        if (job.MediaAsset != null)
                        {
                            var fi = new FileInfo(outputVideoPath);
                            job.MediaAsset.FileName = Path.GetFileName(outputVideoPath);
                            job.MediaAsset.SizeBytes = fi.Length;
                            job.MediaAsset.Status = MediaAssetStatus.Uploaded;
                            job.MediaAsset.UpdatedAt = DateTime.UtcNow;
                        }
                    }
                    break;

                default:
                    _logger.LogWarning("Loại Job {Type} chưa có logic xử lý riêng.", job.JobType);
                    break;
            }
        }
    }
}