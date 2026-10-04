using Microlearning.Areas.Catalog.DTOs;
using Microlearning.Areas.Catalog.Interfaces;
using Microlearning.Exceptions;
using Microlearning.Model;
using Microlearning.Model.Entities;
using Microsoft.EntityFrameworkCore;

namespace Microlearning.Areas.Catalog.Services
{
    public class CourseService : ICourseService
    {
        private readonly ApplicationDbContext _dbContext;

        public CourseService(ApplicationDbContext dbContext)
        {
            _dbContext = dbContext;
        }

        public async Task<List<CourseResponse>> GetAllCoursesAsync()
        {
            var courses = await _dbContext.Courses
                .AsNoTracking()
                .Where(c => c.IsPublished)
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
                    c.Subjects.Count
                ))
                .ToListAsync();

            return courses;
        }

        public async Task<CourseDetailResponse> GetCourseByIdAsync(int courseId)
        {
            var course = await _dbContext.Courses
                .AsNoTracking()
                .Include(c => c.Subjects.OrderBy(s => s.SortOrder))
                    .ThenInclude(s => s.Lessons.Where(l => l.IsPublished).OrderBy(l => l.SortOrder))
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
                s.Lessons.Count
            )).ToList();

            return new CourseDetailResponse(
                course.Id,
                course.Title,
                course.Description,
                course.ThumbnailUrl,
                course.Version,
                course.IsPublished,
                course.CreatedAt,
                course.UpdatedAt,
                subjectResponses
            );
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
                Version = 1,
                CreatedAt = DateTime.UtcNow
            };

            _dbContext.Courses.Add(course);
            await _dbContext.SaveChangesAsync();

            return new CourseResponse(
                course.Id,
                course.Title,
                course.Description,
                course.ThumbnailUrl,
                course.Version,
                course.IsPublished,
                course.CreatedAt,
                course.UpdatedAt,
                0
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
            course.Version += 1; // Tăng version cho đồng bộ Delta Sync
            course.UpdatedAt = DateTime.UtcNow;

            await _dbContext.SaveChangesAsync();

            return new CourseResponse(
                course.Id,
                course.Title,
                course.Description,
                course.ThumbnailUrl,
                course.Version,
                course.IsPublished,
                course.CreatedAt,
                course.UpdatedAt
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

            return course.IsPublished;
        }
    }
}
