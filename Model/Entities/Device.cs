using Microlearning.Model.Entities.Enums;

namespace Microlearning.Model.Entities
{
    public class Device
    {
        public int Id { get; set; }

        public string AccountId { get; set; } = string.Empty;

        public string DeviceId { get; set; } = string.Empty;

        public DevicePlatform Platform { get; set; } = DevicePlatform.Android;

        public string? DeviceModel { get; set; }

        public string? OsVersion { get; set; }

        public DateTime? LastSyncAt { get; set; }

        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

        public DateTime? UpdatedAt { get; set; }

        public virtual Account? Account { get; set; }
    }
}
