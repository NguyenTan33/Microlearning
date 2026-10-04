using System.Security.Cryptography;
using Microlearning.Areas.Media.DTOs;
using Microlearning.Areas.Media.Interfaces;
using Microlearning.Exceptions;
using Microlearning.Infrastructure.Factory;
using Microlearning.Model;
using Microsoft.EntityFrameworkCore;
using Microsoft.AspNetCore.Http;
using Microlearning.Model.Entities;
using Microlearning.Model.Entities.Enums;

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

            // 1. Kiểm tra chính xác tệp fileName trên đĩa
            var target = Path.Combine(rootPath, "Videos", fileName);
            if (File.Exists(target))
            {
                return target;
            }
            var targetLower = Path.Combine(rootPath, "videos", fileName);
            if (File.Exists(targetLower))
            {
                return targetLower;
            }

            // 2. Dự phòng dùng video demo test.mp4 nếu tệp chưa có
            var testMp4 = Path.Combine(rootPath, "Videos", "test.mp4");
            if (File.Exists(testMp4))
            {
                return testMp4;
            }
            var testMp4Lower = Path.Combine(rootPath, "videos", "test.mp4");
            if (File.Exists(testMp4Lower))
            {
                return testMp4Lower;
            }

            return target;
        }

        public async Task<UploadMediaResponse> UploadVideoAsync(IFormFile file, int? lessonId, string baseUrl, CancellationToken cancellationToken = default)
        {
            if (file == null || file.Length == 0)
            {
                throw new BusinessException("Vui lòng chọn tệp video hợp lệ.");
            }

            var rootPath = _env.WebRootPath ?? Path.Combine(Directory.GetCurrentDirectory(), "wwwroot");
            var videosDir = Path.Combine(rootPath, "Videos");
            if (!Directory.Exists(videosDir))
            {
                Directory.CreateDirectory(videosDir);
            }

            var fileExt = Path.GetExtension(file.FileName);
            if (string.IsNullOrWhiteSpace(fileExt)) fileExt = ".mp4";
            var uniqueFileName = $"video_{Guid.NewGuid():N}{fileExt}";
            var physicalPath = Path.Combine(videosDir, uniqueFileName);

            using (var stream = new FileStream(physicalPath, FileMode.Create))
            {
                await file.CopyToAsync(stream, cancellationToken);
            }

            // Tính mã băm SHA-256
            var checksum = await CalculateSha256Async(physicalPath);

            var mediaAsset = new MediaAsset
            {
                LessonId = lessonId ?? 0,
                MediaType = MediaType.Video,
                FileName = uniqueFileName,
                BlobKey = $"videos/{uniqueFileName}",
                ContentType = string.IsNullOrWhiteSpace(file.ContentType) ? "video/mp4" : file.ContentType,
                SizeBytes = file.Length,
                Checksum = checksum,
                Status = MediaAssetStatus.Ready,
                CreatedAt = DateTime.UtcNow
            };

            if (lessonId.HasValue && lessonId.Value > 0)
            {
                var lesson = await _dbContext.Lessons.FindAsync(new object[] { lessonId.Value }, cancellationToken);
                if (lesson != null)
                {
                    mediaAsset.LessonId = lesson.Id;
                }
            }

            _dbContext.MediaAssets.Add(mediaAsset);
            await _dbContext.SaveChangesAsync(cancellationToken);

            var streamUrl = $"/api/media/{mediaAsset.Id}/stream";
            var downloadUrl = $"{baseUrl.TrimEnd('/')}/api/media/{mediaAsset.Id}/download";

            return new UploadMediaResponse(
                mediaAsset.Id,
                mediaAsset.LessonId,
                mediaAsset.FileName,
                mediaAsset.SizeBytes,
                mediaAsset.ContentType,
                mediaAsset.Checksum,
                streamUrl,
                downloadUrl
            );
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