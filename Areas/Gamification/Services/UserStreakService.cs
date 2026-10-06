using Microlearning.Areas.Gamification.DTOs;
using Microlearning.Areas.Gamification.Interfaces;
using Microlearning.Model;
using Microlearning.Model.Entities;
using Microsoft.EntityFrameworkCore;

namespace Microlearning.Areas.Gamification.Services
{
    public class UserStreakService : IUserStreakService
    {
        private readonly ApplicationDbContext _dbContext;
        private readonly ILogger<UserStreakService> _logger;

        public UserStreakService(ApplicationDbContext dbContext, ILogger<UserStreakService> logger)
        {
            _dbContext = dbContext;
            _logger = logger;
        }

        public async Task<UserStreakDto> GetUserStreakAsync(string userId, CancellationToken cancellationToken = default)
        {
            var streak = await _dbContext.UserStreaks
                .FirstOrDefaultAsync(s => s.AccountId == userId, cancellationToken);

            var (completedLessons, totalLessons, crownEarned) = await EvaluateMasterCrownAsync(userId, cancellationToken);

            var nowUtc7 = DateTime.UtcNow.AddHours(7);
            var today = DateOnly.FromDateTime(nowUtc7);
            var yesterday = today.AddDays(-1);

            int currentStreak = streak?.CurrentStreak ?? 0;
            int longestStreak = streak?.LongestStreak ?? 0;

            // Kiểm tra nếu ngày cuối hoạt động trước hôm qua thì chuỗi đã bị đứt về 0 (nhưng chưa ghi nhận lượt học mới)
            if (streak?.LastActiveDate != null && streak.LastActiveDate < yesterday)
            {
                currentStreak = 0;
            }

            bool hasCrown = crownEarned;
            if (streak != null && streak.HasMasterCrown != hasCrown)
            {
                streak.HasMasterCrown = hasCrown;
                streak.UpdatedAt = DateTime.UtcNow;
                if (hasCrown && streak.CrownAwardedAt == null)
                {
                    streak.CrownAwardedAt = DateTime.UtcNow;
                }
                await _dbContext.SaveChangesAsync(cancellationToken);
            }

            double progressPercent = totalLessons > 0 ? Math.Round((double)completedLessons / totalLessons * 100.0, 1) : 0;
            string message = hasCrown
                ? "Xuất sắc! Bạn đang sở hữu Vương Miện Danh Dự vì đã hoàn thành 100% nội dung học tập!"
                : currentStreak > 0
                    ? $"Tuyệt vời! Bạn đang duy trì chuỗi {currentStreak} ngày học liên tiếp."
                    : "Hãy hoàn thành một bài học ngay hôm nay để kích hoạt chuỗi học tập!";

            return new UserStreakDto(
                currentStreak,
                longestStreak,
                streak?.LastActiveDate,
                hasCrown,
                streak?.CrownAwardedAt,
                completedLessons,
                totalLessons,
                progressPercent,
                message
            );
        }

        public async Task<UserStreakDto> RecordDailyLearningAsync(string userId, CancellationToken cancellationToken = default)
        {
            var streak = await _dbContext.UserStreaks
                .FirstOrDefaultAsync(s => s.AccountId == userId, cancellationToken);

            var nowUtc7 = DateTime.UtcNow.AddHours(7);
            var today = DateOnly.FromDateTime(nowUtc7);
            var yesterday = today.AddDays(-1);

            if (streak == null)
            {
                streak = new UserStreak
                {
                    AccountId = userId,
                    CurrentStreak = 1,
                    LongestStreak = 1,
                    LastActiveDate = today,
                    UpdatedAt = DateTime.UtcNow
                };
                _dbContext.UserStreaks.Add(streak);
            }
            else
            {
                if (streak.LastActiveDate == null)
                {
                    streak.CurrentStreak = 1;
                    streak.LongestStreak = Math.Max(streak.LongestStreak, 1);
                    streak.LastActiveDate = today;
                }
                else if (streak.LastActiveDate == yesterday)
                {
                    // Học liên tiếp ngày hôm sau -> tăng streak
                    streak.CurrentStreak += 1;
                    streak.LongestStreak = Math.Max(streak.LongestStreak, streak.CurrentStreak);
                    streak.LastActiveDate = today;
                }
                else if (streak.LastActiveDate < yesterday)
                {
                    // Bị đứt chuỗi -> bắt đầu lại chuỗi 1
                    streak.CurrentStreak = 1;
                    streak.LastActiveDate = today;
                }
                // Nếu streak.LastActiveDate == today: Đã học hôm nay rồi, không tăng streak ngày nữa
                streak.UpdatedAt = DateTime.UtcNow;
            }

            var (completedLessons, totalLessons, crownEarned) = await EvaluateMasterCrownAsync(userId, cancellationToken);

            streak.HasMasterCrown = crownEarned;
            if (crownEarned && streak.CrownAwardedAt == null)
            {
                streak.CrownAwardedAt = DateTime.UtcNow;
            }

            await _dbContext.SaveChangesAsync(cancellationToken);

            _logger.LogInformation("Ghi nhận hoạt động học tập cho {UserId}: Streak={Streak}, HasCrown={Crown}", userId, streak.CurrentStreak, streak.HasMasterCrown);

            double progressPercent = totalLessons > 0 ? Math.Round((double)completedLessons / totalLessons * 100.0, 1) : 0;
            string message = crownEarned
                ? "Chúc mừng! Bạn đã hoàn thành toàn bộ bài học và đạt Vương Miện Danh Dự!"
                : $"Tuyệt vời! Bạn đang duy trì chuỗi {streak.CurrentStreak} ngày học liên tiếp.";

            return new UserStreakDto(
                streak.CurrentStreak,
                streak.LongestStreak,
                streak.LastActiveDate,
                streak.HasMasterCrown,
                streak.CrownAwardedAt,
                completedLessons,
                totalLessons,
                progressPercent,
                message
            );
        }

        private async Task<(int completedLessons, int totalLessons, bool crownEarned)> EvaluateMasterCrownAsync(string userId, CancellationToken cancellationToken)
        {
            // Danh sách các khóa học hợp lệ:
            // Khóa đang Publish VÀ (Public HOẶC Private nhưng học viên đã mở khóa với đúng phiên bản PasswordVersion)
            var eligibleCourseIds = await _dbContext.Courses
                .AsNoTracking()
                .Where(c => c.IsPublished && (!c.IsPrivate || _dbContext.UserCourseAccesses.Any(a => a.AccountId == userId && a.CourseId == c.Id && a.UnlockedPasswordVersion == c.PasswordVersion)))
                .Select(c => c.Id)
                .ToListAsync(cancellationToken);

            if (eligibleCourseIds.Count == 0)
            {
                return (0, 0, false);
            }

            // Tổng số bài học đã Publish thuộc các khóa học hợp lệ
            var totalLessons = await _dbContext.Lessons
                .AsNoTracking()
                .CountAsync(l => l.IsPublished && eligibleCourseIds.Contains(l.Subject.CourseId), cancellationToken);

            if (totalLessons == 0)
            {
                return (0, 0, false);
            }

            // Tổng số bài học mà người dùng này đã hoàn thành (IsCompleted = true) trong các khóa học hợp lệ
            var completedLessons = await _dbContext.LessonProgresses
                .AsNoTracking()
                .CountAsync(p => p.AccountId == userId && p.IsCompleted && p.Lesson.IsPublished && eligibleCourseIds.Contains(p.Lesson.Subject.CourseId), cancellationToken);

            bool crownEarned = completedLessons >= totalLessons;

            return (completedLessons, totalLessons, crownEarned);
        }
    }
}
