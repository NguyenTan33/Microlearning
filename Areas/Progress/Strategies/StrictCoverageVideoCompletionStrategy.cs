using Microlearning.Areas.Progress.DTOs;

namespace Microlearning.Areas.Progress.Strategies
{
    public class StrictCoverageVideoCompletionStrategy : IVideoCompletionStrategy
    {
        private const double MAX_ALLOWED_SKIP_RATIO = 0.30; // Tua bỏ tối đa 30% thời lượng
        private const double MIN_COMPLETION_PERCENT = 70.0; // Phải xem ít nhất 70% để đủ điều kiện xét hoàn thành

        public VideoCompletionEvaluation Evaluate(double totalDuration, IReadOnlyList<TimeRangeDto> watchedIntervals, double currentPosition)
        {
            if (totalDuration <= 0)
            {
                return new VideoCompletionEvaluation(0, 0, 1.0, false, false);
            }

            var coverageSeconds = CalculateUnionLength(watchedIntervals, totalDuration);
            var coverageRatio = Math.Clamp(coverageSeconds / totalDuration, 0.0, 1.0);
            var coveragePercent = Math.Round(coverageRatio * 100.0, 2);
            var skippedRatio = Math.Round(1.0 - coverageRatio, 4);

            // Kiểm tra điều kiện chống gian lận tua: Nếu tua bỏ > 30% thì không đủ điều kiện
            bool isEligible = skippedRatio <= MAX_ALLOWED_SKIP_RATIO;

            // Bài học được tính là hoàn thành khi:
            // 1. Đủ điều kiện không gian lận (isEligible == true)
            // 2. Và người học đã xem đạt từ 85% trở lên hoặc đã xem đến gần hết video (>= 90%) với độ phủ >= 70%
            bool isCompleted = isEligible && (coveragePercent >= 85.0 || (currentPosition >= totalDuration * 0.90 && coveragePercent >= MIN_COMPLETION_PERCENT));

            return new VideoCompletionEvaluation(
                coverageSeconds,
                coveragePercent,
                skippedRatio,
                isEligible,
                isCompleted
            );
        }

        public static double CalculateUnionLength(IReadOnlyList<TimeRangeDto>? intervals, double maxDuration)
        {
            if (intervals == null || intervals.Count == 0)
            {
                return 0;
            }

            // Lọc các khoảng hợp lệ và kẹp trong giới hạn [0, maxDuration]
            var validRanges = intervals
                .Where(i => i.End > i.Start && i.Start < maxDuration && i.End > 0)
                .Select(i => (
                    Start: Math.Max(0.0, i.Start),
                    End: Math.Min(maxDuration, i.End)
                ))
                .OrderBy(r => r.Start)
                .ToList();

            if (validRanges.Count == 0)
            {
                return 0;
            }

            var merged = new List<(double Start, double End)>();
            var current = validRanges[0];

            for (int i = 1; i < validRanges.Count; i++)
            {
                var next = validRanges[i];
                if (next.Start <= current.End)
                {
                    // Chồng lấn hoặc liền kề -> Hợp nhất khoảng
                    current = (current.Start, Math.Max(current.End, next.End));
                }
                else
                {
                    merged.Add(current);
                    current = next;
                }
            }
            merged.Add(current);

            return merged.Sum(r => r.End - r.Start);
        }
    }
}
