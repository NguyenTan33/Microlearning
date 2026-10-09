using Microlearning.Areas.Catalog.DTOs;

namespace Microlearning.Areas.Catalog.Interfaces
{
    public interface IMediaBookmarkService
    {
        Task<List<MediaBookmarkResponse>> GetMyBookmarksAsync(string accountId, CancellationToken cancellationToken = default);

        Task<List<MediaBookmarkResponse>> GetBookmarksByLessonAsync(string accountId, int lessonId, CancellationToken cancellationToken = default);

        Task<MediaBookmarkResponse> CreateBookmarkAsync(string accountId, CreateMediaBookmarkRequest request, CancellationToken cancellationToken = default);

        Task<bool> DeleteBookmarkAsync(string accountId, string bookmarkId, CancellationToken cancellationToken = default);
    }
}
