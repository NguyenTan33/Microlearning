using Microlearning.Model.Entities.Enums;

namespace Microlearning.Model.Entities
{
    public class NarrationScript
    {
        public int Id { get; set; }

        public int MediaAssetId { get; set; }

        public string ScriptText { get; set; } = string.Empty;

        public string VoiceName { get; set; } = "vi-VN-HoaiMyNeural";

        public string Language { get; set; } = "vi-VN";

        public NarrationScriptStatus Status { get; set; } = NarrationScriptStatus.Pending;

        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

        public DateTime? UpdatedAt { get; set; }

        public virtual MediaAsset? MediaAsset { get; set; }
    }
}
