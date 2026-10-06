using System.Security.Claims;
using Microlearning.Areas.Catalog.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Microlearning.Areas.Catalog.Controllers
{
    [ApiController]
    [Route("api/catalog/subjects")]
    [Authorize]
    public class FavoriteSubjectsController : ControllerBase
    {
        private readonly IFavoriteSubjectService _favoriteService;

        public FavoriteSubjectsController(IFavoriteSubjectService favoriteService)
        {
            _favoriteService = favoriteService;
        }

        /// <summary>
        /// Thả tim / Bỏ thả tim môn học yêu thích
        /// </summary>
        [HttpPost("{subjectId:int}/favorite")]
        public async Task<IActionResult> ToggleFavorite(int subjectId, CancellationToken cancellationToken)
        {
            var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
            if (string.IsNullOrEmpty(userId))
            {
                return Unauthorized();
            }

            var result = await _favoriteService.ToggleFavoriteAsync(userId, subjectId, cancellationToken);
            return Ok(result);
        }

        /// <summary>
        /// Lấy danh sách đầy đủ các môn học đã thả tim yêu thích của người dùng
        /// </summary>
        [HttpGet("favorites")]
        public async Task<IActionResult> GetMyFavorites(CancellationToken cancellationToken)
        {
            var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
            if (string.IsNullOrEmpty(userId))
            {
                return Unauthorized();
            }

            var result = await _favoriteService.GetMyFavoritesAsync(userId, cancellationToken);
            return Ok(result);
        }

        /// <summary>
        /// Lấy danh sách các ID môn học đã yêu thích để hiển thị nhanh trạng thái trái tim trên UI
        /// </summary>
        [HttpGet("favorites/ids")]
        public async Task<IActionResult> GetMyFavoriteIds(CancellationToken cancellationToken)
        {
            var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
            if (string.IsNullOrEmpty(userId))
            {
                return Unauthorized();
            }

            var ids = await _favoriteService.GetMyFavoriteSubjectIdsAsync(userId, cancellationToken);
            return Ok(ids);
        }
    }
}
