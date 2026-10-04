using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microlearning.DTOs;
using Microlearning.Service.Interfaces;

namespace Microlearning.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class QuizzesController : ControllerBase
    {
        private readonly IQuizService _quizService;

        public QuizzesController(IQuizService quizService)
        {
            _quizService = quizService;
        }

        /// <summary>
        /// Lấy đề thi trắc nghiệm của bài học (Đã ẩn trường IsCorrect để chống lộ đề)
        /// </summary>
        [HttpGet("lesson/{lessonId}")]
        public async Task<IActionResult> GetQuizByLessonId(int lessonId)
        {
            try
            {
                var quiz = await _quizService.GetQuizByLessonId(lessonId);
                return Ok(quiz);
            }
            catch (Exception ex)
            {
                return NotFound(new { message = ex.Message });
            }
        }

        /// <summary>
        /// Nộp bài thi trắc nghiệm (Tự động chấm điểm & Chống nộp trùng Idempotency theo ClientAttemptId)
        /// </summary>
        [HttpPost("attempts")]
        [Authorize]
        public async Task<IActionResult> SubmitQuizAttempt([FromBody] SubmitQuizAttemptDTO dto)
        {
            var accountId = User.FindFirstValue(ClaimTypes.NameIdentifier);
            if (string.IsNullOrWhiteSpace(accountId))
            {
                return Unauthorized(new { message = "Không xác định được danh tính tài khoản từ Token." });
            }

            try
            {
                var result = await _quizService.SubmitQuizAttempt(accountId, dto);
                return Ok(result);
            }
            catch (Exception ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }

        /// <summary>
        /// Tạo đề thi cho bài học
        /// </summary>
        [HttpPost("lesson/{lessonId}")]
        [Authorize]
        public async Task<IActionResult> CreateQuiz(int lessonId, [FromBody] CreateQuizDTO dto)
        {
            await _quizService.CreateQuiz(lessonId, dto);
            return Ok(new { message = "Tạo đề thi cho bài học thành công." });
        }
    }
}
