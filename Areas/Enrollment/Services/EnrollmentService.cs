using Microlearning.Areas.Enrollment.DTOs;
using Microlearning.Areas.Enrollment.Interfaces;
using Microlearning.Exceptions;
using Microlearning.Model;
using Microlearning.Model.Entities.Enums;
using Microsoft.EntityFrameworkCore;

namespace Microlearning.Areas.Enrollment.Services
{
    public class EnrollmentService : IEnrollmentService
    {
        private readonly ApplicationDbContext _dbContext;

        public EnrollmentService(ApplicationDbContext dbContext)
        {
            _dbContext = dbContext;
        }

        public async Task<EnrollmentResponse> EnrollCourseAsync(string accountId, int courseId)
        {
            var course = await _dbContext.Courses.FirstOrDefaultAsync(c => c.Id == courseId);
            if (course == null)
            {
                throw new BusinessException($"Khóa học với mã {courseId} không tồn tại.");
            }

            if (!course.IsPublished)
            {
                throw new BusinessException("Khóa học này hiện chưa được xuất bản.");
            }

            var existing = await _dbContext.Enrollments
                .FirstOrDefaultAsync(e => e.AccountId == accountId && e.CourseId == courseId);

            if (existing != null)
            {
                var totalLessons = await _dbContext.Lessons
                    .AsNoTracking()
                    .Where(l => l.Subject!.CourseId == courseId && l.IsPublished)
                    .CountAsync();

                var completedLessons = totalLessons > 0
                    ? await _dbContext.LessonProgresses
                        .AsNoTracking()
                        .Where(p => p.AccountId == accountId && p.IsCompleted && (p.WatchedCoveragePercent == 0 || p.WatchedCoveragePercent >= 80) && p.Lesson!.Subject!.CourseId == courseId)
                        .CountAsync()
                    : 0;

                decimal progress = totalLessons > 0 ? Math.Round(((decimal)completedLessons / totalLessons) * 100, 2) : 0;

                return new EnrollmentResponse(
                    existing.Id,
                    existing.AccountId,
                    existing.CourseId,
                    course.Title,
                    course.ThumbnailUrl,
                    existing.Status,
                    existing.EnrolledAt,
                    progress
                );
            }

            var enrollment = new Model.Entities.Enrollment
            {
                AccountId = accountId,
                CourseId = courseId,
                Status = EnrollmentStatus.Active,
                EnrolledAt = DateTime.UtcNow
            };

            _dbContext.Enrollments.Add(enrollment);
            await _dbContext.SaveChangesAsync();

            return new EnrollmentResponse(
                enrollment.Id,
                enrollment.AccountId,
                enrollment.CourseId,
                course.Title,
                course.ThumbnailUrl,
                enrollment.Status,
                enrollment.EnrolledAt,
                0
            );
        }

        public async Task<List<EnrollmentResponse>> GetMyEnrollmentsAsync(string accountId)
        {
            var enrollments = await _dbContext.Enrollments
                .AsNoTracking()
                .Include(e => e.Course)
                .Where(e => e.AccountId == accountId)
                .OrderByDescending(e => e.EnrolledAt)
                .ToListAsync();

            if (enrollments.Count == 0)
            {
                return new List<EnrollmentResponse>();
            }

            var courseIds = enrollments.Select(e => e.CourseId).Distinct().ToList();

            var lessonCounts = await _dbContext.Lessons
                .AsNoTracking()
                .Where(l => courseIds.Contains(l.Subject!.CourseId) && l.IsPublished)
                .GroupBy(l => l.Subject!.CourseId)
                .Select(g => new { CourseId = g.Key, Count = g.Count() })
                .ToDictionaryAsync(x => x.CourseId, x => x.Count);

            var completedCounts = await _dbContext.LessonProgresses
                .AsNoTracking()
                .Where(p => p.AccountId == accountId && p.IsCompleted && (p.WatchedCoveragePercent == 0 || p.WatchedCoveragePercent >= 80) && courseIds.Contains(p.Lesson!.Subject!.CourseId))
                .GroupBy(p => p.Lesson!.Subject!.CourseId)
                .Select(g => new { CourseId = g.Key, Count = g.Count() })
                .ToDictionaryAsync(x => x.CourseId, x => x.Count);

            return enrollments.Select(e =>
            {
                var total = lessonCounts.GetValueOrDefault(e.CourseId, 0);
                var completed = completedCounts.GetValueOrDefault(e.CourseId, 0);
                decimal progress = total > 0 ? Math.Round(((decimal)completed / total) * 100, 2) : 0;

                return new EnrollmentResponse(
                    e.Id,
                    e.AccountId,
                    e.CourseId,
                    e.Course?.Title ?? string.Empty,
                    e.Course?.ThumbnailUrl,
                    e.Status,
                    e.EnrolledAt,
                    progress
                );
            }).ToList();
        }
    }
}
