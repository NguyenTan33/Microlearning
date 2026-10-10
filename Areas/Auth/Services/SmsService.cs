using Microlearning.Areas.Auth.Interfaces;
using System.Net.Http.Headers;
using System.Text;
using System.Text.Json;

namespace Microlearning.Areas.Auth.Services
{
    public class SmsService : ISmsService
    {
        private readonly IHttpClientFactory _httpClientFactory;
        private readonly IConfiguration _configuration;
        private readonly ILogger<SmsService> _logger;

        public SmsService(
            IHttpClientFactory httpClientFactory,
            IConfiguration configuration,
            ILogger<SmsService> logger)
        {
            _httpClientFactory = httpClientFactory;
            _configuration = configuration;
            _logger = logger;
        }

        public async Task SendOtpAsync(string phoneNumber, string otp)
        {
            // Luôn ghi log ra console để phục vụ debug và test nhanh
            _logger.LogInformation("Gửi OTP đến {Phone}: {Otp}", phoneNumber, otp);

            var accessToken = _configuration["SpeedSMS:AccessToken"];
            if (string.IsNullOrWhiteSpace(accessToken))
            {
                _logger.LogWarning("SpeedSMS AccessToken chưa được cấu hình. Sử dụng Mock Console OTP.");
                return;
            }

            try
            {
                // Chuẩn hóa định dạng số điện thoại Việt Nam cho SpeedSMS (VD: +84912345678 -> 0912345678)
                var cleanPhone = phoneNumber.Trim().Replace(" ", "");
                if (cleanPhone.StartsWith("+84"))
                {
                    cleanPhone = "0" + cleanPhone.Substring(3);
                }
                else if (cleanPhone.StartsWith("84") && cleanPhone.Length == 11)
                {
                    cleanPhone = "0" + cleanPhone.Substring(2);
                }

                var content = $"Ma OTP MicroLearning cua ban la: {otp}. Ma co hieu luc trong 5 phut.";
                var smsType = int.TryParse(_configuration["SpeedSMS:SmsType"], out var type) ? type : 2;
                var sender = _configuration["SpeedSMS:Sender"] ?? "";

                var payload = new
                {
                    to = new[] { cleanPhone },
                    content = content,
                    sms_type = smsType,
                    sender = sender
                };

                var client = _httpClientFactory.CreateClient();
                client.Timeout = TimeSpan.FromSeconds(15);

                var authHeaderValue = Convert.ToBase64String(Encoding.ASCII.GetBytes($"{accessToken}:x"));
                client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Basic", authHeaderValue);

                var jsonContent = new StringContent(
                    JsonSerializer.Serialize(payload),
                    Encoding.UTF8,
                    "application/json");

                var response = await client.PostAsync("https://api.speedsms.vn/index.php/sms/send", jsonContent);
                var responseBody = await response.Content.ReadAsStringAsync();

                if (response.IsSuccessStatusCode)
                {
                    _logger.LogInformation("Gửi SMS OTP thành công qua SpeedSMS tới {Phone}: {Res}", cleanPhone, responseBody);
                }
                else
                {
                    _logger.LogWarning("SpeedSMS trả về phản hồi ({StatusCode}): {Body}", response.StatusCode, responseBody);
                }
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Lỗi khi gọi API SpeedSMS gửi OTP tới {Phone}", phoneNumber);
            }
        }
    }
}