namespace Microlearning.Model.Entities
{
    public class LessonAttachment
    {
        public int Id { get; set; }

        public int LessonId { get; set; }

        public string FileName { get; set; } = string.Empty;

        public string OriginalFileName { get; set; } = string.Empty;

        public string FileType { get; set; } = string.Empty; // 'PDF' | 'WORD'

        public string FileUrl { get; set; } = string.Empty;

        public long FileSizeBytes { get; set; } = 0;

        public string Sha256Checksum { get; set; } = string.Empty;

        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

        public virtual Lesson? Lesson { get; set; }
    }
}
