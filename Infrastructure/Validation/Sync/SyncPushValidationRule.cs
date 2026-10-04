using Microlearning.Areas.Sync.DTOs;
using Microlearning.Exceptions;
using Microlearning.Infrastructure.Factory;

namespace Microlearning.Infrastructure.Validation.Sync
{
    public class SyncPushValidationRule : IValidationRule<SyncPushRequest>
    {
        private const int MaxBatchSize = 50; // Giới hạn tối đa 50 thao tác / 1 lần push để chống quá tải

        public Task ValidateAsync(SyncPushRequest request, CancellationToken cancellationToken = default)
        {
            if (request == null)
            {
                throw new BusinessException("Dữ liệu đồng bộ (SyncPushRequest) không được để trống.");
            }

            if (string.IsNullOrWhiteSpace(request.DeviceId))
            {
                throw new BusinessException("Mã thiết bị (DeviceId) không được để trống khi gửi yêu cầu đồng bộ.");
            }

            if (request.Operations == null || request.Operations.Count == 0)
            {
                throw new BusinessException("Danh sách thao tác đồng bộ (Operations) phải chứa ít nhất 1 phần tử.");
            }

            if (request.Operations.Count > MaxBatchSize)
            {
                throw new BusinessException($"Số lượng thao tác trong một lượt gửi vượt quá giới hạn cho phép (Tối đa {MaxBatchSize} thao tác).");
            }

            // Kiểm tra từng thao tác con bên trong
            for (int i = 0; i < request.Operations.Count; i++)
            {
                var op = request.Operations[i];

                if (op.ClientOperationId == Guid.Empty)
                {
                    throw new BusinessException($"Thao tác tại vị trí [{i}] có ClientOperationId không hợp lệ (Không được là Guid rỗng).");
                }

                if (string.IsNullOrWhiteSpace(op.OperationType))
                {
                    throw new BusinessException($"Thao tác tại vị trí [{i}] chưa chỉ định loại thao tác (OperationType).");
                }

                if (string.IsNullOrWhiteSpace(op.PayloadJson))
                {
                    throw new BusinessException($"Thao tác [{op.ClientOperationId}] không có dữ liệu nội dung (PayloadJson).");
                }
            }

            return Task.CompletedTask;
        }
    }
}