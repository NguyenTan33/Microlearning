using Microlearning.Areas.Gamification.Interfaces;
using Microlearning.Areas.Progress.DTOs;
using Microlearning.Areas.Progress.Interfaces;
using Microlearning.Areas.Progress.Strategies;
using Microlearning.Exceptions;
using Microlearning.Model;
using Microlearning.Model.Entities;
using Microsoft.EntityFrameworkCore;

namespace Microlearning.Areas.Progress.Services
{
    public class VideoProgressService : IVideoProgressService
    {
        private readonly ApplicationDbContext _dbContext;
        private readonly IVideoCompletionStrategy _completionStrategy;
        private readonly IUserStreakService _streakService;
        private readonly ILogger<VideoProgressService> _logger;

        public VideoProgressService(
            ApplicationDbContext dbContext,
            IVideoCompletionStrategy completionStrategy,
            IUserStreakService streakService,
            ILogger<VideoProgressService> logger)
        {
            _dbContext = dbContext;
            _completionStrategy = completionStrategy;
            _streakService = streakService;
            _logger = logger;
        }

        public async Task<VideoCoverageResponse> RecordProgressWithCoverageAsync(
            string accountId,
            RecordVideoCoverageRequest request,
            CancellationToken cancellationToken = default)
        {
            if (request.LessonId <= 0)
            {
                throw new BusinessException("Mã bài học không hợp lệ.");
            }

            var lesson = await _dbContext.Lessons
                .AsNoTracking()
                .Include(l => l.Subject)
                .FirstOrDefaultAsync(l => l.Id == request.LessonId, cancellationToken);

            if (lesson == null)
            {
                throw new BusinessException($"Không tìm thấy bài học với mã {request.LessonId}.");
            }

            // Tự động ghi danh học viên vào khóa học khi tham gia học bài giảng
            if (lesson.Subject != null && lesson.Subject.CourseId > 0)
            {
                var courseId = lesson.Subject.CourseId;
                var isEnrolled = await _dbContext.Enrollments
                    .AnyAsync(e => e.AccountId == accountId && e.CourseId == courseId, cancellationToken);

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

            var duration = request.TotalDuration > 0 ? request.TotalDuration : lesson.DurationSeconds;
            var evaluation = _completionStrategy.Evaluate(duration, request.WatchedIntervals, request.CurrentPosition);

            var progress = await _dbContext.LessonProgresses
                .FirstOrDefaultAsync(p => p.AccountId == accountId && p.LessonId == request.LessonId, cancellationToken);

            bool justBecameCompleted = false;

            if (progress == null)
            {
                progress = new LessonProgress
                {
                    AccountId = accountId,
                    LessonId = request.LessonId,
                    WatchedSeconds = (int)Math.Round(evaluation.CoverageSeconds),
                    Percent = (decimal)Math.Clamp(evaluation.CoveragePercent, 0, 100),
                    WatchedCoveragePercent = evaluation.CoveragePercent,
                    SkippedRatio = evaluation.SkippedRatio,
                    IsEligibleForCompletion = evaluation.IsEligibleForCompletion,
                    IsCompleted = evaluation.IsCompleted,
                    CompletedAt = evaluation.IsCompleted ? DateTime.UtcNow : null,
                    LastPlayedAt = DateTime.UtcNow,
                    CreatedAt = DateTime.UtcNow
                };

                justBecameCompleted = evaluation.IsCompleted;
                _dbContext.LessonProgresses.Add(progress);
            }
            else
            {
                // Cập nhật tăng dần (Monotonic) các chỉ số
                progress.WatchedSeconds = Math.Max(progress.WatchedSeconds, (int)Math.Round(evaluation.CoverageSeconds));
                progress.Percent = (decimal)Math.Clamp(Math.Max((double)progress.Percent, evaluation.CoveragePercent), 0, 100);
                progress.WatchedCoveragePercent = Math.Max(progress.WatchedCoveragePercent, evaluation.CoveragePercent);
                progress.SkippedRatio = evaluation.SkippedRatio;
                progress.IsEligibleForCompletion = evaluation.IsEligibleForCompletion;
                progress.LastPlayedAt = DateTime.UtcNow;
                progress.UpdatedAt = DateTime.UtcNow;

                if (evaluation.IsCompleted)
                {
                    if (!progress.IsCompleted)
                    {
                        progress.IsCompleted = true;
                        progress.CompletedAt = DateTime.UtcNow;
                        justBecameCompleted = true;
                    }
                }
                else
                {
                    // Nếu thời gian xem thực tế chưa đạt 80%, tuyệt đối không tính là hoàn thành
                    if (progress.WatchedCoveragePercent < 80.0)
                    {
                        progress.IsCompleted = false;
                        progress.CompletedAt = null;
                    }
                }
            }

            await _dbContext.SaveChangesAsync(cancellationToken);

            // Tự động kích hoạt điểm danh Streak và kiểm tra Vương miện nếu hoàn thành bài học
            if (justBecameCompleted)
            {
                try
                {
                    await _streakService.RecordDailyLearningAsync(accountId, cancellationToken);
                }
                catch (Exception ex)
                {
                    _logger.LogWarning(ex, "Lỗi khi cập nhật streak cho người dùng {AccountId}", accountId);
                }
            }

            string message = !evaluation.IsEligibleForCompletion
                ? $"Cảnh báo chống tua: Bạn đã tua bỏ qua {(evaluation.SkippedRatio * 100):0}% thời lượng video. Bài học yêu cầu xem thực tế tối thiểu 80% để tính hoàn thành."
                : evaluation.IsCompleted
                    ? "Chúc mừng! Bạn đã hoàn thành bài học này."
                    : "Tiến độ học tập đã được cập nhật thành công.";

            return new VideoCoverageResponse(
                progress.LessonId,
                progress.WatchedCoveragePercent,
                progress.SkippedRatio,
                progress.IsEligibleForCompletion,
                progress.IsCompleted,
                progress.CompletedAt,
                message
            );
        }

        public async Task<VideoCoverageResponse?> GetCoverageProgressAsync(string accountId, int lessonId, CancellationToken cancellationToken = default)
        {
            var progress = await _dbContext.LessonProgresses
                .AsNoTracking()
                .FirstOrDefaultAsync(p => p.AccountId == accountId && p.LessonId == lessonId, cancellationToken);

            if (progress == null)
            {
                return null;
            }

            bool isActuallyCompleted = progress.IsCompleted && (progress.WatchedCoveragePercent == 0 || progress.WatchedCoveragePercent >= 80);

            return new VideoCoverageResponse(
                progress.LessonId,
                progress.WatchedCoveragePercent,
                progress.SkippedRatio,
                progress.IsEligibleForCompletion,
                isActuallyCompleted,
                isActuallyCompleted ? progress.CompletedAt : null,
                null
            );
        }
    }
}
