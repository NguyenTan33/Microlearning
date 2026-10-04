using System.ComponentModel.DataAnnotations;
using Microlearning.Model.Entities.Enums;

namespace Microlearning.Areas.Device.DTOs
{
    // DTO nhận dữ liệu gửi lên từ Mobile
    public class RegisterDeviceRequest
    {
        [Required(ErrorMessage = "DeviceId không được để trống.")]
        [StringLength(100, ErrorMessage = "DeviceId tối đa 100 ký tự.")]
        public string DeviceId { get; set; } = string.Empty;

        [Required(ErrorMessage = "Platform không được để trống.")]
        public DevicePlatform Platform { get; set; } = DevicePlatform.Android;

        [StringLength(100, ErrorMessage = "Tên dòng máy tối đa 100 ký tự.")]
        public string? DeviceModel { get; set; }

        [StringLength(50, ErrorMessage = "Phiên bản OS tối đa 50 ký tự.")]
        public string? OsVersion { get; set; }
    }

    // DTO trả về cho Mobile
    public class DeviceResponse
    {
        public int Id { get; set; }
        public string DeviceId { get; set; } = string.Empty;
        public string Platform { get; set; } = string.Empty;
        public string? DeviceModel { get; set; }
        public string? OsVersion { get; set; }
        public DateTime? LastSyncAt { get; set; }
        public DateTime CreatedAt { get; set; }
    }
}