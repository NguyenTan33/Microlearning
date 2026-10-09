using System.Security.Claims;
using Microlearning.Areas.Catalog.DTOs;
using Microlearning.Areas.Catalog.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Microlearning.Areas.Catalog.Controllers
{
    [ApiController]
    [Route("api/media-bookmarks")]
    [Authorize]
    public class MediaBookmarksController : ControllerBase
    {
        private readonly IMediaBookmarkService _bookmarkService;

        public MediaBookmarksController(IMediaBookmarkService bookmarkService)
        {
            _bookmarkService = bookmarkService;
        }

        [HttpGet]
        public async Task<IActionResult> GetMyBookmarks(CancellationToken cancellationToken)
        {
            var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
            if (string.IsNullOrEmpty(userId)) return Unauthorized();

            var result = await _bookmarkService.GetMyBookmarksAsync(userId, cancellationToken);
            return Ok(result);
        }

        [HttpGet("lesson/{lessonId:int}")]
        public async Task<IActionResult> GetBookmarksByLesson(int lessonId, CancellationToken cancellationToken)
        {
            var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
            if (string.IsNullOrEmpty(userId)) return Unauthorized();

            var result = await _bookmarkService.GetBookmarksByLessonAsync(userId, lessonId, cancellationToken);
            return Ok(result);
        }

        [HttpPost]
        public async Task<IActionResult> CreateBookmark([FromBody] CreateMediaBookmarkRequest request, CancellationToken cancellationToken)
        {
            var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
            if (string.IsNullOrEmpty(userId)) return Unauthorized();

            var result = await _bookmarkService.CreateBookmarkAsync(userId, request, cancellationToken);
            return Ok(result);
        }

        [HttpDelete("{id}")]
        public async Task<IActionResult> DeleteBookmark(string id, CancellationToken cancellationToken)
        {
            var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
            if (string.IsNullOrEmpty(userId)) return Unauthorized();

            var result = await _bookmarkService.DeleteBookmarkAsync(userId, id, cancellationToken);
            return Ok(new { success = result });
        }
    }
}
