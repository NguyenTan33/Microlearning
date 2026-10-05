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
        /// Mở luồng đọc video của một bài học cụ thể (tự động lấy video mới nhất của bài học, nếu chưa có video sẽ phát test.mp4 dự phòng).
        /// </summary>
        /// <param name="lessonId">ID của bài học (LessonId)</param>
        Task<(Stream stream, string contentType, long fileLength, string fileName)> GetLessonVideoStreamAsync(int lessonId);


        /// <summary>
        /// Lấy thông tin tệp tải về kèm mã băm SHA-256 để Client xác thực toàn vẹn dữ liệu khi tải offline.
        /// </summary>
        Task<MediaDownloadInfoResponse> GetDownloadInfoAsync(int mediaId, string baseUrl);


        /// <summary>
        /// Đẩy một tác vụ xử lý media vào hàng đợi (Queue) để Background Worker xử lý ngầm.
        /// </summary>
        Task<MediaJobResponse> EnqueueJobAsync(EnqueueMediaJobRequest request, CancellationToken cancellationToken = default);

        /// <summary>
        /// Lấy trạng thái hiện tại của một MediaJob để Client/Frontend theo dõi tiến độ.
        /// </summary>
        Task<MediaJobResponse> GetJobStatusAsync(int jobId, CancellationToken cancellationToken = default);

        /// <summary>
        /// Đăng tải tệp video bài giảng mới và lưu trữ vào wwwroot/Videos
        /// </summary>
        Task<UploadMediaResponse> UploadVideoAsync(Microsoft.AspNetCore.Http.IFormFile file, int? lessonId, string baseUrl, CancellationToken cancellationToken = default);
    }
}