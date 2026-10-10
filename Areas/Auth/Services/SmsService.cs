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
            _logger.LogInformation(">>> [OTP CONSOLE] Mã xác thực gửi đến {Phone} là: {Otp} <<<", phoneNumber, otp);

            // Chuẩn hóa định dạng số điện thoại E.164 (+84...) cho quốc tế (Twilio) và số nội địa (0...) cho SpeedSMS
            var cleanPhone = phoneNumber.Trim().Replace(" ", "");
            string internationalPhone;
            string domesticPhone;

            if (cleanPhone.StartsWith("+84"))
            {
                internationalPhone = cleanPhone;
                domesticPhone = "0" + cleanPhone.Substring(3);
            }
            else if (cleanPhone.StartsWith("84") && cleanPhone.Length == 11)
            {
                internationalPhone = "+" + cleanPhone;
                domesticPhone = "0" + cleanPhone.Substring(2);
            }
            else if (cleanPhone.StartsWith("0"))
            {
                internationalPhone = "+84" + cleanPhone.Substring(1);
                domesticPhone = cleanPhone;
            }
            else
            {
                internationalPhone = "+84" + cleanPhone;
                domesticPhone = "0" + cleanPhone;
            }

            // 1. Ưu tiên gửi qua SpeedSMS nếu có cấu hình AccessToken
            var speedSmsToken = _configuration["SpeedSMS:AccessToken"];
            if (!string.IsNullOrWhiteSpace(speedSmsToken))
            {
                try
                {
                    var content = $"Ma OTP MicroLearning cua ban la: {otp}. Ma co hieu luc trong 5 phut.";
                    var smsType = int.TryParse(_configuration["SpeedSMS:SmsType"], out var type) ? type : 2;
                    var sender = _configuration["SpeedSMS:Sender"] ?? "";

                    var payload = new
                    {
                        to = new[] { domesticPhone },
                        content = content,
                        sms_type = smsType,
                        sender = sender
                    };

                    var client = _httpClientFactory.CreateClient();
                    client.Timeout = TimeSpan.FromSeconds(15);

                    var authHeaderValue = Convert.ToBase64String(Encoding.ASCII.GetBytes($"{speedSmsToken}:x"));
                    client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Basic", authHeaderValue);

                    var jsonContent = new StringContent(
                        JsonSerializer.Serialize(payload),
                        Encoding.UTF8,
                        "application/json");

                    var response = await client.PostAsync("https://api.speedsms.vn/index.php/sms/send", jsonContent);
                    var responseBody = await response.Content.ReadAsStringAsync();

                    if (response.IsSuccessStatusCode)
                    {
                        _logger.LogInformation("Gửi SMS OTP thành công qua SpeedSMS tới {Phone}: {Res}", domesticPhone, responseBody);
                        return;
                    }
                    else
                    {
                        _logger.LogWarning("SpeedSMS trả về phản hồi ({StatusCode}): {Body}", response.StatusCode, responseBody);
                    }
                }
                catch (Exception ex)
                {
                    _logger.LogError(ex, "Lỗi khi gọi API SpeedSMS gửi OTP tới {Phone}", domesticPhone);
                }
            }

            // 2. Dự phòng qua Twilio nếu có cấu hình
            var twilioSid = _configuration["Twilio:AccountSid"];
            var twilioToken = _configuration["Twilio:AuthToken"];
            var twilioFrom = _configuration["Twilio:FromPhoneNumber"] ?? "+17372508034";

            if (!string.IsNullOrWhiteSpace(twilioSid) && !string.IsNullOrWhiteSpace(twilioToken))
            {
                try
                {
                    var client = _httpClientFactory.CreateClient();
                    client.Timeout = TimeSpan.FromSeconds(15);

                    var authValue = Convert.ToBase64String(Encoding.ASCII.GetBytes($"{twilioSid}:{twilioToken}"));
                    client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Basic", authValue);

                    var messageBody = $"Ma OTP MicroLearning cua ban la: {otp}. Ma co hieu luc trong 5 phut.";
                    var postData = new Dictionary<string, string>
                    {
                        { "To", internationalPhone },
                        { "From", twilioFrom },
                        { "Body", messageBody }
                    };

                    var twilioUrl = $"https://api.twilio.com/2010-04-01/Accounts/{twilioSid}/Messages.json";
                    var formContent = new FormUrlEncodedContent(postData);

                    var response = await client.PostAsync(twilioUrl, formContent);
                    var responseBody = await response.Content.ReadAsStringAsync();

                    if (response.IsSuccessStatusCode)
                    {
                        _logger.LogInformation("Gửi SMS OTP thành công qua Twilio tới {Phone}: {Res}", internationalPhone, responseBody);
                        return;
                    }
                    else
                    {
                        _logger.LogWarning("Twilio trả về lỗi ({StatusCode}): {Body}", response.StatusCode, responseBody);
                    }
                }
                catch (Exception ex)
                {
                    _logger.LogError(ex, "Lỗi khi gọi API Twilio gửi SMS tới {Phone}", internationalPhone);
                }
            }
        }
    }
}