using Microlearning.Areas.Device.DTOs;
using Microlearning.Areas.Device.Interfaces;
using Microlearning.Exceptions;
using Microlearning.Model;
using Microlearning.Model.Entities;
using Microsoft.EntityFrameworkCore;
using Microlearning.Infrastructure.Factory;

namespace Microlearning.Areas.Device.Services
{
    public class DeviceService : IDeviceService
    {
        private readonly ApplicationDbContext _dbContext;
        private readonly IValidationFactory _validationFactory;

        public DeviceService(ApplicationDbContext dbContext, IValidationFactory validationFactory)
        {
            _dbContext = dbContext;
            _validationFactory = validationFactory;
        }

        public async Task<DeviceResponse> RegisterDeviceAsync(string accountId, RegisterDeviceRequest request)
        {
            await _validationFactory.ValidateAsync(request);

            var accountExits = await _dbContext.Users.AnyAsync(u => u.Id == accountId);

            if (!accountExits)
            {
                throw new BusinessException("Tài khoản không hợp lệ.");
            }

            var existingDevice = await _dbContext.Devices.FirstOrDefaultAsync(d => d.DeviceId == request.DeviceId && d.AccountId == accountId);

            if (existingDevice != null)
            {
                existingDevice.Platform = request.Platform;
                existingDevice.DeviceModel = request.DeviceModel;
                existingDevice.OsVersion = request.OsVersion;
                existingDevice.UpdatedAt = DateTime.UtcNow;

                await _dbContext.SaveChangesAsync();
                return MapToResponse(existingDevice);
            }

            var newDevice = new Model.Entities.Device
            {
                AccountId = accountId,
                DeviceId = request.DeviceId,
                Platform = request.Platform,
                DeviceModel = request.DeviceModel,
                OsVersion = request.OsVersion,
                CreatedAt = DateTime.UtcNow
            };
            _dbContext.Devices.Add(newDevice);

            await _dbContext.SaveChangesAsync();
            return MapToResponse(newDevice);
        }

        private DeviceResponse MapToResponse(Model.Entities.Device device)
        {
            return new DeviceResponse
            {
                Id = device.Id,
                DeviceId = device.DeviceId,
                Platform = device.Platform.ToString(),
                DeviceModel = device.DeviceModel,
                OsVersion = device.OsVersion,
                LastSyncAt = device.LastSyncAt,
                CreatedAt = device.CreatedAt
            };
        }
    }
    
}
