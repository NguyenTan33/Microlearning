using Microlearning.Areas.Media.DTOs;

namespace Microlearning.Areas.Media.Interfaces
{
    public interface IMediaService
    {
        /// <summary>
        /// Mở luồng đọc video hỗ trợ chuẩn HTTP 206 Range Stream.
        /// </summary>
        /// <param name="mediaId">ID của MediaAsset</param>
        /// <returns>Tuple chứa (FileStream, ContentType, FileLength, FileName)</returns>
        Task<(Stream stream, string contentType, long fileLength, string fileName)> GetVideoStreamAsync(int mediaId);


        /// <summary>
        /// Lấy thông tin tệp tải về kèm mã băm SHA-256 để Client xác thực toàn vẹn dữ liệu khi tải offline.
        /// </summary>
        Task<MediaDownloadInfoResponse> GetDownloadInfoAsync(int mediaId, string baseUrl);
    }
}