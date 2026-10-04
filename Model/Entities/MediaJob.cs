using Microlearning.Model.Entities.Enums;

namespace Microlearning.Model.Entities
{
    public class MediaJob
    {
        public int Id { get; set; }

        public int MediaAssetId { get; set; }

        public MediaJobType JobType { get; set; } = MediaJobType.TtsSynthesize;

        public MediaJobStatus Status { get; set; } = MediaJobStatus.Queued;

        public string? ErrorMessage { get; set; }

        public int RetryCount { get; set; } = 0;

        public DateTime? StartedAt { get; set; }

        public DateTime? CompletedAt { get; set; }

        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

        public virtual MediaAsset? MediaAsset { get; set; }
    }
}
