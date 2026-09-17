namespace Microlearning.Areas.Auth.DTOs
{
    public record LoginRequest
    {
        public string PhoneNumber { get; set; } = string.Empty;
        public string Password { get; set; } = string.Empty;

    }

    public record LoginResponse
    {
        public string AccessToken { get; set; } = string.Empty;
        public string RefreshToken { get; set; } = string.Empty;
        public DateTime ExpiresAt { get; set; }
    }

}
