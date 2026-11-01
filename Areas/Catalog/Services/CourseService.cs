using Azure.Storage.Blobs;
using Azure.Storage.Blobs.Models;
using Microlearning.Areas.Auth.Interfaces;
using Microlearning.Areas.Catalog.DTOs;
using Microlearning.Areas.Catalog.Interfaces;
using Microlearning.Exceptions;
using Microlearning.Model;
using Microlearning.Model.Entities;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Http;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Caching.Memory;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;

namespace Microlearning.Areas.Catalog.Services
{
    public class CourseService : ICourseService
    {
        private readonly ApplicationDbContext _dbContext;
        private readonly IHashService _hashService;
        private readonly IConfiguration _configuration;
        private readonly IWebHostEnvironment _env;
        private readonly ILogger<CourseService> _logger;

        private string PasswordSecret => _configuration["CourseAccess:SecretKey"] ?? "Microlearning_Course_Secret_Salt_Key_2026!";

        public CourseService(
            ApplicationDbContext dbContext,
            IHashService hashService,
            IConfiguration configuration,
            IWebHostEnvironment env,
            ILogger<CourseService> logger,
            IMemoryCache? cache = null)
        {
            _dbContext = dbContext;
            _hashService = hashService;
            _configuration = configuration;
            _env = env;
            _logger = logger;
        }

        private BlobContainerClient? GetAzureBlobContainerClient()
        {
            var connectionString = _configuration["AzureBlobStorage:ConnectionString"]
                                ?? _configuration["ConnectionStrings:AzureBlobStorage"]
                                ?? _configuration["AzureBlobStorage__ConnectionString"]
                                ?? Environment.GetEnvironmentVariable("AZURE_STORAGE_CONNECTION_STRING")
                                ?? Environment.GetEnvironmentVariable("AzureBlobStorage__ConnectionString")
                                ?? Environment.GetEnvironmentVariable("CUSTOMCONNSTR_AzureBlobStorage");
            if (string.IsNullOrWhiteSpace(connectionString)) return null;

            var containerName = _configuration["AzureBlobStorage:ContainerName"]
                             ?? Environment.GetEnvironmentVariable("AzureBlobStorage__ContainerName")
                             ?? "videos";
            return new BlobContainerClient(connectionString, containerName);
        }

        public async Task<List<CourseResponse>> GetAllCoursesAsync(bool includeUnpublished = false, string? currentUserId = null, bool isAdmin = false)
        {
            var query = _dbContext.Courses.AsNoTracking();
            if (!includeUnpublished)
            {
                query = query.Where(c => c.IsPublished);
            }
            else
            {
                // Studio Quản lý: Chỉ Admin thấy toàn bộ, Giáo viên chỉ thấy các khóa học do mình tạo
                if (!isAdmin && !string.IsNullOrEmpty(currentUserId))
                {
                    query = query.Where(c => c.CreatedByAccountId == currentUserId);
                }
                else if (!isAdmin && string.IsNullOrEmpty(currentUserId))
                {
                    query = query.Where(c => false);
                }
            }

            var courses = await query
                .OrderByDescending(c => c.CreatedAt)
                .Select(c => new
                {
                    c.Id,
                    c.Title,
                    c.Description,
                    c.ThumbnailUrl,
                    c.Version,
                    c.IsPublished,
                    c.CreatedAt,
                    c.UpdatedAt,
                    SubjectsCount = c.Subjects.Count,
                    c.IsPrivate,
                    c.AuthorName,
                    c.CreatedByAccountId
                })
                .ToListAsync();

            var creatorIds = courses.Where(c => !string.IsNullOrEmpty(c.CreatedByAccountId)).Select(c => c.CreatedByAccountId!).Distinct().ToList();
            var creatorsMap = await _dbContext.Users.AsNoTracking()
                .Where(u => creatorIds.Contains(u.Id))
                .ToDictionaryAsync(u => u.Id, u => $"[Giáo viên/Admin] {(!string.IsNullOrWhiteSpace(u.FullName) ? u.FullName : u.UserName)} ({u.Email ?? u.UserName})");

            return courses.Select(c =>
            {
                bool canEdit = isAdmin || string.IsNullOrEmpty(c.CreatedByAccountId) || (!string.IsNullOrEmpty(currentUserId) && c.CreatedByAccountId == currentUserId);
                string displayAuthor = c.AuthorName;
                if (string.IsNullOrWhiteSpace(displayAuthor))
                {
                    if (!string.IsNullOrEmpty(c.CreatedByAccountId) && creatorsMap.TryGetValue(c.CreatedByAccountId, out var foundName))
                    {
                        displayAuthor = foundName;
                    }
                    else
                    {
                        displayAuthor = "Nguồn: [Hệ Thống] Ban Quản Trị EduSync";
                    }
                }

                return new CourseResponse(
                    c.Id,
                    c.Title,
                    c.Description,
                    c.ThumbnailUrl,
                    c.Version,
                    c.IsPublished,
                    c.CreatedAt,
                    c.UpdatedAt,
                    c.SubjectsCount,
                    c.IsPrivate,
                    displayAuthor,
                    c.CreatedByAccountId,
                    canEdit
                );
            }).ToList();
        }

