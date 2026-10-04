using System.Security.Claims;
using Microlearning.Areas.Quiz.DTOs;
using Microlearning.Areas.Quiz.Interfaces;
using Microlearning.Exceptions;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Microlearning.Areas.Quiz.Controllers
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
        /// Lấy đề thi trắc nghiệm của bài học (Đã ẩn hoàn toàn trường IsCorrect để chống lộ đề)
        /// </summary>
        [HttpGet("lesson/{lessonId}")]
        [AllowAnonymous]
        public async Task<IActionResult> GetQuizByLessonId(int lessonId)
        {
            var quiz = await _quizService.GetQuizByLessonIdAsync(lessonId);
            return Ok(quiz);
        }

        /// <summary>
        /// Nộp bài thi trắc nghiệm (Tự động chấm điểm & Chống nộp trùng Idempotency theo ClientAttemptId)
        /// </summary>
        [HttpPost("attempts")]
        [Authorize]
        public async Task<IActionResult> SubmitQuizAttempt([FromBody] SubmitQuizAttemptRequest request)
        {
            var accountId = User.FindFirstValue(ClaimTypes.NameIdentifier);
            if (string.IsNullOrWhiteSpace(accountId))
            {
                throw new BusinessException("Không xác định được danh tính tài khoản từ Token.");
            }

            var result = await _quizService.SubmitQuizAttemptAsync(accountId, request);
            return Ok(result);
        }

        /// <summary>
        /// Xem lịch sử các lần thi trắc nghiệm của học viên
        /// </summary>
        [HttpGet("{quizId}/history")]
        [Authorize]
        public async Task<IActionResult> GetQuizHistory(int quizId)
        {
            var accountId = User.FindFirstValue(ClaimTypes.NameIdentifier);
            if (string.IsNullOrWhiteSpace(accountId))
            {
                throw new BusinessException("Không xác định được danh tính tài khoản từ Token.");
            }

            var history = await _quizService.GetQuizHistoryAsync(accountId, quizId);
            return Ok(history);
        }

        /// <summary>
        /// Tạo đề thi cho bài học kèm các câu hỏi và đáp án (Yêu cầu quyền Admin hoặc Giáo viên)
        /// </summary>
        [HttpPost("lesson/{lessonId}")]
        [Authorize(Roles = "Admin,Teacher")]
        public async Task<IActionResult> CreateQuiz(int lessonId, [FromBody] CreateQuizRequest request)
        {
            var result = await _quizService.CreateQuizAsync(lessonId, request);
            return CreatedAtAction(nameof(GetQuizByLessonId), new { lessonId = lessonId }, result);
        }
    }
}
