using Microlearning.Areas.Sync.DTOs;
using Microlearning.Areas.Sync.Interfaces;
using Microlearning.Exceptions;
using Microlearning.Infrastructure.Factory;
using Microlearning.Model;
using Microlearning.Model.Entities;
using Microsoft.EntityFrameworkCore;

namespace Microlearning.Areas.Sync.Services
{
    public class SyncService : ISyncService
    {
        private readonly ApplicationDbContext _context;
        private readonly IValidationFactory _validationFactory;
        private readonly IEnumerable<ISyncOperationHandler> _handlers;
        private readonly ILogger<SyncService> _logger;

        public SyncService(
            ApplicationDbContext context,
            IValidationFactory validationFactory,
            IEnumerable<ISyncOperationHandler> handlers,
            ILogger<SyncService> logger)
        {
            _context = context;
            _validationFactory = validationFactory;
            _handlers = handlers;
            _logger = logger;
        }

        public async Task<SyncPushResponse> PushSyncOperationsAsync(
            string accountId,
            SyncPushRequest request,
            CancellationToken cancellationToken = default)
        {
            // 1. Chạy qua nhà máy Validation (Kiểm tra DeviceId, MaxBatchSize, Guid hợp lệ...)
            await _validationFactory.ValidateAsync(request, cancellationToken);

            // 2. Kiểm tra thiết bị và cập nhật thời gian LastSyncAt
            var device = await _context.Devices
                .FirstOrDefaultAsync(d => d.AccountId == accountId && d.DeviceId == request.DeviceId, cancellationToken);

            if (device != null)
            {
                device.LastSyncAt = DateTime.UtcNow;
            }

            var acceptedIds = new List<Guid>();
            var results = new List<SyncOperationResult>();

            // 3. Mở Database Transaction để đảm bảo tính toàn vẹn (ACID)
            await using var transaction = await _context.Database.BeginTransactionAsync(cancellationToken);

            try
            {
                foreach (var op in request.Operations)
                {
                    // 4. Cơ chế Deduplication (Chống trùng lặp theo ClientOperationId)
                    var isAlreadyProcessed = await _context.SyncOperations
                        .AnyAsync(s => s.ClientOperationId == op.ClientOperationId, cancellationToken);

                    if (isAlreadyProcessed)
                    {
                        // Thao tác này đã được xử lý ở lần gửi trước đó -> Bỏ qua không chạy lại logic
                        _logger.LogWarning("Phát hiện thao tác trùng lặp (Dedup): {OperationId}. Bỏ qua xử lý.", op.ClientOperationId);

                        acceptedIds.Add(op.ClientOperationId);
                        results.Add(new SyncOperationResult
                        {
                            ClientOperationId = op.ClientOperationId,
                            Success = true,
                            Message = "Thao tác đã được đồng bộ trước đó (Idempotent Dedup)."
                        });
                        continue;
                    }

                    // 5. Tìm Handler phù hợp với OperationType
                    var handler = _handlers.FirstOrDefault(h =>
                        string.Equals(h.OperationType, op.OperationType, StringComparison.OrdinalIgnoreCase));

                    string? responseJson = null;

                    if (handler != null)
                    {
                        // Gọi handler xử lý nội dung
                        responseJson = await handler.HandleAsync(accountId, request.DeviceId, op.PayloadJson, cancellationToken);
                    }
                    else
                    {
                        _logger.LogWarning("Chưa có Handler nào đăng ký cho OperationType: {OperationType}", op.OperationType);
                    }

                    // 6. Lưu vết vào bảng SyncOperations để chống lặp cho các lần sau
                    var syncOperation = new SyncOperation
                    {
                        ClientOperationId = op.ClientOperationId,
                        AccountId = accountId,
                        DeviceId = request.DeviceId,
                        OperationType = op.OperationType,
                        ProcessedAt = DateTime.UtcNow,
                        ResponseJson = responseJson
                    };

                    _context.SyncOperations.Add(syncOperation);

                    acceptedIds.Add(op.ClientOperationId);
                    results.Add(new SyncOperationResult
                    {
                        ClientOperationId = op.ClientOperationId,
                        Success = true,
                        Message = "Đồng bộ thành công."
                    });
                }

                // 7. Lưu tất cả thay đổi xuống DB và Commit Transaction
                await _context.SaveChangesAsync(cancellationToken);
                await transaction.CommitAsync(cancellationToken);

                return new SyncPushResponse
                {
                    AcceptedOperationIds = acceptedIds,
                    Results = results,
                    ProcessedAt = DateTime.UtcNow
                };
            }
            catch (Exception ex)
            {
                // 8. Nếu có lỗi nghiêm trọng xảy ra -> Rollback toàn bộ dữ liệu an toàn!
                await transaction.RollbackAsync(cancellationToken);
                _logger.LogError(ex, "Quá trình đồng bộ thất bại. Đã kích hoạt Transaction Rollback!");
                throw new BusinessException($"Đồng bộ dữ liệu thất bại do lỗi hệ thống: {ex.Message}. Toàn bộ giao dịch đã được hoàn tác.");
            }
        }
    }
}