        public async Task<CourseDetailResponse> GetCourseByIdAsync(int courseId, bool includeUnpublished = false, string? currentUserId = null, bool isAdmin = false)
        {
            var course = await _dbContext.Courses
                .AsNoTracking()
                .Include(c => c.Subjects.OrderBy(s => s.SortOrder))
                    .ThenInclude(s => s.Lessons.Where(l => includeUnpublished || l.IsPublished).OrderBy(l => l.SortOrder))
                        .ThenInclude(l => l.Quizzes)
                .Include(c => c.Subjects.OrderBy(s => s.SortOrder))
                    .ThenInclude(s => s.Lessons.Where(l => includeUnpublished || l.IsPublished).OrderBy(l => l.SortOrder))
                        .ThenInclude(l => l.MediaAssets)
                .FirstOrDefaultAsync(c => c.Id == courseId);

            if (course == null)
            {
                throw new BusinessException($"Không tìm thấy khóa học với mã {courseId}.");
            }

            var subjectResponses = course.Subjects.Select(s => new SubjectResponse(
                s.Id,
                s.CourseId,
                s.Title,
                s.Description,
                s.SortOrder,
                s.CreatedAt,
                s.UpdatedAt,
                s.Lessons.Count,
                s.Lessons.Select(l =>
                {
                    var latestMedia = l.MediaAssets.OrderByDescending(m => m.CreatedAt).FirstOrDefault();
                    string? videoUrl = latestMedia?.BlobKey;
                    if (!string.IsNullOrWhiteSpace(videoUrl) &&
                        !videoUrl.StartsWith("http://", StringComparison.OrdinalIgnoreCase) &&
                        !videoUrl.StartsWith("https://", StringComparison.OrdinalIgnoreCase))
                    {
                        videoUrl = $"/api/media/lesson/{l.Id}/stream";
                    }

                    return new LessonResponse(
                        l.Id,
                        l.SubjectId,
                        l.Title,
                        l.Description,
                        l.DurationSeconds,
                        l.SortOrder,
                        l.Version,
                        l.IsPublished,
                        l.CreatedAt,
                        l.UpdatedAt,
                        (l.Quizzes != null && l.Quizzes.Count > 0),
                        l.MediaAssets.Count,
                        videoUrl
                    );
                }).ToList()
            )).ToList();

            bool canEdit = isAdmin || string.IsNullOrEmpty(course.CreatedByAccountId) || (!string.IsNullOrEmpty(currentUserId) && course.CreatedByAccountId == currentUserId);

            return new CourseDetailResponse(
                course.Id,
                course.Title,
                course.Description,
                course.ThumbnailUrl,
                course.Version,
                course.IsPublished,
                course.CreatedAt,
                course.UpdatedAt,
                subjectResponses,
                course.IsPrivate,
                !course.IsPrivate,
                !string.IsNullOrWhiteSpace(course.AuthorName) ? course.AuthorName : "Nguồn: [Hệ Thống] Ban Quản Trị EduSync",
                course.CreatedByAccountId,
                canEdit
            );
        }

