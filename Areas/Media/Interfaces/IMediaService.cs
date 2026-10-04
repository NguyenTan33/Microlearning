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
    }
}