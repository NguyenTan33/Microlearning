namespace Microlearning.Model.Common
{
    public record HealthCheckResponse
    {
        public string Status { get; init; } = "Healthy";
        public DateTime Timestamp { get; init; } = DateTime.UtcNow;
        public Dictionary<string, string> Checks { get; init; } = new();
    }
}