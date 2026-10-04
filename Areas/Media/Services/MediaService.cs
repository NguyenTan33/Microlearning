using System.Security.Cryptography;
using Microlearning.Areas.Media.DTOs;
using Microlearning.Areas.Media.Interfaces;
using Microlearning.Exceptions;
using Microlearning.Infrastructure.Factory;
using Microlearning.Model;
using Microsoft.EntityFrameworkCore;

namespace Microlearning.Areas.Media.Services
{
    public class MediaService : IMediaService
    {
        private readonly ApplicationDbContext _dbContext;
        private readonly IWebHostEnvironment _env;
        private readonly IValidationFactory _validationFactory;

        // Inject thêm IValidationFactory vào Constructor
        public MediaService(
            ApplicationDbContext context,
            IWebHostEnvironment env,
            IValidationFactory validationFactory)
        {
            _dbContext = context;
            _env = env;
            _validationFactory = validationFactory;
        }

        public async Task<(Stream stream, string contentType, long fileLength, string fileName)> GetVideoStreamAsync(int mediaId)
        {
            // 1. Gửi qua nhà máy Validation để kiểm tra MediaId
            await _validationFactory.ValidateAsync(new GetMediaStreamRequest(mediaId));

            // 2. Tìm thông tin media asset trong DB
            var mediaAsset = await _dbContext.MediaAssets
                .AsNoTracking()
                .FirstOrDefaultAsync(m => m.Id == mediaId);

            if (mediaAsset == null)
            {
                throw new BusinessException($"Không tìm thấy tệp video với ID = {mediaId}.");
            }

            var filePath = GetPhysicalFilePath(mediaAsset.FileName);
            if (!File.Exists(filePath))
            {
                throw new BusinessException($"Tệp video vật lý không tồn tại trên máy chủ: {mediaAsset.FileName}");
            }

            var fileInfo = new FileInfo(filePath);
            var stream = new FileStream(filePath, FileMode.Open, FileAccess.Read, FileShare.Read);

            var contentType = string.IsNullOrWhiteSpace(mediaAsset.ContentType)
                ? "video/mp4"
                : mediaAsset.ContentType;

            return (stream, contentType, fileInfo.Length, mediaAsset.FileName);
        }

        public async Task<MediaDownloadInfoResponse> GetDownloadInfoAsync(int mediaId, string baseUrl)
        {
            // 1. Gửi qua nhà máy Validation để kiểm tra MediaId và BaseUrl
            await _validationFactory.ValidateAsync(new GetMediaDownloadInfoRequest(mediaId, baseUrl));

            // 2. Tìm thông tin trong DB
            var mediaAsset = await _dbContext.MediaAssets
                .FirstOrDefaultAsync(m => m.Id == mediaId);

            if (mediaAsset == null)
            {
                throw new BusinessException($"Không tìm thấy tệp video với ID = {mediaId}.");
            }

            var filePath = GetPhysicalFilePath(mediaAsset.FileName);
            if (!File.Exists(filePath))
            {
                throw new BusinessException($"Tệp video vật lý không tồn tại: {mediaAsset.FileName}");
            }

            var fileInfo = new FileInfo(filePath);
            var actualSize = fileInfo.Length;

            // 3. Tự động tính mã băm SHA-256 và kích thước nếu chưa có
            if (string.IsNullOrWhiteSpace(mediaAsset.Checksum) || mediaAsset.SizeBytes != actualSize)
            {
                mediaAsset.Checksum = await CalculateSha256Async(filePath);
                mediaAsset.SizeBytes = actualSize;
                mediaAsset.UpdatedAt = DateTime.UtcNow;

                await _dbContext.SaveChangesAsync();
            }

            var downloadUrl = $"{baseUrl.TrimEnd('/')}/api/media/{mediaId}/download";

            return new MediaDownloadInfoResponse
            {
                MediaId = mediaAsset.Id,
                FileName = mediaAsset.FileName,
                ContentType = string.IsNullOrWhiteSpace(mediaAsset.ContentType) ? "video/mp4" : mediaAsset.ContentType,
                FileSizeBytes = mediaAsset.SizeBytes,
                Checksum = mediaAsset.Checksum,
                DownloadUrl = downloadUrl
            };
        }

        private string GetPhysicalFilePath(string fileName)
        {
            var rootPath = _env.WebRootPath ?? Path.Combine(Directory.GetCurrentDirectory(), "wwwroot");
            var target = Path.Combine(rootPath, "videos", fileName);
            if (!File.Exists(target))
            {
                var fallback = Path.Combine(rootPath, "videos", "test.mp4");
                if (File.Exists(fallback))
                {
                    return fallback;
                }
            }
            return target;
        }

        private static async Task<string> CalculateSha256Async(string filePath)
        {
            using var sha256 = SHA256.Create();
            using var stream = new FileStream(filePath, FileMode.Open, FileAccess.Read, FileShare.Read);
            var hashBytes = await sha256.ComputeHashAsync(stream);
            return Convert.ToHexString(hashBytes).ToLowerInvariant();
        }



        public async Task<MediaJobResponse> EnqueueJobAsync(EnqueueMediaJobRequest request, CancellationToken cancellationToken = default)
        {
            var asset = await _dbContext.MediaAssets
                .FirstOrDefaultAsync(m => m.Id == request.MediaAssetId, cancellationToken);

            if (asset == null)
            {
                throw new BusinessException($"Không tìm thấy tệp tài nguyên MediaAsset với ID {request.MediaAssetId}.");
            }

            var job = new Microlearning.Model.Entities.MediaJob
            {
                MediaAssetId = request.MediaAssetId,
                JobType = request.JobType,
                Status = Microlearning.Model.Entities.Enums.MediaJobStatus.Queued,
                CreatedAt = DateTime.UtcNow
            };

            _dbContext.MediaJobs.Add(job);
            await _dbContext.SaveChangesAsync(cancellationToken);

            return new MediaJobResponse
            {
                JobId = job.Id,
                MediaAssetId = job.MediaAssetId,
                JobType = job.JobType.ToString(),
                Status = job.Status.ToString(),
                CreatedAt = job.CreatedAt
            };
        }

        public async Task<MediaJobResponse> GetJobStatusAsync(int jobId, CancellationToken cancellationToken = default)
        {
            var job = await _dbContext.MediaJobs
                .FirstOrDefaultAsync(j => j.Id == jobId, cancellationToken);

            if (job == null)
            {
                throw new BusinessException($"Không tìm thấy tác vụ MediaJob với ID {jobId}.");
            }

            return new MediaJobResponse
            {
                JobId = job.Id,
                MediaAssetId = job.MediaAssetId,
                JobType = job.JobType.ToString(),
                Status = job.Status.ToString(),
                ErrorMessage = job.ErrorMessage,
                CreatedAt = job.CreatedAt,
                StartedAt = job.StartedAt,
                CompletedAt = job.CompletedAt
            };
        }
    }
}