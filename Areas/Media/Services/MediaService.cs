using System.Security.Cryptography;
using Azure.Storage.Blobs;
using Azure.Storage.Blobs.Models;
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
        private readonly IConfiguration _config;
        private readonly ILogger<MediaService> _logger;

        public MediaService(
            ApplicationDbContext context,
            IWebHostEnvironment env,
            IValidationFactory validationFactory,
            IConfiguration config,
            ILogger<MediaService> logger)
        {
            _dbContext = context;
            _env = env;
            _validationFactory = validationFactory;
            _config = config;
            _logger = logger;
        }

        private BlobContainerClient? GetAzureBlobContainerClient()
        {
            var connectionString = _config["AzureBlobStorage:ConnectionString"]
                                ?? _config["ConnectionStrings:AzureBlobStorage"]
                                ?? _config["AzureBlobStorage__ConnectionString"]
                                ?? Environment.GetEnvironmentVariable("AZURE_STORAGE_CONNECTION_STRING")
                                ?? Environment.GetEnvironmentVariable("AzureBlobStorage__ConnectionString")
                                ?? Environment.GetEnvironmentVariable("CUSTOMCONNSTR_AzureBlobStorage");
            if (string.IsNullOrWhiteSpace(connectionString)) return null;

            var containerName = _config["AzureBlobStorage:ContainerName"]
                             ?? Environment.GetEnvironmentVariable("AzureBlobStorage__ContainerName")
                             ?? "videos";
            return new BlobContainerClient(connectionString, containerName);
        }

        public async Task<(Stream stream, string contentType, long fileLength, string fileName)> GetLessonVideoStreamAsync(int lessonId)
        {
            // 1. Tìm MediaAsset mới nhất gắn trực tiếp với bài học này
            var mediaAsset = await _dbContext.MediaAssets
                .AsNoTracking()
                .Where(m => m.LessonId == lessonId)
                .OrderByDescending(m => m.CreatedAt)
                .FirstOrDefaultAsync();

            // 2. Nếu bài học chưa có video tải lên -> Phát video demo test.mp4 dự phòng theo yêu cầu
            if (mediaAsset == null)
            {
                var fallbackDemo = GetFallbackDemoFilePath();
                if (fallbackDemo != null)
                {
                    var fileInfo = new FileInfo(fallbackDemo);
                    var stream = new FileStream(fallbackDemo, FileMode.Open, FileAccess.Read, FileShare.Read);
                    return (stream, "video/mp4", fileInfo.Length, "test.mp4");
                }
                throw new BusinessException($"Bài giảng ID {lessonId} chưa có video và không tìm thấy tệp dự phòng test.mp4.");
            }

            return await StreamMediaAssetInternalAsync(mediaAsset);
        }

        public async Task<(Stream stream, string contentType, long fileLength, string fileName)> GetVideoStreamAsync(int id)
        {
            // 1. Gửi qua nhà máy Validation để kiểm tra ID
            await _validationFactory.ValidateAsync(new GetMediaStreamRequest(id));

            // 2. Ưu tiên tìm theo LessonId trước (vì Player Client thường truyền ID của bài học)
            var mediaAsset = await _dbContext.MediaAssets
                .AsNoTracking()
                .Where(m => m.LessonId == id)
                .OrderByDescending(m => m.CreatedAt)
                .FirstOrDefaultAsync();

            // 3. Nếu không có bài học nào khớp, tìm theo Id tài nguyên MediaAsset
            if (mediaAsset == null)
            {
                mediaAsset = await _dbContext.MediaAssets
                    .AsNoTracking()
                    .Where(m => m.Id == id)
                    .OrderByDescending(m => m.CreatedAt)
                    .FirstOrDefaultAsync();
            }

            if (mediaAsset == null)
            {
                var fallbackDemo = GetFallbackDemoFilePath();
                if (fallbackDemo != null)
                {
                    var fileInfo = new FileInfo(fallbackDemo);
                    var stream = new FileStream(fallbackDemo, FileMode.Open, FileAccess.Read, FileShare.Read);
                    return (stream, "video/mp4", fileInfo.Length, "test.mp4");
                }
                throw new BusinessException($"Không tìm thấy tệp video hoặc bài học với ID = {id}.");
            }

            return await StreamMediaAssetInternalAsync(mediaAsset);
        }

        private async Task<(Stream stream, string contentType, long fileLength, string fileName)> StreamMediaAssetInternalAsync(MediaAsset mediaAsset)
        {
            var contentType = string.IsNullOrWhiteSpace(mediaAsset.ContentType)
                ? "video/mp4"
                : mediaAsset.ContentType;

            // 1. Kiểm tra tệp vật lý cục bộ chính xác trên đĩa trước (nếu có cache trên máy)
            var filePath = GetPhysicalFilePath(mediaAsset.FileName);
            if (!string.IsNullOrEmpty(filePath) && File.Exists(filePath))
            {
                var fileInfo = new FileInfo(filePath);
                var stream = new FileStream(filePath, FileMode.Open, FileAccess.Read, FileShare.Read);
                return (stream, contentType, fileInfo.Length, mediaAsset.FileName);
            }

            // 2. Nếu không có trên đĩa cứng máy chủ, lấy trực tiếp từ kho Azure Blob Storage
            var containerClient = GetAzureBlobContainerClient();
            if (containerClient != null)
            {
                try
                {
                    var blobClient = containerClient.GetBlobClient(mediaAsset.FileName);
                    if (await blobClient.ExistsAsync())
                    {
                        var properties = await blobClient.GetPropertiesAsync();
                        var blobStream = await blobClient.OpenReadAsync(new BlobOpenReadOptions(allowModifications: false));
                        return (blobStream, contentType, properties.Value.ContentLength, mediaAsset.FileName);
                    }
                }
                catch (Exception ex)
                {
                    _logger.LogWarning(ex, "Không thể đọc trực tiếp từ Azure Blob Storage: {Message}", ex.Message);
                }
            }

            // 3. Nếu tệp vật lý chưa sẵn sàng trên đám mây, dự phòng tệp test.mp4 để trải nghiệm người dùng không bị gián đoạn
            var fallbackPath = GetFallbackDemoFilePath();
            if (fallbackPath != null)
            {
                _logger.LogWarning("Tệp {FileName} chưa sẵn sàng, tự động phát dự phòng test.mp4", mediaAsset.FileName);
                var fileInfo = new FileInfo(fallbackPath);
                var stream = new FileStream(fallbackPath, FileMode.Open, FileAccess.Read, FileShare.Read);
                return (stream, "video/mp4", fileInfo.Length, "test.mp4");
            }

            throw new BusinessException($"Tệp video '{mediaAsset.FileName}' không tìm thấy trên kho lưu trữ đám mây Azure Blob Storage.");
        }

        public async Task<MediaDownloadInfoResponse> GetDownloadInfoAsync(int mediaId, string baseUrl)
        {
            // 1. Gửi qua nhà máy Validation để kiểm tra MediaId và BaseUrl
            await _validationFactory.ValidateAsync(new GetMediaDownloadInfoRequest(mediaId, baseUrl));

            // 2. Tìm thông tin trong DB (hỗ trợ cả tìm theo mediaId hoặc lessonId)
            var mediaAsset = await _dbContext.MediaAssets
                .Where(m => m.Id == mediaId || m.LessonId == mediaId)
                .OrderByDescending(m => m.Id == mediaId)
                .ThenByDescending(m => m.CreatedAt)
                .FirstOrDefaultAsync();

            if (mediaAsset == null)
            {
                throw new BusinessException($"Không tìm thấy tệp video với ID = {mediaId}.");
            }

            var filePath = GetPhysicalFilePath(mediaAsset.FileName);
            long actualSize = mediaAsset.SizeBytes;

            if (!string.IsNullOrEmpty(filePath) && File.Exists(filePath))
            {
                var fileInfo = new FileInfo(filePath);
                actualSize = fileInfo.Length;

                // Tự động tính mã băm SHA-256 và kích thước nếu chưa có
                if (string.IsNullOrWhiteSpace(mediaAsset.Checksum) || mediaAsset.SizeBytes != actualSize)
                {
                    mediaAsset.Checksum = await CalculateSha256Async(filePath);
                    mediaAsset.SizeBytes = actualSize;
                    mediaAsset.UpdatedAt = DateTime.UtcNow;
                    await _dbContext.SaveChangesAsync();
                }
            }
            else
            {
                // Kiểm tra kích thước từ Azure Blob Storage nếu file không còn trên đĩa
                var containerClient = GetAzureBlobContainerClient();
                if (containerClient != null)
                {
                    try
                    {
                        var blobClient = containerClient.GetBlobClient(mediaAsset.FileName);
                        if (await blobClient.ExistsAsync())
                        {
                            var properties = await blobClient.GetPropertiesAsync();
                            actualSize = properties.Value.ContentLength;
                            if (mediaAsset.SizeBytes != actualSize)
                            {
                                mediaAsset.SizeBytes = actualSize;
                                mediaAsset.UpdatedAt = DateTime.UtcNow;
                                await _dbContext.SaveChangesAsync();
                            }
                        }
                    }
                    catch (Exception ex)
                    {
                        _logger.LogWarning(ex, "Không thể lấy thông tin từ Azure Blob: {Message}", ex.Message);
                    }
                }
            }

            var downloadUrl = $"{baseUrl.TrimEnd('/')}/api/media/{mediaAsset.Id}/download";

            return new MediaDownloadInfoResponse
            {
                MediaId = mediaAsset.Id,
                FileName = mediaAsset.FileName,
                ContentType = string.IsNullOrWhiteSpace(mediaAsset.ContentType) ? "video/mp4" : mediaAsset.ContentType,
                FileSizeBytes = actualSize,
                Checksum = mediaAsset.Checksum,
                DownloadUrl = downloadUrl
            };
        }

        private string? GetPhysicalFilePath(string fileName)
        {
            var rootPath = _env.WebRootPath ?? Path.Combine(Directory.GetCurrentDirectory(), "wwwroot");

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

            return null;
        }

        private string? GetFallbackDemoFilePath()
        {
            var rootPath = _env.WebRootPath ?? Path.Combine(Directory.GetCurrentDirectory(), "wwwroot");

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

            return null;
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

            // 1. Tải lên kho lưu trữ đám mây Azure Blob Storage (Lưu vĩnh viễn không bao giờ mất)
            string blobKey = $"videos/{uniqueFileName}";
            var containerClient = GetAzureBlobContainerClient();
            if (containerClient != null)
            {
                try
                {
                    // Tự động tạo container nếu chưa có
                    await containerClient.CreateIfNotExistsAsync(cancellationToken: cancellationToken);
                    var blobClient = containerClient.GetBlobClient(uniqueFileName);
                    using (var uploadStream = file.OpenReadStream())
                    {
                        await blobClient.UploadAsync(uploadStream, new BlobHttpHeaders
                        {
                            ContentType = string.IsNullOrWhiteSpace(file.ContentType) ? "video/mp4" : file.ContentType
                        }, cancellationToken: cancellationToken);
                    }
                    blobKey = blobClient.Uri.ToString();
                    _logger.LogInformation("Đã tải video lên Azure Blob Storage vĩnh viễn: {BlobKey}", blobKey);
                }
                catch (Exception ex)
                {
                    _logger.LogError(ex, "Lỗi tải video lên Azure Blob Storage: {Message}", ex.Message);
                    throw new BusinessException($"Không thể lưu trữ tệp video lên kho đám mây Azure Blob Storage: {ex.Message}. Vui lòng kiểm tra quyền hạn của Azure Storage Account hoặc Connection String.");
                }
            }
            else
            {
                _logger.LogWarning("Chưa cấu hình Azure Blob Storage Connection String! Video chỉ được lưu tạm trên đĩa cứng máy chủ.");
            }

            // 2. Lưu bản sao vật lý trên máy chủ cục bộ (để đệm tốc độ)
            try
            {
                using (var stream = new FileStream(physicalPath, FileMode.Create))
                {
                    await file.CopyToAsync(stream, cancellationToken);
                }
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "Không thể lưu tệp video vật lý trên ổ đĩa máy chủ: {Message}", ex.Message);
            }

            // 3. Tính mã băm SHA-256
            string checksum = string.Empty;
            if (File.Exists(physicalPath))
            {
                checksum = await CalculateSha256Async(physicalPath);
            }

            var mediaAsset = new MediaAsset
            {
                LessonId = lessonId ?? 0,
                MediaType = MediaType.Video,
                FileName = uniqueFileName,
                BlobKey = blobKey,
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

        public async Task<LessonMediaInfoResponse> LinkExternalMediaAsync(LinkExternalMediaRequest request, string baseUrl, CancellationToken cancellationToken = default)
        {
            if (string.IsNullOrWhiteSpace(request.Url))
            {
                throw new BusinessException("Vui lòng nhập đường dẫn URL video hợp lệ.");
            }

            var cleanUrl = request.Url.Trim();
            if (!Uri.TryCreate(cleanUrl, UriKind.Absolute, out var uriResult) ||
                (uriResult.Scheme != Uri.UriSchemeHttp && uriResult.Scheme != Uri.UriSchemeHttps))
            {
                throw new BusinessException("Đường dẫn URL video không hợp lệ. Vui lòng nhập link đầy đủ bắt đầu bằng http:// hoặc https://.");
            }

            var lesson = await _dbContext.Lessons.FindAsync(new object[] { request.LessonId }, cancellationToken);
            if (lesson == null)
            {
                throw new BusinessException($"Không tìm thấy bài học với ID = {request.LessonId}.");
            }

            var (sourceType, embedUrl, contentType) = ParseVideoSource(cleanUrl);

            var title = !string.IsNullOrWhiteSpace(request.Title)
                ? request.Title.Trim()
                : $"Liên kết {sourceType.ToUpperInvariant()} - {lesson.Title}";

            var mediaAsset = new MediaAsset
            {
                LessonId = lesson.Id,
                MediaType = MediaType.Video,
                FileName = title,
                BlobKey = cleanUrl,
                ContentType = contentType,
                SizeBytes = 0,
                DurationSeconds = request.DurationSeconds ?? (lesson.DurationSeconds > 0 ? lesson.DurationSeconds : 180),
                Status = MediaAssetStatus.Ready,
                CreatedAt = DateTime.UtcNow
            };

            if (request.DurationSeconds.HasValue && request.DurationSeconds.Value > 0)
            {
                lesson.DurationSeconds = request.DurationSeconds.Value;
            }

            _dbContext.MediaAssets.Add(mediaAsset);
            await _dbContext.SaveChangesAsync(cancellationToken);

            var streamUrl = sourceType == "direct_url" ? cleanUrl : $"{baseUrl.TrimEnd('/')}/api/media/lesson/{lesson.Id}/stream";

            return new LessonMediaInfoResponse(
                lesson.Id,
                mediaAsset.Id,
                sourceType,
                streamUrl,
                cleanUrl,
                embedUrl,
                contentType,
                0
            );
        }

        public async Task<LessonMediaInfoResponse> GetLessonMediaInfoAsync(int lessonId, string baseUrl)
        {
            var mediaAsset = await _dbContext.MediaAssets
                .AsNoTracking()
                .Where(m => m.LessonId == lessonId)
                .OrderByDescending(m => m.CreatedAt)
                .FirstOrDefaultAsync();

            if (mediaAsset == null)
            {
                var demoUrl = $"{baseUrl.TrimEnd('/')}/videos/test.mp4";
                return new LessonMediaInfoResponse(
                    lessonId,
                    null,
                    "demo",
                    demoUrl,
                    null,
                    null,
                    "video/mp4",
                    17979812
                );
            }

            if (mediaAsset.BlobKey.StartsWith("http://", StringComparison.OrdinalIgnoreCase) ||
                mediaAsset.BlobKey.StartsWith("https://", StringComparison.OrdinalIgnoreCase))
            {
                var (sourceType, embedUrl, contentType) = ParseVideoSource(mediaAsset.BlobKey);
                var streamUrl = sourceType == "direct_url" ? mediaAsset.BlobKey : $"{baseUrl.TrimEnd('/')}/api/media/lesson/{lessonId}/stream";

                return new LessonMediaInfoResponse(
                    lessonId,
                    mediaAsset.Id,
                    sourceType,
                    streamUrl,
                    mediaAsset.BlobKey,
                    embedUrl,
                    contentType,
                    mediaAsset.SizeBytes
                );
            }

            return new LessonMediaInfoResponse(
                lessonId,
                mediaAsset.Id,
                "azure",
                $"{baseUrl.TrimEnd('/')}/api/media/lesson/{lessonId}/stream",
                null,
                null,
                string.IsNullOrWhiteSpace(mediaAsset.ContentType) ? "video/mp4" : mediaAsset.ContentType,
                mediaAsset.SizeBytes
            );
        }

        private static (string sourceType, string? embedUrl, string contentType) ParseVideoSource(string rawUrl)
        {
            if (string.IsNullOrWhiteSpace(rawUrl))
            {
                return ("demo", null, "video/mp4");
            }

            var url = rawUrl.Trim();

            // 1. YouTube
            var ytMatch = System.Text.RegularExpressions.Regex.Match(
                url,
                @"(?:youtube\.com\/(?:watch\?.*v=|embed\/|shorts\/)|youtu\.be\/)([\w-]{11})",
                System.Text.RegularExpressions.RegexOptions.IgnoreCase
            );
            if (ytMatch.Success)
            {
                var videoId = ytMatch.Groups[1].Value;
                return ("youtube", $"https://www.youtube.com/embed/{videoId}?enablejsapi=1&rel=0&modestbranding=1", "video/youtube");
            }

            // 2. Vimeo
            var vimeoMatch = System.Text.RegularExpressions.Regex.Match(
                url,
                @"vimeo\.com\/(?:channels\/(?:\w+\/)?|groups\/([^\/]*)\/videos\/|album\/(\d+)\/video\/|)(\d+)",
                System.Text.RegularExpressions.RegexOptions.IgnoreCase
            );
            if (vimeoMatch.Success)
            {
                var videoId = vimeoMatch.Groups[3].Value;
                return ("vimeo", $"https://player.vimeo.com/video/{videoId}?badge=0&autopause=0", "video/vimeo");
            }

            // 3. Direct URL / MP4 / WebM
            var lower = url.ToLowerInvariant();
            if (lower.EndsWith(".webm"))
            {
                return ("direct_url", null, "video/webm");
            }
            if (lower.EndsWith(".mov"))
            {
                return ("direct_url", null, "video/quicktime");
            }

            return ("direct_url", null, "video/mp4");
        }
    }
}