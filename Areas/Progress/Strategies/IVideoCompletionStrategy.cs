using Microlearning.Areas.Progress.DTOs;

namespace Microlearning.Areas.Progress.Strategies
{
    public interface IVideoCompletionStrategy
    {
        VideoCompletionEvaluation Evaluate(double totalDuration, IReadOnlyList<TimeRangeDto> watchedIntervals, double currentPosition);
    }
}
