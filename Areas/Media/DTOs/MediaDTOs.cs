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
}