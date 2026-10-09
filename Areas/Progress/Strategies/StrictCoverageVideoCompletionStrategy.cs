using Microlearning.Areas.Progress.DTOs;

namespace Microlearning.Areas.Progress.Strategies
{
    public class StrictCoverageVideoCompletionStrategy : IVideoCompletionStrategy
    {
        private const double MAX_ALLOWED_SKIP_RATIO = 0.20; // Tua bỏ tối đa 20% thời lượng
        private const double MIN_COMPLETION_PERCENT = 80.0; // Bắt buộc xem thực tế từ 80% trở lên để tính hoàn thành

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

            // Kiểm tra điều kiện chống gian lận tua: Thời gian xem thực tế phải đạt từ 80% trở lên
            bool isEligible = coveragePercent >= MIN_COMPLETION_PERCENT && skippedRatio <= MAX_ALLOWED_SKIP_RATIO;

            // BẮT BUỘC: Chỉ công nhận hoàn thành khi thời gian xem thực tế từ 80% trở lên
            bool isCompleted = isEligible && coveragePercent >= MIN_COMPLETION_PERCENT;

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
