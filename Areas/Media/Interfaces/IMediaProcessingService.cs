namespace Microlearning.Areas.Media.Interfaces
{
    public interface IMediaProcessingService
    {
        /// <summary>
        /// Ghép tệp âm thanh (MP3) vào tệp video (MP4) chuẩn bị cho bài học Microlearning.
        /// </summary>
        Task<string> MuxAudioAndVideoAsync(
            string videoInputPath,
            string audioInputPath,
            string outputVideoPath,
            CancellationToken cancellationToken = default);

        /// <summary>
        /// Trích xuất ảnh bìa bài học (Thumbnail) từ khung hình video.
        /// </summary>
        Task<string> ExtractThumbnailAsync(
            string videoInputPath,
            string outputImagePath,
            int atSecond = 2,
            CancellationToken cancellationToken = default);
    }
}