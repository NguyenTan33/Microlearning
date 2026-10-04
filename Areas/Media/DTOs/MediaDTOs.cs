namespace Microlearning.Areas.Media.DTOs
{
    // DTO yêu cầu phát video
    public record GetMediaStreamRequest(int MediaId);

    // DTO yêu cầu lấy thông tin tải video
    public record GetMediaDownloadInfoRequest(int MediaId, string BaseUrl);

    // DTO trả về thông tin download kèm Checksum SHA256
    public record MediaDownloadInfoResponse
    {
        public int MediaId { get; init; }
        public string FileName { get; init; } = string.Empty;
        public string ContentType { get; init; } = string.Empty;
        public long FileSizeBytes { get; init; }
        public string Checksum { get; init; } = string.Empty;
        public string DownloadUrl { get; init; } = string.Empty;
    }

    // DTO yêu cầu thử nghiệm sinh giọng đọc TTS
    public record TtsSynthesizeTestRequest(
        string Text,
        string? VoiceName = "vi-VN-HoaiMyNeural"
    );

    // DTO phản hồi kết quả sinh giọng đọc TTS
    public record TtsSynthesizeResponse
    {
        public string AudioUrl { get; init; } = string.Empty;
        public string FileName { get; init; } = string.Empty;
        public long FileSizeBytes { get; init; }
        public string VoiceUsed { get; init; } = string.Empty;
        public string Status { get; init; } = string.Empty;
    }

    // DTO yêu cầu xếp hàng tác vụ xử lý media (Background Job)
    public record EnqueueMediaJobRequest(
        int MediaAssetId,
        Microlearning.Model.Entities.Enums.MediaJobType JobType
    );

    // DTO phản hồi thông tin trạng thái tác vụ media
    public record MediaJobResponse
    {
        public int JobId { get; init; }
        public int MediaAssetId { get; init; }
        public string JobType { get; init; } = string.Empty;
        public string Status { get; init; } = string.Empty;
        public string? ErrorMessage { get; init; }
        public DateTime CreatedAt { get; init; }
        public DateTime? StartedAt { get; init; }
        public DateTime? CompletedAt { get; init; }
    }
}