using Microlearning.Areas.Sync.Interfaces;

namespace Microlearning.Areas.Sync.Services
{
    /// <summary>
    /// Handler xử lý thao tác cập nhật tiến độ học (Tạm thời Mock để test độc lập, sau này Thắng chỉ việc gắn ProgressService thật vào đây).
    /// </summary>
    public class MockLessonProgressSyncHandler : ISyncOperationHandler
    {
        private readonly ILogger<MockLessonProgressSyncHandler> _logger;

        public MockLessonProgressSyncHandler(ILogger<MockLessonProgressSyncHandler> logger)
        {
            _logger = logger;
        }

        public string OperationType => "LESSON_PROGRESS";

        public Task<string?> HandleAsync(string accountId, string deviceId, string payloadJson, CancellationToken cancellationToken = default)
        {
            _logger.LogInformation(
                "==> [SyncHandler] Đã xử lý tiến độ học thành công: User={AccountId}, Device={DeviceId}, Payload={Payload}",
                accountId, deviceId, payloadJson);

            // Trả về kết quả JSON để lưu vào SyncOperations
            return Task.FromResult<string?>("{\"status\": \"OK\", \"message\": \"Đã ghi nhận tiến độ học thành công.\"}");
        }
    }
}