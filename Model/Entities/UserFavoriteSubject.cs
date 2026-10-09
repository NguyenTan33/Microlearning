namespace Microlearning.Model.Entities
{
    public class UserFavoriteSubject
    {
        public string AccountId { get; set; } = string.Empty;

        public int SubjectId { get; set; }

        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

        public virtual Account? Account { get; set; }

        public virtual Subject? Subject { get; set; }
    }
}
