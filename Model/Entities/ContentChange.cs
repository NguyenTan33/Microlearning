using Microlearning.Model.Entities.Enums;

namespace Microlearning.Model.Entities
{
    public class ContentChange
    {
        public long Sequence { get; set; }

        public string EntityType { get; set; } = string.Empty;

        public int EntityId { get; set; }

        public ContentChangeType ChangeType { get; set; } = ContentChangeType.Created;

        public int Version { get; set; } = 1;

        public DateTime ChangedAt { get; set; } = DateTime.UtcNow;
    }
}
