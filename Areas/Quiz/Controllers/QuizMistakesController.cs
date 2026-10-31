using System.Security.Claims;
using Microlearning.Areas.Quiz.DTOs;
using Microlearning.Areas.Quiz.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Microlearning.Areas.Quiz.Controllers
{
    [ApiController]
    [Route("api/quiz/mistakes")]
    [Authorize]
    public class QuizMistakesController : ControllerBase
    {
        private readonly IQuizMistakeVaultService _mistakeService;

        public QuizMistakesController(IQuizMistakeVaultService mistakeService)
        {
            _mistakeService = mistakeService;
        }

        /// <summary>
        /// Lấy danh sách câu hỏi làm sai phẳng của cá nhân
        /// </summary>
        [HttpGet]
        public async Task<IActionResult> GetMyMistakes([FromQuery] bool includeResolved, CancellationToken cancellationToken)
        {
            var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
            if (string.IsNullOrEmpty(userId))
            {
                return Unauthorized();
            }

            var result = await _mistakeService.GetMyMistakesAsync(userId, includeResolved, cancellationToken);
            return Ok(result);
        }

        /// <summary>
        /// Lấy danh sách Sổ câu sai phân cấp theo Khóa học -> Bài học để học viên chọn bài luyện tập
        /// </summary>
        [HttpGet("grouped")]
        public async Task<IActionResult> GetGroupedMistakes([FromQuery] bool includeResolved, CancellationToken cancellationToken)
        {
            var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
            if (string.IsNullOrEmpty(userId))
            {
                return Unauthorized();
            }

            var result = await _mistakeService.GetGroupedMistakesAsync(userId, includeResolved, cancellationToken);
            return Ok(result);
        }

        /// <summary>
        /// Tạo phiên ôn luyện các câu làm sai (hỗ trợ lọc theo bài học hoặc khóa học cụ thể)
        /// </summary>
        [HttpGet("practice")]
        public async Task<IActionResult> GeneratePracticeSession(
            [FromQuery] int? lessonId,
            [FromQuery] int? courseId,
            CancellationToken cancellationToken)
        {
            var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
            if (string.IsNullOrEmpty(userId))
            {
                return Unauthorized();
            }

            var session = await _mistakeService.GenerateReviewSessionAsync(userId, lessonId, courseId, cancellationToken);
            return Ok(session);
        }

        /// <summary>
        /// Nộp câu trả lời ôn tập lại câu hỏi sai và nhận phản hồi chi tiết
        /// </summary>
        [HttpPost("{mistakeId:long}/answer")]
        public async Task<IActionResult> SubmitAnswer(long mistakeId, [FromBody] SubmitMistakeAnswerRequest request, CancellationToken cancellationToken)
        {
            var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
            if (string.IsNullOrEmpty(userId))
            {
                return Unauthorized();
            }

            var result = await _mistakeService.SubmitPracticeAnswerAsync(userId, mistakeId, request.SelectedOptionId, cancellationToken);
            return Ok(result);
        }
    }
}
