using Microsoft.AspNetCore.Identity;

namespace Microlearning.Model.Entities
{
    public class Account : IdentityUser
    {
        public string FullName { get; set; } = string.Empty;

        public int? BranchId { get; set; }

        public bool IsActive { get; set; } = true;

        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    }
}
