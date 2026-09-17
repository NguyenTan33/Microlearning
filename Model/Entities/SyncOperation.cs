namespace Microlearning.Model.Entities
{
    public class SyncOperation
    {
        public Guid ClientOperationId { get; set; }

        public string AccountId { get; set; } = string.Empty;

        public string DeviceId { get; set; } = string.Empty;

        public string OperationType { get; set; } = string.Empty;

        public DateTime ProcessedAt { get; set; } = DateTime.UtcNow;

        public string? ResponseJson { get; set; }

        public virtual Account? Account { get; set; }
    }
}
