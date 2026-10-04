using Microlearning.Model.Entities.Enums;

namespace Microlearning.Model.Entities
{
    public class MediaAsset
    {
        public int Id { get; set; }

        public int LessonId { get; set; }

        public MediaType MediaType { get; set; } = MediaType.Video;

        public string BlobKey { get; set; } = string.Empty;

        public string FileName { get; set; } = string.Empty;

        public string ContentType { get; set; } = string.Empty;

        public long SizeBytes { get; set; } = 0;

        public int? DurationSeconds { get; set; }

        public string Checksum { get; set; } = string.Empty;

        public MediaAssetStatus Status { get; set; } = MediaAssetStatus.Uploaded;

        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

        public DateTime? UpdatedAt { get; set; }

        public virtual Lesson? Lesson { get; set; }

        public virtual NarrationScript? NarrationScript { get; set; }

        public virtual ICollection<MediaJob> MediaJobs { get; set; } = new List<MediaJob>();
    }
}
