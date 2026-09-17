namespace Microlearning.Areas.Auth.DTOs
{
    public record VerifyForgotPasswordOtpRequest
    {
        public string PhoneNumber { get; set; } = string.Empty;
        public string Otp { get; set; } = string.Empty;
    }

    public record VerifyForgotPasswordOtpResponse
    {
        public string ResetToken { get; set; } = string.Empty;
        public string UserId { get; set; } = string.Empty;
        public string Otp { get; set; } = string.Empty;
    }

    public record VerifyRegisterOtpRequest
    {
        public string PhoneNumber { get; set; } = string.Empty;
        public string Otp { get; set; } = string.Empty;
    }

    public record VerifyRegisterOtpResponse
    {
        public string Message { get; set; } = string.Empty;
        public string UserId { get; set; } = string.Empty;
    }
}
