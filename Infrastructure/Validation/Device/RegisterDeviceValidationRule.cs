using Microlearning.Areas.Device.DTOs;
using Microlearning.Exceptions;
using Microlearning.Infrastructure.Factory;
using Microlearning.Model.Entities.Enums;

namespace Microlearning.Infrastructure.Validation.Device
{
    /// <summary>
    /// Luật kiểm tra dữ liệu đăng ký thiết bị (Single Responsibility).
    /// Được IValidationFactory tự động phát hiện và kích hoạt.
    /// </summary>
    public class RegisterDeviceValidationRule : IValidationRule<RegisterDeviceRequest>
    {
        public Task ValidateAsync(RegisterDeviceRequest request, CancellationToken cancellationToken = default)
        {
            if (request == null)
            {
                throw new BusinessException("Dữ liệu đăng ký thiết bị không được để trống.");
            }

            if (string.IsNullOrWhiteSpace(request.DeviceId))
            {
                throw new BusinessException("Mã định danh thiết bị (DeviceId) không được để trống.");
            }

            if (request.DeviceId.Length > 100)
            {
                throw new BusinessException("Mã định danh thiết bị (DeviceId) không được vượt quá 100 ký tự.");
            }

            // Kiểm tra tính hợp lệ của Enum Platform (chỉ cho phép Android = 1 hoặc iOS = 2)
            if (!Enum.IsDefined(typeof(DevicePlatform), request.Platform))
            {
                throw new BusinessException("Nền tảng thiết bị (Platform) không hợp lệ. Chỉ chấp nhận Android (1) hoặc iOS (2).");
            }

            if (!string.IsNullOrWhiteSpace(request.DeviceModel) && request.DeviceModel.Length > 100)
            {
                throw new BusinessException("Tên dòng máy (DeviceModel) không được vượt quá 100 ký tự.");
            }

            if (!string.IsNullOrWhiteSpace(request.OsVersion) && request.OsVersion.Length > 50)
            {
                throw new BusinessException("Phiên bản hệ điều hành (OsVersion) không được vượt quá 50 ký tự.");
            }

            return Task.CompletedTask;
        }
    }
}