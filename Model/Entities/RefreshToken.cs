namespace Microlearning.Model.Entities
{
    public class RefreshToken
    {
        public int Id { get; set; }

        public string AccountId { get; set; } = string.Empty;

        public string TokenHash { get; set; } = string.Empty;

        public DateTime ExpiresAt { get; set; }

        public bool IsRevoked { get; set; } = false;

        public DateTime? RevokedAt { get; set; }

        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

        public virtual Account? Account { get; set; }
    }
}
