namespace Microlearning.Areas.Auth.DTOs
{
    public record GoogleLoginRequest
    {
        public string IdToken { get; set; } = string.Empty;
    }

    public record FacebookLoginRequest
    {
        public string AccessToken { get; set; } = string.Empty;
    }
}
