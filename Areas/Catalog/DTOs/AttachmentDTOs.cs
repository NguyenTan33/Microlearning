namespace Microlearning.Areas.Catalog.DTOs
{
    public record LessonAttachmentDto(
        int Id,
        int LessonId,
        string FileName,
        string OriginalFileName,
        string FileType,
        string FileUrl,
        long FileSizeBytes,
        string Sha256Checksum,
        DateTime CreatedAt
    );

    public record UploadFileResult(
        string FileUrl,
        string FileName,
        long FileSizeBytes,
        string Sha256Checksum
    );
}
