using Microlearning.DTOs;
using Microlearning.Model;
using Microlearning.Model.Entities;
using Microsoft.EntityFrameworkCore;

namespace Microlearning.Service.Implement
{
    public class ProgressService
    {
        public readonly ApplicationDbContext dbContext;
        public ProgressService(ApplicationDbContext dbContext)
        {
            this.dbContext = dbContext;
        }

        public async Task SaveProgress(string accountId, SaveProgressDTO dto)
        {
            var progress = dbContext.LessonProgresses.FirstOrDefault(p => p.AccountId == accountId && p.LessonId == dto.LessonId);
            if (progress == null)
            {
                var isCompleted = dto.Percent >= 90;
                var newProgress = new LessonProgress
                {
                    AccountId = accountId,
                    LessonId = dto.LessonId,
                    WatchedSeconds = dto.WatchedSeconds,
                    Percent = dto.Percent,
                    IsCompleted = isCompleted,
                    CompletedAt = isCompleted ? DateTime.UtcNow : null,
                    LastPlayedAt = DateTime.UtcNow,
                    CreatedAt = DateTime.UtcNow
                };
                dbContext.LessonProgresses.Add(newProgress);
            }
            else
            {
                progress.WatchedSeconds = Math.Max(progress.WatchedSeconds, dto.WatchedSeconds);
                progress.Percent = Math.Max(progress.Percent, dto.Percent);

                if (progress.Percent >= 90 && !progress.IsCompleted)
                {
                    progress.IsCompleted = true;
                    progress.CompletedAt = DateTime.UtcNow;
                }
                progress.LastPlayedAt = DateTime.UtcNow;
                progress.UpdatedAt = DateTime.UtcNow;
            }
            // 2. Lưu vào Database
            await dbContext.SaveChangesAsync();
        }
        public async Task<LessonProgress?> GetLessonProgress(string accountId, int lessonId)
        {
            return await dbContext.LessonProgresses
                .FirstOrDefaultAsync(p => p.AccountId == accountId && p.LessonId == lessonId);
        }
        public async Task<decimal> GetCourseProgress(string accountId, int courseId)
        {
            // 1. All Amount of lessons in this course (IsPublished == true)
            var totalLessons = await dbContext.Lessons
                .Where(l => l.Subject.CourseId == courseId && l.IsPublished)
                .CountAsync();

            if (totalLessons == 0) return 0;

            // 2. Amount Done(IsCompleted == true)
            var completedLessons = await dbContext.LessonProgresses
                .Where(p => p.AccountId == accountId && p.IsCompleted && p.Lesson.Subject.CourseId == courseId)
                .CountAsync();

            // 3. calculate(DoneAmonut/ All ) * 100
            decimal percent = ((decimal)completedLessons / totalLessons) * 100;
            return Math.Round(percent, 2);
        }

    }
}
