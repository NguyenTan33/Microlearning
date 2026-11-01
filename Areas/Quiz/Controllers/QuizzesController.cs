using System.Security.Claims;
using Microlearning.Areas.Quiz.DTOs;
using Microlearning.Areas.Quiz.Interfaces;
using Microlearning.Exceptions;
using Microlearning.Model;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace Microlearning.Areas.Quiz.Controllers
{
    [ApiController]
    [Authorize]
    [Route("api/[controller]")]
    public class QuizzesController : ControllerBase
    {
        private readonly IQuizService _quizService;
        private readonly ApplicationDbContext _dbContext;

        public QuizzesController(IQuizService quizService, ApplicationDbContext dbContext)
        {
            _quizService = quizService;
            _dbContext = dbContext;
        }

        private async Task EnsureUserCanManageLessonAsync(int lessonId)
        {
            if (User.IsInRole("Admin")) return;
            var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
            var lesson = await _dbContext.Lessons
                .AsNoTracking()
                .Include(l => l.Subject)
                    .ThenInclude(s => s.Course)
                .FirstOrDefaultAsync(l => l.Id == lessonId);
            if (lesson?.Subject?.Course != null)
            {
                var course = lesson.Subject.Course;
                if (!string.IsNullOrEmpty(course.CreatedByAccountId) && course.CreatedByAccountId != userId)
                {
                    throw new BusinessException($"Bạn không có quyền quản lý bài quiz của khóa học do '{course.AuthorName ?? "giảng viên khác"}' tạo.");
                }
            }
        }

        private async Task EnsureUserCanManageQuizAsync(int quizId)
        {
            if (User.IsInRole("Admin")) return;
            var quiz = await _dbContext.Quizzes
                .AsNoTracking()
                .Include(q => q.Lesson)
                    .ThenInclude(l => l.Subject)
                        .ThenInclude(s => s.Course)
                .FirstOrDefaultAsync(q => q.Id == quizId);
            if (quiz?.Lesson?.Subject?.Course != null)
            {
                var course = quiz.Lesson.Subject.Course;
                var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
                if (!string.IsNullOrEmpty(course.CreatedByAccountId) && course.CreatedByAccountId != userId)
                {
                    throw new BusinessException($"Bạn không có quyền chỉnh sửa bài quiz của khóa học do '{course.AuthorName ?? "giảng viên khác"}' tạo.");
                }
            }
        }

        /// <summary>
        /// Lấy toàn bộ danh sách các đề thi trắc nghiệm của bài học kèm trạng thái đã hoàn thành (nếu có Token)
        /// </summary>
        [HttpGet("lesson/{lessonId}/all")]
        public async Task<IActionResult> GetQuizzesByLessonId(int lessonId)
        {
            var accountId = User.FindFirstValue(ClaimTypes.NameIdentifier);
            var quizzes = await _quizService.GetQuizzesByLessonIdAsync(lessonId, accountId);
            return Ok(quizzes);
        }

        /// <summary>
        /// Lấy đề thi trắc nghiệm đầu tiên của một bài học (Tương thích ngược)
        /// </summary>
        [HttpGet("lesson/{lessonId}")]
        public async Task<IActionResult> GetQuizByLessonId(int lessonId)
        {
            var quiz = await _quizService.GetQuizByLessonIdAsync(lessonId);
            return Ok(quiz);
        }

        /// <summary>
        /// Lấy thông tin chi tiết một bài quiz theo ID
        /// </summary>
        [HttpGet("{id:int}")]
        public async Task<IActionResult> GetQuizById(int id)
        {
            var quiz = await _quizService.GetQuizByIdAsync(id);
            if (quiz == null)
            {
                return NotFound(new { message = $"Không tìm thấy bài quiz với ID = {id}." });
            }
            return Ok(quiz);
        }

        /// <summary>
        /// Nộp bài làm trắc nghiệm trực tuyến của học viên
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
        [HttpGet("{quizId:int}/history")]
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
        /// Tạo đề thi cho bài học (Hỗ trợ 1 bài học có nhiều bài tập Quiz)
        /// </summary>
        [HttpPost("lesson/{lessonId:int}")]
        [Authorize(Roles = "Admin,Teacher")]
        public async Task<IActionResult> CreateQuiz(int lessonId, [FromBody] CreateQuizRequest request)
        {
            await EnsureUserCanManageLessonAsync(lessonId);
            var result = await _quizService.CreateQuizAsync(lessonId, request);
            return CreatedAtAction(nameof(GetQuizById), new { id = result.Id }, result);
        }

        /// <summary>
        /// Cập nhật nội dung một đề thi trắc nghiệm
        /// </summary>
        [HttpPut("{id:int}")]
        [Authorize(Roles = "Admin,Teacher")]
        public async Task<IActionResult> UpdateQuiz(int id, [FromBody] UpdateQuizRequest request)
        {
            await EnsureUserCanManageQuizAsync(id);
            var result = await _quizService.UpdateQuizAsync(id, request);
            return Ok(result);
        }

        /// <summary>
        /// Xóa một đề thi trắc nghiệm
        /// </summary>
        [HttpDelete("{id:int}")]
        [Authorize(Roles = "Admin,Teacher")]
        public async Task<IActionResult> DeleteQuiz(int id)
        {
            await EnsureUserCanManageQuizAsync(id);
            var success = await _quizService.DeleteQuizAsync(id);
            if (!success)
            {
                return NotFound(new { message = $"Không tìm thấy đề thi mã {id} để xóa." });
            }
            return Ok(new { message = "Xóa đề thi thành công." });
        }
    }
}