        public async Task<CourseResponse> CreateCourseAsync(CreateCourseRequest request, string? currentUserId = null, string? authorName = null)
        {
            if (string.IsNullOrWhiteSpace(request.Title))
            {
                throw new BusinessException("Tiêu đề khóa học không được để trống.");
            }

            var course = new Course
            {
                Title = request.Title.Trim(),
                Description = request.Description?.Trim(),
                ThumbnailUrl = request.ThumbnailUrl?.Trim(),
                CreatedByAccountId = currentUserId,
                AuthorName = !string.IsNullOrWhiteSpace(authorName) ? authorName.Trim() : "Giảng viên EduSync",
                IsPublished = request.IsPublished,
                IsPrivate = request.IsPrivate,
                PasswordVersion = 1,
                Version = 1,
                CreatedAt = DateTime.UtcNow
            };

            if (request.IsPrivate)
            {
                if (string.IsNullOrWhiteSpace(request.AccessPassword))
                {
                    throw new BusinessException("Khóa học ở chế độ Riêng tư bắt buộc phải thiết lập mật khẩu truy cập.");
                }
                course.AccessPasswordHash = _hashService.Hash(request.AccessPassword.Trim(), PasswordSecret);
            }

            _dbContext.Courses.Add(course);
            await _dbContext.SaveChangesAsync();

            InvalidateCourseCache();

            return new CourseResponse(
                course.Id,
                course.Title,
                course.Description,
                course.ThumbnailUrl,
                course.Version,
                course.IsPublished,
                course.CreatedAt,
                course.UpdatedAt,
                0,
                course.IsPrivate,
                course.AuthorName,
                course.CreatedByAccountId,
                true
            );
        }

        public async Task<CourseResponse> UpdateCourseAsync(int courseId, UpdateCourseRequest request, string? currentUserId = null, bool isAdmin = false)
        {
            var course = await _dbContext.Courses
                .Include(c => c.Subjects)
                .FirstOrDefaultAsync(c => c.Id == courseId);
            if (course == null)
            {
                throw new BusinessException($"Không tìm thấy khóa học với mã {courseId} để cập nhật.");
            }

            // Phân quyền: Chỉ tác giả khóa học hoặc Admin mới được phép cập nhật
            if (!isAdmin && !string.IsNullOrEmpty(course.CreatedByAccountId) && course.CreatedByAccountId != currentUserId)
            {
                throw new BusinessException($"Bạn không có quyền chỉnh sửa khóa học này. Khóa học được tạo bởi '{course.AuthorName ?? "giảng viên khác"}'. Chỉ tác giả hoặc Admin mới có quyền thực hiện.");
            }

            // Nếu khóa học cũ chưa gán tác giả thì gán cho người chỉnh sửa đầu tiên
            if (string.IsNullOrEmpty(course.CreatedByAccountId) && !string.IsNullOrEmpty(currentUserId))
            {
                course.CreatedByAccountId = currentUserId;
            }

            if (string.IsNullOrWhiteSpace(request.Title))
            {
                throw new BusinessException("Tiêu đề khóa học không được để trống.");
            }

            course.Title = request.Title.Trim();
            course.Description = request.Description?.Trim();
            course.ThumbnailUrl = request.ThumbnailUrl?.Trim();
            course.IsPublished = request.IsPublished;
            course.IsPrivate = request.IsPrivate;

            if (request.IsPrivate)
            {
                if (!string.IsNullOrWhiteSpace(request.AccessPassword))
                {
                    course.AccessPasswordHash = _hashService.Hash(request.AccessPassword.Trim(), PasswordSecret);
                    course.PasswordVersion += 1;
                }
                else if (string.IsNullOrEmpty(course.AccessPasswordHash))
                {
                    throw new BusinessException("Khóa học ở chế độ Riêng tư bắt buộc phải thiết lập mật khẩu truy cập.");
                }
            }
            else
            {
                course.AccessPasswordHash = null;
            }

            course.Version += 1;
            course.UpdatedAt = DateTime.UtcNow;

            await _dbContext.SaveChangesAsync();

            InvalidateCourseCache(courseId);

            return new CourseResponse(
                course.Id,
                course.Title,
                course.Description,
                course.ThumbnailUrl,
                course.Version,
                course.IsPublished,
                course.CreatedAt,
                course.UpdatedAt,
                course.Subjects?.Count ?? 0,
                course.IsPrivate,
                course.AuthorName ?? "EduSync Master",
                course.CreatedByAccountId,
                true
            );
        }

        public async Task<bool> DeleteCourseAsync(int courseId, string? currentUserId = null, bool isAdmin = false)
        {
            var course = await _dbContext.Courses.FindAsync(courseId);
            if (course != null)
            {
                // Phân quyền: Chỉ tác giả khóa học hoặc Admin mới được phép xóa
                if (!isAdmin && !string.IsNullOrEmpty(course.CreatedByAccountId) && course.CreatedByAccountId != currentUserId)
                {
                    throw new BusinessException($"Bạn không có quyền xóa khóa học này. Khóa học được tạo bởi '{course.AuthorName ?? "giảng viên khác"}'. Chỉ tác giả hoặc Admin mới có quyền xóa.");
                }

                _dbContext.Courses.Remove(course);
                await _dbContext.SaveChangesAsync();
            }

            InvalidateCourseCache(courseId);
            return true;
        }

