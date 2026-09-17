namespace Microlearning.Model.Entities
{
    public class OtpVerification
    {
        public int Id { get; set; }

        public string PhoneNumber { get; set; } = string.Empty;

        public string OtpHash { get; set; } = string.Empty;

        public string Purpose { get; set; } = string.Empty;

        public DateTime ExpiresAt { get; set; }

        public int FailedAttempts { get; set; } = 0;

        public bool IsUsed { get; set; } = false;

        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    }
}
