using Microlearning.Model.Entities.Enums;

namespace Microlearning.Areas.Device.DTOs
{
    public record RegisterDeviceRequest(
        string DeviceId,
        DevicePlatform DevicePlatform = DevicePlatform.Android,
        string? DeviceModel = null,
        string? OsVersion = null
    );

    public record DeviceResponse(
        int Id,
        string DeviceId,
        string AccountId,
        DevicePlatform Platform,
        string? DeviceModel,
        string? OsVersion,
        DateTime? LastSyncAt,
        DateTime CreatedAt
    );
}
