using Microlearning.Areas.Auth.Interfaces;
using Microlearning.Areas.Catalog.DTOs;
using Microlearning.Areas.Catalog.Interfaces;
using Microlearning.Exceptions;
using Microlearning.Model;
using Microlearning.Model.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Caching.Memory;

namespace Microlearning.Areas.Catalog.Services
{
    public class CourseService : ICourseService
    {
        private readonly ApplicationDbContext _dbContext;
        private readonly IHashService _hashService;
        private readonly IConfiguration _configuration;
        private readonly IMemoryCache _cache;

        private string PasswordSecret => _configuration["CourseAccess:SecretKey"] ?? "Microlearning_Course_Secret_Salt_Key_2026!";

        public CourseService(
            ApplicationDbContext dbContext,
            IHashService hashService,
            IConfiguration configuration,
            IMemoryCache cache)
        {
            _dbContext = dbContext;
            _hashService = hashService;
            _configuration = configuration;
            _cache = cache;
        }

        public async Task<List<CourseResponse>> GetAllCoursesAsync(bool includeUnpublished = false)
        {
            string cacheKey = $"courses_list_{includeUnpublished}";

            if (_cache.TryGetValue(cacheKey, out List<CourseResponse>? cachedCourses) && cachedCourses != null)
            {
                return cachedCourses;
            }

            var query = _dbContext.Courses.AsNoTracking();
            if (!includeUnpublished)
            {
                query = query.Where(c => c.IsPublished);
            }

            var courses = await query
                .OrderByDescending(c => c.CreatedAt)
                .Select(c => new CourseResponse(
                    c.Id,
                    c.Title,
                    c.Description,
                    c.ThumbnailUrl,
                    c.Version,
                    c.IsPublished,
                    c.CreatedAt,
                    c.UpdatedAt,
                    c.Subjects.Count,
                    c.IsPrivate
                ))
                .ToListAsync();

            var cacheEntryOptions = new MemoryCacheEntryOptions()
                .SetSlidingExpiration(TimeSpan.FromMinutes(30))
                .SetAbsoluteExpiration(TimeSpan.FromHours(2));

            _cache.Set(cacheKey, courses, cacheEntryOptions);

            return courses;
        }

        public async Task<CourseDetailResponse> GetCourseByIdAsync(int courseId, bool includeUnpublished = false)
        {
            string cacheKey = $"course_detail_{courseId}_{includeUnpublished}";

            if (_cache.TryGetValue(cacheKey, out CourseDetailResponse? cachedCourse) && cachedCourse != null)
            {
                return cachedCourse;
            }

            var course = await _dbContext.Courses
                .AsNoTracking()
                .Include(c => c.Subjects.OrderBy(s => s.SortOrder))
                    .ThenInclude(s => s.Lessons.Where(l => includeUnpublished || l.IsPublished).OrderBy(l => l.SortOrder))
                        .ThenInclude(l => l.Quiz)
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
                s.Lessons.Select(l => new LessonResponse(
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
                    l.Quiz != null,
                    l.MediaAssets.Count
                )).ToList()
            )).ToList();

            var response = new CourseDetailResponse(
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
                !course.IsPrivate
            );

            var cacheEntryOptions = new MemoryCacheEntryOptions()
                .SetSlidingExpiration(TimeSpan.FromMinutes(30))
                .SetAbsoluteExpiration(TimeSpan.FromHours(2));

            _cache.Set(cacheKey, response, cacheEntryOptions);

            return response;
        }

        public async Task<CourseResponse> CreateCourseAsync(CreateCourseRequest request)
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
                course.IsPrivate
            );
        }

        public async Task<CourseResponse> UpdateCourseAsync(int courseId, UpdateCourseRequest request)
        {
            var course = await _dbContext.Courses.FindAsync(courseId);
            if (course == null)
            {
                throw new BusinessException($"Không tìm thấy khóa học với mã {courseId} để cập nhật.");
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

            course.Version += 1; // Tăng version cho đồng bộ Delta Sync
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
                course.IsPrivate
            );
        }

        public async Task<bool> DeleteCourseAsync(int courseId)
        {
            var course = await _dbContext.Courses.FindAsync(courseId);
            if (course == null)
            {
                throw new BusinessException($"Không tìm thấy khóa học với mã {courseId} để xóa.");
            }

            _dbContext.Courses.Remove(course);
            await _dbContext.SaveChangesAsync();

            InvalidateCourseCache(courseId);

            return true;
        }

        public async Task<bool> TogglePublishAsync(int courseId)
        {
            var course = await _dbContext.Courses.FindAsync(courseId);
            if (course == null)
            {
                throw new BusinessException($"Không tìm thấy khóa học với mã {courseId}.");
            }

            course.IsPublished = !course.IsPublished;
            course.UpdatedAt = DateTime.UtcNow;
            await _dbContext.SaveChangesAsync();

            InvalidateCourseCache(courseId);

            return course.IsPublished;
        }

        private void InvalidateCourseCache(int? courseId = null)
        {
            _cache.Remove("courses_list_true");
            _cache.Remove("courses_list_false");

            if (courseId.HasValue)
            {
                _cache.Remove($"course_detail_{courseId.Value}_true");
                _cache.Remove($"course_detail_{courseId.Value}_false");
            }
        }
    }
}
