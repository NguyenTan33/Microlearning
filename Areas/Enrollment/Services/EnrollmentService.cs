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
                return new EnrollmentResponse(
                    existing.Id,
                    existing.AccountId,
                    existing.CourseId,
                    course.Title,
                    course.ThumbnailUrl,
                    existing.Status,
                    existing.EnrolledAt
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
                enrollment.EnrolledAt
            );
        }

        public async Task<List<EnrollmentResponse>> GetMyEnrollmentsAsync(string accountId)
        {
            var enrollments = await _dbContext.Enrollments
                .AsNoTracking()
                .Include(e => e.Course)
                .Where(e => e.AccountId == accountId)
                .OrderByDescending(e => e.EnrolledAt)
                .Select(e => new EnrollmentResponse(
                    e.Id,
                    e.AccountId,
                    e.CourseId,
                    e.Course!.Title,
                    e.Course.ThumbnailUrl,
                    e.Status,
                    e.EnrolledAt,
                    0
                ))
                .ToListAsync();

            return enrollments;
        }
    }
}