        public async Task<bool> TogglePublishAsync(int courseId, string? currentUserId = null, bool isAdmin = false)
        {
            var course = await _dbContext.Courses.FindAsync(courseId);
            if (course == null)
            {
                throw new BusinessException($"Không tìm thấy khóa học với mã {courseId}.");
            }

            // Phân quyền: Chỉ tác giả khóa học hoặc Admin mới được phép đổi trạng thái
            if (!isAdmin && !string.IsNullOrEmpty(course.CreatedByAccountId) && course.CreatedByAccountId != currentUserId)
            {
                throw new BusinessException($"Bạn không có quyền thay đổi trạng thái khóa học của '{course.AuthorName ?? "giảng viên khác"}'.");
            }

            course.IsPublished = !course.IsPublished;
            course.UpdatedAt = DateTime.UtcNow;
            await _dbContext.SaveChangesAsync();

            InvalidateCourseCache(courseId);

            return course.IsPublished;
        }

        public async Task<bool> CanUserManageCourseAsync(int courseId, string? currentUserId, bool isAdmin)
        {
            if (isAdmin) return true;
            if (string.IsNullOrEmpty(currentUserId)) return false;

            var course = await _dbContext.Courses.AsNoTracking().FirstOrDefaultAsync(c => c.Id == courseId);
            if (course == null) return false;

            if (string.IsNullOrEmpty(course.CreatedByAccountId)) return true;
            return course.CreatedByAccountId == currentUserId;
        }

        public async Task<string> UploadThumbnailAsync(IFormFile file, CancellationToken cancellationToken = default)
        {
            if (file == null || file.Length == 0)
            {
                throw new BusinessException("Vui lòng chọn tệp ảnh hợp lệ.");
            }

            var ext = Path.GetExtension(file.FileName).ToLowerInvariant();
            var allowedExtensions = new[] { ".jpg", ".jpeg", ".png", ".webp", ".gif" };
            if (!allowedExtensions.Contains(ext))
            {
                throw new BusinessException("Định dạng tệp không được hỗ trợ. Vui lòng chọn ảnh JPG, PNG hoặc WebP.");
            }

            if (file.Length > 10 * 1024 * 1024)
            {
                throw new BusinessException("Kích thước tệp vượt quá giới hạn 10MB.");
            }

            var uniqueFileName = $"thumb_{Guid.NewGuid():N}{ext}";

            // 1. Thử tải lên Azure Blob Storage nếu có
            var containerClient = GetAzureBlobContainerClient();
            if (containerClient != null)
            {
                try
                {
                    await containerClient.CreateIfNotExistsAsync(cancellationToken: cancellationToken);
                    var blobClient = containerClient.GetBlobClient($"thumbnails/{uniqueFileName}");
                    using (var uploadStream = file.OpenReadStream())
                    {
                        await blobClient.UploadAsync(uploadStream, new BlobHttpHeaders
                        {
                            ContentType = string.IsNullOrWhiteSpace(file.ContentType) ? "image/jpeg" : file.ContentType
                        }, cancellationToken: cancellationToken);
                    }
                    _logger.LogInformation("Đã tải ảnh thumbnail khóa học lên Azure Blob: {Uri}", blobClient.Uri);
                    return blobClient.Uri.ToString();
                }
                catch (Exception ex)
                {
                    _logger.LogWarning(ex, "Không thể tải lên Azure Blob, chuyển sang lưu cục bộ: {Message}", ex.Message);
                }
            }

            // 2. Lưu trữ cục bộ vào wwwroot/thumbnails
            var rootPath = _env.WebRootPath ?? Path.Combine(Directory.GetCurrentDirectory(), "wwwroot");
            var thumbDir = Path.Combine(rootPath, "thumbnails");
            if (!Directory.Exists(thumbDir))
            {
                Directory.CreateDirectory(thumbDir);
            }

            var physicalPath = Path.Combine(thumbDir, uniqueFileName);
            using (var stream = new FileStream(physicalPath, FileMode.Create))
            {
                await file.CopyToAsync(stream, cancellationToken);
            }

            return $"/thumbnails/{uniqueFileName}";
        }

        public void InvalidateCache(int? courseId = null)
        {
        }

        private void InvalidateCourseCache(int? courseId = null) => InvalidateCache(courseId);
    }
}
