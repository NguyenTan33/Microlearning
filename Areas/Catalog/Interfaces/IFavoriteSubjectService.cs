using Microlearning.Areas.Catalog.DTOs;

namespace Microlearning.Areas.Catalog.Interfaces
{
    public interface IFavoriteSubjectService
    {
        Task<ToggleFavoriteResponse> ToggleFavoriteAsync(string userId, int subjectId, CancellationToken cancellationToken = default);
        Task<IReadOnlyList<FavoriteSubjectDto>> GetMyFavoritesAsync(string userId, CancellationToken cancellationToken = default);
        Task<IReadOnlyList<int>> GetMyFavoriteSubjectIdsAsync(string userId, CancellationToken cancellationToken = default);
    }
}
