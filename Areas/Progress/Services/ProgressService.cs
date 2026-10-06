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

            var lessonExists = await _dbContext.Lessons.AnyAsync(l => l.Id == request.LessonId);
            if (!lessonExists)
            {
                throw new BusinessException($"Không tìm thấy bài học với mã {request.LessonId}.");
            }

            var progress = await _dbContext.LessonProgresses
                .FirstOrDefaultAsync(p => p.AccountId == accountId && p.LessonId == request.LessonId);

            if (progress == null)
            {
                bool isCompleted = request.Percent >= 90;
                progress = new LessonProgress
                {
                    AccountId = accountId,
                    LessonId = request.LessonId,
                    WatchedSeconds = Math.Max(0, request.WatchedSeconds),
                    Percent = Math.Clamp(request.Percent, 0, 100),
                    IsCompleted = isCompleted,
                    CompletedAt = isCompleted ? DateTime.UtcNow : null,
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

                if (progress.Percent >= 90 && !progress.IsCompleted)
                {
                    progress.IsCompleted = true;
                    progress.CompletedAt = DateTime.UtcNow;
                }

                progress.LastPlayedAt = DateTime.UtcNow;
                progress.UpdatedAt = DateTime.UtcNow;
            }

            await _dbContext.SaveChangesAsync();

            return new LessonProgressResponse(
                progress.LessonId,
                progress.WatchedSeconds,
                progress.Percent,
                progress.IsCompleted,
                progress.CompletedAt,
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

            return new LessonProgressResponse(
                progress.LessonId,
                progress.WatchedSeconds,
                progress.Percent,
                progress.IsCompleted,
                progress.CompletedAt,
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
                .Where(p => p.AccountId == accountId && p.IsCompleted && p.Lesson!.Subject!.CourseId == courseId)
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
                .Where(p => p.AccountId == accountId && (p.IsCompleted || p.Percent >= 90));

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
