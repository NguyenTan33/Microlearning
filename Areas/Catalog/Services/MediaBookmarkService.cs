using Microlearning.Areas.Catalog.DTOs;
using Microlearning.Areas.Catalog.Interfaces;
using Microlearning.Exceptions;
using Microlearning.Model;
using Microlearning.Model.Entities;
using Microsoft.EntityFrameworkCore;

namespace Microlearning.Areas.Catalog.Services
{
    public class MediaBookmarkService : IMediaBookmarkService
    {
        private readonly ApplicationDbContext _dbContext;

        public MediaBookmarkService(ApplicationDbContext dbContext)
        {
            _dbContext = dbContext;
        }

        private static string FormatSeconds(double secs)
        {
            var totalSeconds = Math.Max(0, (int)Math.Floor(secs));
            var hours = totalSeconds / 3600;
            var minutes = (totalSeconds % 3600) / 60;
            var seconds = totalSeconds % 60;

            if (hours > 0)
            {
                return $"{hours}:{minutes:D2}:{seconds:D2}";
            }
            return $"{minutes:D2}:{seconds:D2}";
        }

        public async Task<List<MediaBookmarkResponse>> GetMyBookmarksAsync(string accountId, CancellationToken cancellationToken = default)
        {
            return await _dbContext.UserMediaBookmarks
                .AsNoTracking()
                .Where(b => b.AccountId == accountId)
                .OrderByDescending(b => b.CreatedAt)
                .Select(b => new MediaBookmarkResponse(
                    b.Id,
                    b.LessonId,
                    b.MediaId,
                    b.CourseId,
                    b.CourseTitle,
                    b.LessonTitle,
                    b.Timestamp,
                    b.FormattedTime,
                    b.Title,
                    b.Note,
                    b.CreatedAt
                ))
                .ToListAsync(cancellationToken);
        }

        public async Task<List<MediaBookmarkResponse>> GetBookmarksByLessonAsync(string accountId, int lessonId, CancellationToken cancellationToken = default)
        {
            return await _dbContext.UserMediaBookmarks
                .AsNoTracking()
                .Where(b => b.AccountId == accountId && b.LessonId == lessonId)
                .OrderBy(b => b.Timestamp)
                .Select(b => new MediaBookmarkResponse(
                    b.Id,
                    b.LessonId,
                    b.MediaId,
                    b.CourseId,
                    b.CourseTitle,
                    b.LessonTitle,
                    b.Timestamp,
                    b.FormattedTime,
                    b.Title,
                    b.Note,
                    b.CreatedAt
                ))
                .ToListAsync(cancellationToken);
        }

        public async Task<MediaBookmarkResponse> CreateBookmarkAsync(string accountId, CreateMediaBookmarkRequest request, CancellationToken cancellationToken = default)
        {
            if (string.IsNullOrWhiteSpace(request.Title))
            {
                throw new BusinessException("Tiêu đề mốc đánh dấu không được để trống.");
            }

            var lesson = await _dbContext.Lessons
                .AsNoTracking()
                .Include(l => l.Subject)
                    .ThenInclude(s => s!.Course)
                .FirstOrDefaultAsync(l => l.Id == request.LessonId, cancellationToken);

            var courseTitle = request.CourseTitle ?? lesson?.Subject?.Course?.Title ?? "Khóa học";
            var lessonTitle = request.LessonTitle ?? lesson?.Title ?? "Bài học";
            var courseId = request.CourseId > 0 ? request.CourseId : (lesson?.Subject?.CourseId ?? 1);

            var bookmark = new UserMediaBookmark
            {
                Id = $"bm_{DateTimeOffset.UtcNow.ToUnixTimeMilliseconds()}_{Guid.NewGuid().ToString("N")[..6]}",
                AccountId = accountId,
                LessonId = request.LessonId,
                MediaId = request.MediaId,
                CourseId = courseId,
                CourseTitle = courseTitle,
                LessonTitle = lessonTitle,
                Timestamp = Math.Round(request.Timestamp, 1),
                FormattedTime = FormatSeconds(request.Timestamp),
                Title = request.Title.Trim(),
                Note = request.Note?.Trim(),
                CreatedAt = DateTime.UtcNow
            };

            _dbContext.UserMediaBookmarks.Add(bookmark);
            await _dbContext.SaveChangesAsync(cancellationToken);

            return new MediaBookmarkResponse(
                bookmark.Id,
                bookmark.LessonId,
                bookmark.MediaId,
                bookmark.CourseId,
                bookmark.CourseTitle,
                bookmark.LessonTitle,
                bookmark.Timestamp,
                bookmark.FormattedTime,
                bookmark.Title,
                bookmark.Note,
                bookmark.CreatedAt
            );
        }

        public async Task<bool> DeleteBookmarkAsync(string accountId, string bookmarkId, CancellationToken cancellationToken = default)
        {
            var bookmark = await _dbContext.UserMediaBookmarks
                .FirstOrDefaultAsync(b => b.AccountId == accountId && b.Id == bookmarkId, cancellationToken);

            if (bookmark == null)
            {
                return false;
            }

            _dbContext.UserMediaBookmarks.Remove(bookmark);
            await _dbContext.SaveChangesAsync(cancellationToken);
            return true;
        }
    }
}
