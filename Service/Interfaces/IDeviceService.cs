using Microlearning.DTOs;
using Microlearning.Model.Entities;

namespace Microlearning.Service.Interfaces
{
    public interface IDeviceService
    {
        Task registerDevice(RegisterDeviceDTO register);
        Task CreateNewDevice(RegisterDeviceDTO register);
        Task AdjustDevice(RegisterDeviceDTO register, Device device);
        Task UpdateLastTimeForOffline(RegisterDeviceDTO register, Device device);
    }
}
