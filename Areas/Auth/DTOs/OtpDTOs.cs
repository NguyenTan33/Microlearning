namespace Microlearning.Areas.Auth.DTOs
{
    public record ResendOtpRequest
    {
        public string PhoneNumber { get; set; } = string.Empty;
        public string Purpose { get; set; } = "Register";
    }

    public record ResendOtpResponse
    {
        public string Message { get; set; } = string.Empty;
        public string Otp { get; set; } = string.Empty;
    }
}
