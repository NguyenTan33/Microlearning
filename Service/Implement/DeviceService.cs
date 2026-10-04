using Microsoft.EntityFrameworkCore;
using Microlearning.Model;          // 👈 1. Thêm using này
using Microlearning.Model.Entities;
using Microlearning.DTOs;
using Microsoft.Win32;
using Microsoft.Identity.Client;

using Microlearning.Service.Interfaces;

namespace Microlearning.Service.Implement
{
    public class DeviceService : IDeviceService
    { 
        private readonly ApplicationDbContext dbContext;
        public DeviceService(ApplicationDbContext dbContext) { this.dbContext = dbContext ; }

        public async Task registerDevice(RegisterDeviceDTO register)
        {
            var device = dbContext.Devices.FirstOrDefault(d => d.DeviceId == register.deviceID);

            if (device != null)  await AdjustDevice(register, device); 
            else
            {
                await CreateNewDevice(register);
            }
        }
        public async Task CreateNewDevice(RegisterDeviceDTO register)
        {
            Device newDevice = new Device
            {
                DeviceId = register.deviceID,
                Platform = register.devicePlatform,
                CreatedAt = DateTime.UtcNow,
                DeviceModel = register.DeviceModel,
                OsVersion = register.OsVersion,
                AccountId = register.accountID
            };

            dbContext.Devices.Add(newDevice);
            await dbContext.SaveChangesAsync();
        }
        public async Task AdjustDevice(RegisterDeviceDTO register , Device device)
        {
            device.Platform = register.devicePlatform;
            device.DeviceModel = register.DeviceModel;
            device.OsVersion = register.OsVersion;
            device.UpdatedAt = DateTime.UtcNow;
            device.AccountId = register.accountID;
            await dbContext.SaveChangesAsync();
        }
        public async Task UpdateLastTimeForOffline(RegisterDeviceDTO register ,Device device)
        {
            device.LastSyncAt = DateTime.UtcNow;
            await dbContext.SaveChangesAsync();
        }
    }
}
