namespace Microlearning.Areas.Auth.DTOs
{
    public record RegisterRequest
    {
        public string FullName { get; set; } = string.Empty;
        public string Password { get; set; } = string.Empty;
        public string PhoneNumber { get; set; } = string.Empty;
    }

    public record RegisterResponse
    {
        //public string FullName { get; set; } = string.Empty;
        //public string PhoneNumber { get; set; } = string.Empty; 
        public string UserId { get; set; } = string.Empty;

        public string Message { get; set; } = string.Empty;
    }
}
