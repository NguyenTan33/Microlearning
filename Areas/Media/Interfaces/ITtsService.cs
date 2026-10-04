namespace Microlearning.Areas.Media.Interfaces
{
    public interface ITtsService
    {
        /// <summary>
        /// Hàm cấp thấp (Low-level): Sinh tệp âm thanh MP3 từ một chuỗi văn bản và lưu vào đường dẫn chỉ định.
        /// </summary>
        /// <param name="text">Nội dung văn bản cần đọc</param>
        /// <param name="voiceName">Tên giọng đọc (mặc định: vi-VN-HoaiMyNeural hoặc vi-VN-NamMinhNeural)</param>
        /// <param name="outputFilePath">Đường dẫn tệp vật lý .mp3 cần xuất ra</param>
        /// <param name="cancellationToken">Token hủy tác vụ</param>
        /// <returns>Đường dẫn tệp đã tạo thành công</returns>
        Task<string> SynthesizeAudioAsync(
            string text,
            string voiceName,
            string outputFilePath,
            CancellationToken cancellationToken = default);

        /// <summary>
        /// Hàm nghiệp vụ cấp cao (Business flow): Xử lý tổng hợp giọng nói cho một bản ghi NarrationScript trong CSDL.
        /// Cập nhật trạng thái từ Pending -> Synthesizing -> Completed (hoặc Failed nếu lỗi).
        /// </summary>
        /// <param name="narrationScriptId">ID của kịch bản cần đọc</param>
        /// <param name="cancellationToken">Token hủy tác vụ</param>
        /// <returns>Đường dẫn tệp âm thanh hoàn chỉnh</returns>
        Task<string> SynthesizeNarrationScriptAsync(
            int narrationScriptId,
            CancellationToken cancellationToken = default);
    }
}