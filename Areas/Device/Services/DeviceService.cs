using Microlearning.Areas.Device.DTOs;
using Microlearning.Areas.Device.Interfaces;
using Microlearning.Exceptions;
using Microlearning.Model;
using Microlearning.Model.Entities;
using Microsoft.EntityFrameworkCore;

namespace Microlearning.Areas.Device.Services
{
    public class DeviceService : IDeviceService
    {
        private readonly ApplicationDbContext _dbContext;

        public DeviceService(ApplicationDbContext dbContext)
        {
            _dbContext = dbContext;
        }

        public async Task<DeviceResponse> RegisterDeviceAsync(string accountId, RegisterDeviceRequest request)
        {
            if (string.IsNullOrWhiteSpace(request.DeviceId))
            {
                throw new BusinessException("DeviceId không được để trống.");
            }

            var device = await _dbContext.Devices
                .FirstOrDefaultAsync(d => d.DeviceId == request.DeviceId);

            if (device != null)
            {
                // Cập nhật thông tin thiết bị (Upsert)
                device.AccountId = accountId;
                device.Platform = request.DevicePlatform;
                device.DeviceModel = request.DeviceModel;
                device.OsVersion = request.OsVersion;
                device.UpdatedAt = DateTime.UtcNow;
            }
            else
            {
                // Tạo mới
                device = new Model.Entities.Device
                {
                    DeviceId = request.DeviceId.Trim(),
                    AccountId = accountId,
                    Platform = request.DevicePlatform,
                    DeviceModel = request.DeviceModel?.Trim(),
                    OsVersion = request.OsVersion?.Trim(),
                    CreatedAt = DateTime.UtcNow
                };

                _dbContext.Devices.Add(device);
            }

            await _dbContext.SaveChangesAsync();

            return new DeviceResponse(
                device.Id,
                device.DeviceId,
                device.AccountId,
                device.Platform,
                device.DeviceModel,
                device.OsVersion,
                device.LastSyncAt,
                device.CreatedAt
            );
        }

        public async Task UpdateLastSyncTimeAsync(string accountId, string deviceId)
        {
            var device = await _dbContext.Devices
                .FirstOrDefaultAsync(d => d.AccountId == accountId && d.DeviceId == deviceId);

            if (device != null)
            {
                device.LastSyncAt = DateTime.UtcNow;
                await _dbContext.SaveChangesAsync();
            }
        }
    }
}
