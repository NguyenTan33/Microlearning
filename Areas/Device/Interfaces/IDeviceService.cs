using Microlearning.Areas.Device.DTOs;

namespace Microlearning.Areas.Device.Interfaces
{
    public interface IDeviceService
    {
        Task<DeviceResponse> RegisterDeviceAsync(string accountId, RegisterDeviceRequest request);
        Task UpdateLastSyncTimeAsync(string accountId, string deviceId);
    }
}
