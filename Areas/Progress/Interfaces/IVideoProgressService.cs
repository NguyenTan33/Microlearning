using Microlearning.Areas.Progress.DTOs;

namespace Microlearning.Areas.Progress.Interfaces
{
    public interface IVideoProgressService
    {
        Task<VideoCoverageResponse> RecordProgressWithCoverageAsync(string accountId, RecordVideoCoverageRequest request, CancellationToken cancellationToken = default);
        Task<VideoCoverageResponse?> GetCoverageProgressAsync(string accountId, int lessonId, CancellationToken cancellationToken = default);
    }
}
