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
        /// Lấy danh sách các câu hỏi quiz từng trả lời sai trong sổ tay cá nhân
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
        /// Tạo phiên ôn luyện các câu làm sai (có thể lọc theo bài học cụ thể)
        /// </summary>
        [HttpGet("practice")]
        public async Task<IActionResult> GeneratePracticeSession([FromQuery] int? lessonId, CancellationToken cancellationToken)
        {
            var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
            if (string.IsNullOrEmpty(userId))
            {
                return Unauthorized();
            }

            var session = await _mistakeService.GenerateReviewSessionAsync(userId, lessonId, cancellationToken);
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
