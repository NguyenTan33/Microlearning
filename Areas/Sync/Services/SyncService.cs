using Microlearning.Areas.Sync.DTOs;
using Microlearning.Areas.Sync.Interfaces;
using Microlearning.Exceptions;
using Microlearning.Infrastructure.Factory;
using Microlearning.Model;
using Microlearning.Model.Entities;
using Microlearning.Model.Entities.Enums;
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



        public async Task<SyncPullResponse> PullSyncChangesAsync(
    SyncPullRequest request,
    CancellationToken cancellationToken = default)
        {
            // 1. Chạy qua nhà máy Validation (Kiểm tra AfterSequence >= 0, Limit <= 100)
            await _validationFactory.ValidateAsync(request, cancellationToken);

            // 2. Truy vấn các thay đổi có Sequence lớn hơn AfterSequence, sắp xếp tăng dần tuyệt đối
            var changesQuery = _context.ContentChanges
                .AsNoTracking()
                .Where(c => c.Sequence > request.AfterSequence)
                .OrderBy(c => c.Sequence);

            // Lấy nhiều hơn Limit 1 bản ghi để kiểm tra xem còn dữ liệu phía sau không (HasMoreChanges)
            var changes = await changesQuery
                .Take(request.Limit + 1)
                .ToListAsync(cancellationToken);

            var hasMoreChanges = changes.Count > request.Limit;
            var resultChanges = changes.Take(request.Limit).ToList();

            // 3. Tính toán mốc Checkpoint mới
            var newCheckpoint = resultChanges.Count > 0
                ? resultChanges.Max(c => c.Sequence)
                : request.AfterSequence;

            // 4. Map sang DTO trả về cho Mobile
            var changeItems = new List<ContentChangeItemDto>();

            foreach (var change in resultChanges)
            {
                object? payload = null;

                // Nếu là bài học mới hoặc cập nhật -> Nạp kèm thông tin cơ bản
                if (change.EntityType.Equals("Lesson", StringComparison.OrdinalIgnoreCase) && change.ChangeType != ContentChangeType.Deleted)
                {
                    var lesson = await _context.Lessons
                        .AsNoTracking()
                        .FirstOrDefaultAsync(l => l.Id == change.EntityId, cancellationToken);

                    if (lesson != null)
                    {
                        payload = new
                        {
                            lessonId = lesson.Id,
                            title = lesson.Title,
                            durationSeconds = lesson.DurationSeconds,
                            isPublished = lesson.IsPublished,
                            version = lesson.Version
                        };
                    }
                }
                // Nếu là khóa học -> Nạp kèm thông tin khóa học
                else if (change.EntityType.Equals("Course", StringComparison.OrdinalIgnoreCase) && change.ChangeType != ContentChangeType.Deleted)
                {
                    var course = await _context.Courses
                        .AsNoTracking()
                        .FirstOrDefaultAsync(c => c.Id == change.EntityId, cancellationToken);

                    if (course != null)
                    {
                        payload = new
                        {
                            courseId = course.Id,
                            title = course.Title,
                            description = course.Description,
                            isPublished = course.IsPublished,
                            version = course.Version
                        };
                    }
                }

                changeItems.Add(new ContentChangeItemDto
                {
                    Sequence = change.Sequence,
                    EntityType = change.EntityType,
                    EntityId = change.EntityId,
                    ChangeType = change.ChangeType.ToString(),
                    Version = change.Version,
                    ChangedAt = change.ChangedAt,
                    Payload = payload
                });
            }

            _logger.LogInformation(
                "Đã xử lý Sync Pull: AfterSequence={AfterSeq}, Trả về={Count} thay đổi, NewCheckpoint={NewCheckpoint}, HasMore={HasMore}",
                request.AfterSequence, changeItems.Count, newCheckpoint, hasMoreChanges);

            return new SyncPullResponse
            {
                CurrentCheckpointSequence = request.AfterSequence,
                NewCheckpointSequence = newCheckpoint,
                HasMoreChanges = hasMoreChanges,
                Changes = changeItems
            };
        }
    }
}