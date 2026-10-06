using Microlearning.Areas.Progress.DTOs;
using Microlearning.Areas.Progress.Interfaces;
using Microlearning.Exceptions;
using Microlearning.Model;
using Microlearning.Model.Entities;
using Microsoft.EntityFrameworkCore;

namespace Microlearning.Areas.Progress.Services
{
    public class ProgressService : IProgressService
    {
        private readonly ApplicationDbContext _dbContext;

        public ProgressService(ApplicationDbContext dbContext)
        {
            _dbContext = dbContext;
        }

        public async Task<LessonProgressResponse> SaveProgressAsync(string accountId, SaveProgressRequest request)
        {
            if (request.LessonId <= 0)
            {
                throw new BusinessException("Mã bài học không hợp lệ.");
            }

            var lesson = await _dbContext.Lessons
                .Include(l => l.Subject)
                .FirstOrDefaultAsync(l => l.Id == request.LessonId);

            if (lesson == null)
            {
                throw new BusinessException($"Không tìm thấy bài học với mã {request.LessonId}.");
            }

            // Tự động ghi danh học viên vào khóa học khi tham gia học bài giảng
            if (lesson.Subject != null && lesson.Subject.CourseId > 0)
            {
                var courseId = lesson.Subject.CourseId;
                var isEnrolled = await _dbContext.Enrollments
                    .AnyAsync(e => e.AccountId == accountId && e.CourseId == courseId);

                if (!isEnrolled)
                {
                    _dbContext.Enrollments.Add(new Model.Entities.Enrollment
                    {
                        AccountId = accountId,
                        CourseId = courseId,
                        Status = Model.Entities.Enums.EnrollmentStatus.Active,
                        EnrolledAt = DateTime.UtcNow
                    });
                }
            }

            var progress = await _dbContext.LessonProgresses
                .FirstOrDefaultAsync(p => p.AccountId == accountId && p.LessonId == request.LessonId);

            if (progress == null)
            {
                progress = new LessonProgress
                {
                    AccountId = accountId,
                    LessonId = request.LessonId,
                    WatchedSeconds = Math.Max(0, request.WatchedSeconds),
                    Percent = Math.Clamp(request.Percent, 0, 100),
                    IsCompleted = false,
                    CompletedAt = null,
                    LastPlayedAt = DateTime.UtcNow,
                    CreatedAt = DateTime.UtcNow
                };

                _dbContext.LessonProgresses.Add(progress);
            }
            else
            {
                // THUẬT TOÁN MONOTONIC MERGE: Chỉ lấy giá trị lớn nhất, chống tụt tiến độ
                progress.WatchedSeconds = Math.Max(progress.WatchedSeconds, request.WatchedSeconds);
                progress.Percent = Math.Clamp(Math.Max(progress.Percent, request.Percent), 0, 100);

                // Thu hồi IsCompleted nếu thời gian xem thực tế chưa đủ 80%
                if (progress.WatchedCoveragePercent > 0 && progress.WatchedCoveragePercent < 80)
                {
                    progress.IsCompleted = false;
                    progress.CompletedAt = null;
                }

                progress.LastPlayedAt = DateTime.UtcNow;
                progress.UpdatedAt = DateTime.UtcNow;
            }

            await _dbContext.SaveChangesAsync();

            bool isActuallyCompleted = progress.IsCompleted && (progress.WatchedCoveragePercent == 0 || progress.WatchedCoveragePercent >= 80);

            return new LessonProgressResponse(
                progress.LessonId,
                progress.WatchedSeconds,
                progress.Percent,
                isActuallyCompleted,
                isActuallyCompleted ? progress.CompletedAt : null,
                progress.LastPlayedAt
            );
        }

        public async Task<LessonProgressResponse?> GetLessonProgressAsync(string accountId, int lessonId)
        {
            var progress = await _dbContext.LessonProgresses
                .AsNoTracking()
                .FirstOrDefaultAsync(p => p.AccountId == accountId && p.LessonId == lessonId);

            if (progress == null)
            {
                return null;
            }

            bool isActuallyCompleted = progress.IsCompleted && (progress.WatchedCoveragePercent == 0 || progress.WatchedCoveragePercent >= 80);

            return new LessonProgressResponse(
                progress.LessonId,
                progress.WatchedSeconds,
                progress.Percent,
                isActuallyCompleted,
                isActuallyCompleted ? progress.CompletedAt : null,
                progress.LastPlayedAt
            );
        }

        public async Task<CourseProgressResponse> GetCourseProgressAsync(string accountId, int courseId)
        {
            var totalLessons = await _dbContext.Lessons
                .AsNoTracking()
                .Where(l => l.Subject!.CourseId == courseId && l.IsPublished)
                .CountAsync();

            if (totalLessons == 0)
            {
                return new CourseProgressResponse(courseId, 0, 0, 0);
            }

            var completedLessons = await _dbContext.LessonProgresses
                .AsNoTracking()
                .Where(p => p.AccountId == accountId && p.IsCompleted && (p.WatchedCoveragePercent == 0 || p.WatchedCoveragePercent >= 80) && p.Lesson!.Subject!.CourseId == courseId)
                .CountAsync();

            decimal overallPercent = Math.Round(((decimal)completedLessons / totalLessons) * 100, 2);

            return new CourseProgressResponse(
                courseId,
                overallPercent,
                completedLessons,
                totalLessons
            );
        }

        public async Task<List<int>> GetCompletedLessonIdsAsync(string accountId, int? courseId = null)
        {
            var query = _dbContext.LessonProgresses
                .AsNoTracking()
                .Where(p => p.AccountId == accountId && p.IsCompleted && (p.WatchedCoveragePercent == 0 || p.WatchedCoveragePercent >= 80));

            if (courseId.HasValue && courseId.Value > 0)
            {
                query = query.Where(p => p.Lesson!.Subject!.CourseId == courseId.Value);
            }

            return await query
                .Select(p => p.LessonId)
                .Distinct()
                .ToListAsync();
        }
    }
}
