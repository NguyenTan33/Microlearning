using System.Text.Json;
using Microlearning.Areas.Sync.DTOs;
using Microlearning.Areas.Sync.Interfaces;
using Microlearning.Exceptions;
using Microlearning.Model;
using Microlearning.Model.Entities;
using Microsoft.EntityFrameworkCore;

namespace Microlearning.Areas.Sync.Services
{
    public class LessonProgressSyncHandler : ISyncOperationHandler
    {
        private readonly ApplicationDbContext _context;
        private readonly ILogger<LessonProgressSyncHandler> _logger;

        public LessonProgressSyncHandler(
            ApplicationDbContext context,
            ILogger<LessonProgressSyncHandler> logger)
        {
            _context = context;
            _logger = logger;
        }

        public string OperationType => "LESSON_PROGRESS";

        public async Task<string?> HandleAsync(
            string accountId,
            string deviceId,
            string payloadJson,
            CancellationToken cancellationToken = default)
        {
            var payload = JsonSerializer.Deserialize<LessonProgressPayload>(payloadJson, new JsonSerializerOptions
            {
                PropertyNameCaseInsensitive = true
            });

            if (payload == null || payload.LessonId <= 0)
            {
                throw new BusinessException("Dữ liệu tiến độ học (LESSON_PROGRESS) không hợp lệ.");
            }

            // 1. Tìm tiến độ hiện tại của học viên đối với bài học này
            var progress = await _context.LessonProgresses
                .FirstOrDefaultAsync(p => p.AccountId == accountId && p.LessonId == payload.LessonId, cancellationToken);

            if (progress != null)
            {
                // 2. Thuật toán Monotonic Merge: Luôn lấy giá trị lớn nhất (Math.Max)
                progress.WatchedSeconds = Math.Max(progress.WatchedSeconds, payload.WatchedSeconds);
                progress.Percent = Math.Max(progress.Percent, payload.Percent);
                progress.LastPlayedAt = DateTime.UtcNow;
                progress.UpdatedAt = DateTime.UtcNow;

                // Nếu đạt từ 90% trở lên thì đánh dấu hoàn thành bài học
                if (progress.Percent >= 90m && !progress.IsCompleted)
                {
                    progress.IsCompleted = true;
                    progress.CompletedAt = DateTime.UtcNow;
                }
            }
            else
            {
                // 3. Nếu chưa từng học bài này -> Tạo bản ghi mới
                var isCompleted = payload.Percent >= 90m;
                progress = new LessonProgress
                {
                    AccountId = accountId,
                    LessonId = payload.LessonId,
                    WatchedSeconds = payload.WatchedSeconds,
                    Percent = payload.Percent,
                    IsCompleted = isCompleted,
                    CompletedAt = isCompleted ? DateTime.UtcNow : null,
                    LastPlayedAt = DateTime.UtcNow,
                    CreatedAt = DateTime.UtcNow,
                    UpdatedAt = DateTime.UtcNow
                };

                _context.LessonProgresses.Add(progress);
            }

            _logger.LogInformation(
                "Đã cập nhật tiến độ Monotonic: User={User}, Lesson={Lesson}, Percent={Percent}%, Completed={Completed}",
                accountId, payload.LessonId, progress.Percent, progress.IsCompleted);

            return JsonSerializer.Serialize(new
            {
                lessonId = progress.LessonId,
                percent = progress.Percent,
                isCompleted = progress.IsCompleted
            });
        }
    }
}