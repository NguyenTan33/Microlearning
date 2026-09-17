namespace Microlearning.Areas.Auth.DTOs
{
    public record ForgotPasswordRequest
    {
        public string PhoneNumber { get; set; } = string.Empty;
    }

    public record ForgotPasswordResponse
    {
        public string Message { get; set; } = string.Empty;
        public string Otp { get; set; } = string.Empty;
    }

    public record ResetPasswordRequest
    {
        public string PhoneNumber { get; set; } = string.Empty;
        public string ResetToken { get; set; } = string.Empty;
        public string NewPassword { get; set; } = string.Empty;
        public string ConfirmNewPassword { get; set; } = string.Empty;
    }

    public record ChangePasswordRequest
    {
        public string CurrentPassword { get; set; } = string.Empty;
        public string NewPassword { get; set; } = string.Empty;
        public string ConfirmNewPassword { get; set; } = string.Empty;
    }
}
