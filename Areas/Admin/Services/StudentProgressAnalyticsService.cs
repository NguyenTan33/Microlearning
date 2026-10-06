using Microlearning.Areas.Admin.DTOs;
using Microlearning.Areas.Admin.Interfaces;
using Microlearning.Exceptions;
using Microlearning.Model;
using Microsoft.EntityFrameworkCore;

namespace Microlearning.Areas.Admin.Services
{
    public class StudentProgressAnalyticsService : IStudentProgressAnalyticsService
    {
        private readonly ApplicationDbContext _dbContext;

        public StudentProgressAnalyticsService(ApplicationDbContext dbContext)
        {
            _dbContext = dbContext;
        }

        public async Task<CourseOverviewMetricsDto> GetCourseMetricsOverviewAsync(int courseId, CancellationToken cancellationToken = default)
        {
            var course = await _dbContext.Courses
                .AsNoTracking()
                .FirstOrDefaultAsync(c => c.Id == courseId, cancellationToken);

            if (course == null)
            {
                throw new BusinessException($"Không tìm thấy khóa học với mã {courseId}.");
            }

            var totalLessons = await _dbContext.Lessons
                .AsNoTracking()
                .CountAsync(l => l.Subject.CourseId == courseId && l.IsPublished, cancellationToken);

            var enrolledStudentIds = await _dbContext.Enrollments
                .AsNoTracking()
                .Where(e => e.CourseId == courseId)
                .Select(e => e.AccountId)
                .ToListAsync(cancellationToken);

            var activeStudentIdsWithProgress = await _dbContext.LessonProgresses
                .AsNoTracking()
                .Where(p => p.Lesson.Subject.CourseId == courseId)
                .Select(p => p.AccountId)
                .ToListAsync(cancellationToken);

            var allStudentIds = enrolledStudentIds
                .Union(activeStudentIdsWithProgress)
                .Distinct()
                .ToList();

            if (allStudentIds.Count == 0 || totalLessons == 0)
            {
                return new CourseOverviewMetricsDto(
                    courseId,
                    course.Title,
                    allStudentIds.Count,
                    totalLessons,
                    0,
                    0
                );
            }

            var completedCounts = await _dbContext.LessonProgresses
                .AsNoTracking()
                .Where(p => allStudentIds.Contains(p.AccountId) && p.Lesson.Subject.CourseId == courseId && p.IsCompleted && p.Lesson.IsPublished)
                .GroupBy(p => p.AccountId)
                .Select(g => new { AccountId = g.Key, Count = g.Count() })
                .ToDictionaryAsync(x => x.AccountId, x => x.Count, cancellationToken);

            int completedStudentsCount = completedCounts.Values.Count(c => c >= totalLessons);
            long totalCompletedLessonsSum = completedCounts.Values.Sum();
            double avgProgress = Math.Round((double)totalCompletedLessonsSum / (allStudentIds.Count * totalLessons) * 100.0, 1);

            return new CourseOverviewMetricsDto(
                courseId,
                course.Title,
                allStudentIds.Count,
                totalLessons,
                avgProgress,
                completedStudentsCount
            );
        }

        public async Task<PagedResult<StudentProgressDetailDto>> GetCourseStudentsProgressAsync(
            int courseId,
            StudentProgressFilterDto filter,
            CancellationToken cancellationToken = default)
        {
            var course = await _dbContext.Courses
                .AsNoTracking()
                .FirstOrDefaultAsync(c => c.Id == courseId, cancellationToken);

            if (course == null)
            {
                throw new BusinessException($"Không tìm thấy khóa học với mã {courseId}.");
            }

            var totalLessons = await _dbContext.Lessons
                .AsNoTracking()
                .CountAsync(l => l.Subject.CourseId == courseId && l.IsPublished, cancellationToken);

            var enrolledStudentIds = await _dbContext.Enrollments
                .AsNoTracking()
                .Where(e => e.CourseId == courseId)
                .Select(e => e.AccountId)
                .ToListAsync(cancellationToken);

            var progressStudentIds = await _dbContext.LessonProgresses
                .AsNoTracking()
                .Where(p => p.Lesson.Subject.CourseId == courseId)
                .Select(p => p.AccountId)
                .ToListAsync(cancellationToken);

            var allStudentIds = enrolledStudentIds
                .Union(progressStudentIds)
                .Distinct()
                .ToList();

            if (allStudentIds.Count == 0)
            {
                return new PagedResult<StudentProgressDetailDto>(new List<StudentProgressDetailDto>(), 0, filter.PageNumber, filter.PageSize, 0);
            }

            var usersQuery = _dbContext.Users
                .AsNoTracking()
                .Where(u => allStudentIds.Contains(u.Id));

            if (!string.IsNullOrWhiteSpace(filter.SearchTerm))
            {
                var term = filter.SearchTerm.Trim().ToLower();
                usersQuery = usersQuery.Where(u =>
                    (u.FullName != null && u.FullName.ToLower().Contains(term)) ||
                    (u.Email != null && u.Email.ToLower().Contains(term)) ||
                    (u.PhoneNumber != null && u.PhoneNumber.Contains(term)));
            }

            var matchedUsers = await usersQuery.ToListAsync(cancellationToken);
            var matchedUserIds = matchedUsers.Select(u => u.Id).ToList();

            // Lấy số bài đã hoàn thành và ngày tương tác gần nhất của từng học viên
            var progressStats = await _dbContext.LessonProgresses
                .AsNoTracking()
                .Where(p => matchedUserIds.Contains(p.AccountId) && p.Lesson.Subject.CourseId == courseId && p.Lesson.IsPublished)
                .GroupBy(p => p.AccountId)
                .Select(g => new
                {
                    AccountId = g.Key,
                    CompletedCount = g.Count(x => x.IsCompleted),
                    LastActiveAt = g.Max(x => x.LastPlayedAt)
                })
                .ToDictionaryAsync(x => x.AccountId, cancellationToken);

            var detailList = matchedUsers.Select(u =>
            {
                progressStats.TryGetValue(u.Id, out var stat);
                int completed = stat?.CompletedCount ?? 0;
                double percent = totalLessons > 0 ? Math.Round((double)completed / totalLessons * 100.0, 1) : 0;
                bool isCompleted = totalLessons > 0 && completed >= totalLessons;

                return new StudentProgressDetailDto(
                    u.Id,
                    u.FullName ?? "Chưa cập nhật",
                    u.Email,
                    u.PhoneNumber,
                    completed,
                    totalLessons,
                    percent,
                    stat?.LastActiveAt,
                    isCompleted
                );
            }).ToList();

            if (filter.OnlyCompleted.HasValue)
            {
                detailList = detailList.Where(d => d.HasCompletedCourse == filter.OnlyCompleted.Value).ToList();
            }

            int totalCount = detailList.Count;
            int pageSize = Math.Max(1, filter.PageSize);
            int pageNumber = Math.Max(1, filter.PageNumber);
            int totalPages = (int)Math.Ceiling((double)totalCount / pageSize);

            var pagedItems = detailList
                .OrderByDescending(d => d.ProgressPercent)
                .ThenBy(d => d.FullName)
                .Skip((pageNumber - 1) * pageSize)
                .Take(pageSize)
                .ToList();

            return new PagedResult<StudentProgressDetailDto>(
                pagedItems,
                totalCount,
                pageNumber,
                pageSize,
                totalPages
            );
        }
    }
}
