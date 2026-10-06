using Microlearning.Areas.Gamification.DTOs;

namespace Microlearning.Areas.Gamification.Interfaces
{
    public interface IUserStreakService
    {
        Task<UserStreakDto> GetUserStreakAsync(string userId, CancellationToken cancellationToken = default);
        Task<UserStreakDto> RecordDailyLearningAsync(string userId, CancellationToken cancellationToken = default);
    }
}
