namespace Microlearning.Areas.Auth.DTOs
{
    public record RefreshTokenRequest
    {
        public string RefreshToken { get; set; } = string.Empty;
    }

    public record RefreshTokenResponse
    {
        public string AccessToken { get; set; } = string.Empty;
        public string RefreshToken { get; set; } = string.Empty;
        public DateTime ExpiresAt { get; set; }
    }

    public record LogoutRequest
    {
        public string RefreshToken { get; set; } = string.Empty;
    }
}
