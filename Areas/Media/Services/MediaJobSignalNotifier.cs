using System.Threading;

namespace Microlearning.Areas.Media.Services
{
    /// <summary>
    /// Bộ báo hiệu tín hiệu thông minh cho MediaJobBackgroundWorker.
    /// Giúp Worker ngủ sâu khi ứng dụng rảnh (tránh làm kiệt Azure SQL vCore) 
    /// và thức dậy ngay lập tức (0ms) khi có tác vụ mới được xếp hàng.
    /// </summary>
    public static class MediaJobSignalNotifier
    {
        private static readonly SemaphoreSlim Signal = new(0, 1);

        /// <summary>
        /// Kích hoạt tín hiệu báo có tác vụ MediaJob mới vừa được xếp hàng
        /// </summary>
        public static void NotifyNewJob()
        {
            if (Signal.CurrentCount == 0)
            {
                try
                {
                    Signal.Release();
                }
                catch (SemaphoreFullException)
                {
                    // Tín hiệu đã sẵn sàng
                }
            }
        }

        /// <summary>
        /// Chờ tín hiệu có job mới hoặc hết thời gian timeout (Mặc định khi rảnh là 30 giây)
        /// </summary>
        public static async Task WaitAsync(TimeSpan timeout, CancellationToken cancellationToken)
        {
            try
            {
                await Signal.WaitAsync(timeout, cancellationToken);
            }
            catch (OperationCanceledException)
            {
                // Bỏ qua ngoại lệ hủy khi ứng dụng ngắt kết nối/shutdown
            }
        }
    }
}
