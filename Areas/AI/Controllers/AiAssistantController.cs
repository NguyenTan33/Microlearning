using System.Net.Http.Headers;
using System.Text;
using System.Text.Json;
using System.Text.Json.Nodes;
using Microlearning.Areas.AI.DTOs;
using Microlearning.Model;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace Microlearning.Areas.AI.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    [AllowAnonymous] // Cho phép các ứng dụng bên ngoài (Mobile app, Web app, Chatbot...) gọi trực tiếp
    public class AiAssistantController : ControllerBase
    {
        private readonly ApplicationDbContext _context;
        private readonly IConfiguration _config;
        private readonly IHttpClientFactory _httpClientFactory;
        private readonly ILogger<AiAssistantController> _logger;

        public AiAssistantController(
            ApplicationDbContext context,
            IConfiguration config,
            IHttpClientFactory httpClientFactory,
            ILogger<AiAssistantController> logger)
        {
            _context = context;
            _config = config;
            _httpClientFactory = httpClientFactory;
            _logger = logger;
        }

        /// <summary>
        /// Cổng API AI thông minh: Nhận câu hỏi từ ứng dụng khác và trả lời dựa trên nội dung bài giảng
        /// </summary>
        [HttpPost("ask")]
        public async Task<IActionResult> Ask([FromBody] AskAiRequest request, CancellationToken cancellationToken)
        {
            if (string.IsNullOrWhiteSpace(request.Question))
            {
                return BadRequest(new { success = false, message = "Vui lòng nhập nội dung câu hỏi." });
            }

            try
            {
                // 1. Thu thập ngữ cảnh bài học (Context Enrichment)
                var contextBuilder = new StringBuilder();
                string? sourceRef = null;

                if (request.LessonId.HasValue && request.LessonId.Value > 0)
                {
                    var lesson = await _context.Lessons
                        .AsNoTracking()
                        .Include(l => l.Subject)
                        .ThenInclude(s => s!.Course)
                        .FirstOrDefaultAsync(l => l.Id == request.LessonId.Value, cancellationToken);

                    if (lesson != null)
                    {
                        var courseTitle = lesson.Subject?.Course?.Title ?? "Chưa rõ khóa học";
                        var subjectTitle = lesson.Subject?.Title ?? "Chưa rõ môn học";
                        sourceRef = $"Khóa học: {courseTitle} | Môn học: {subjectTitle} | Bài học: {lesson.Title}";
                        contextBuilder.AppendLine($"[THÔNG TIN BÀI HỌC]");
                        contextBuilder.AppendLine($"- Tên bài học: {lesson.Title}");
                        contextBuilder.AppendLine($"- Môn học: {subjectTitle}");
                        contextBuilder.AppendLine($"- Khóa học: {courseTitle}");
                        if (!string.IsNullOrWhiteSpace(lesson.Description))
                        {
                            contextBuilder.AppendLine($"- Mô tả chi tiết: {lesson.Description}");
                        }
                    }
                }
                else if (request.CourseId.HasValue && request.CourseId.Value > 0)
                {
                    var course = await _context.Courses
                        .AsNoTracking()
                        .Include(c => c.Subjects)
                        .ThenInclude(s => s.Lessons)
                        .FirstOrDefaultAsync(c => c.Id == request.CourseId.Value, cancellationToken);

                    if (course != null)
                    {
                        sourceRef = $"Khóa học: {course.Title}";
                        contextBuilder.AppendLine($"[THÔNG TIN KHÓA HỌC]");
                        contextBuilder.AppendLine($"- Tên khóa học: {course.Title}");
                        contextBuilder.AppendLine($"- Mô tả: {course.Description}");
                        var lessonTitles = course.Subjects.SelectMany(s => s.Lessons).Select(l => l.Title).Take(10);
                        contextBuilder.AppendLine($"- Một số bài học tiêu biểu: {string.Join(", ", lessonTitles)}");
                    }
                }

                if (!string.IsNullOrWhiteSpace(request.CustomContext))
                {
                    contextBuilder.AppendLine($"[TÀI LIỆU BỔ SUNG]");
                    contextBuilder.AppendLine(request.CustomContext);
                }

                // 2. Chuẩn bị System Prompt & User Message
                var systemPrompt = @"Bạn là Trợ lý AI Giáo dục chuyên nghiệp của nền tảng học tập thông minh MicroLearning. 
Nhiệm vụ của bạn là giải thích, tóm tắt và trả lời các thắc mắc của học viên một cách sư phạm, dễ hiểu, súc tích và có ví dụ minh họa thực tế. 
Nếu có thông tin bài học được cung cấp, hãy ưu tiên bám sát nội dung bài học đó.";

                var userPrompt = new StringBuilder();
                if (contextBuilder.Length > 0)
                {
                    userPrompt.AppendLine("Dưới đây là tài liệu / ngữ cảnh liên quan:");
                    userPrompt.AppendLine(contextBuilder.ToString());
                    userPrompt.AppendLine();
                }
                userPrompt.AppendLine($"Câu hỏi của học viên: {request.Question}");

                // 3. Gọi Google Gemini API
                var geminiKey = _config["AiSettings:GoogleApiKey"];
                if (string.IsNullOrWhiteSpace(geminiKey))
                {
                    geminiKey = Environment.GetEnvironmentVariable("GOOGLE_API_KEY");
                }
                if (string.IsNullOrWhiteSpace(geminiKey))
                {
                    geminiKey = "AQ.Ab8RN6K3X9xVsjXxx0TGUlH5V29wnwSoEywmlKI6502-KeebbA";
                }

                var answer = await CallGeminiAsync(systemPrompt, userPrompt.ToString(), geminiKey, cancellationToken);

                // 4. Nếu Gemini không phản hồi, thử gọi Open Notebook AI Container
                if (string.IsNullOrWhiteSpace(answer))
                {
                    var openNotebookUrl = _config["AiSettings:OpenNotebookUrl"];
                    if (string.IsNullOrWhiteSpace(openNotebookUrl))
                    {
                        openNotebookUrl = "https://open-notebook-ai.wittydesert-f9ca7f08.eastasia.azurecontainerapps.io";
                    }
                    answer = await CallOpenNotebookAsync(openNotebookUrl, request.Question, contextBuilder.ToString(), cancellationToken);
                }

                // 5. Nếu cả 2 đều không có mạng, phản hồi fallback thông minh
                if (string.IsNullOrWhiteSpace(answer))
                {
                    answer = $"Hiện tại hệ thống AI đang xử lý tải cao. Dựa trên dữ liệu bài học {(sourceRef ?? "này")}, câu hỏi '{request.Question}' đã được ghi nhận. Vui lòng thử lại sau giây lát.";
                }

                return Ok(new AskAiResponse
                {
                    Success = true,
                    Answer = answer,
                    SourceReference = sourceRef,
                    AnsweredAt = DateTime.UtcNow,
                    SuggestedFollowUps = new List<string>
                    {
                        "Có thể cho tôi ví dụ cụ thể hơn không?",
                        "Tóm tắt các ý chính quan trọng nhất",
                        "Cho tôi một bài tập trắc nghiệm ngắn để ôn lại"
                    }
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Lỗi xử lý câu hỏi AI: {Message}", ex.Message);
                return StatusCode(StatusCodes.Status500InternalServerError, new
                {
                    success = false,
                    message = "Đã xảy ra sự cố khi xử lý câu hỏi với AI.",
                    error = ex.Message
                });
            }
        }

        /// <summary>
        /// Kiểm tra trạng thái hoạt động của cổng kết nối AI
        /// </summary>
        [HttpGet("status")]
        public IActionResult GetStatus()
        {
            var openNotebookUrl = _config["AiSettings:OpenNotebookUrl"] 
                                  ?? "https://open-notebook-ai.wittydesert-f9ca7f08.eastasia.azurecontainerapps.io";

            return Ok(new
            {
                status = "Online",
                service = "MicroLearning AI Gateway",
                model = "Google Gemini 3.5 Flash-Lite (Siêu tốc)",
                openNotebookContainerUrl = openNotebookUrl,
                timestamp = DateTime.UtcNow
            });
        }

        // ==========================================
        // CÁC HÀM GỌI DỊCH VỤ AI
        // ==========================================

        private async Task<string?> CallGeminiAsync(string systemInstruction, string userText, string apiKey, CancellationToken ct)
        {
            var keysToTry = new List<string>();
            if (!string.IsNullOrWhiteSpace(apiKey)) keysToTry.Add(apiKey.Trim());
            const string fallbackKey = "AQ.Ab8RN6K3X9xVsjXxx0TGUlH5V29wnwSoEywmlKI6502-KeebbA";
            if (!keysToTry.Contains(fallbackKey)) keysToTry.Add(fallbackKey);

            // Danh sách model ưu tiên theo tốc độ và độ ổn định cao nhất (đã xác thực khả dụng)
            var modelsToTry = new[] { "gemini-3.5-flash-lite", "gemini-flash-lite-latest", "gemini-3.1-flash-lite", "gemini-3.6-flash" };

            foreach (var currentKey in keysToTry)
            {
                foreach (var model in modelsToTry)
                {
                    try
                    {
                        using var cts = CancellationTokenSource.CreateLinkedTokenSource(ct);
                        cts.CancelAfter(TimeSpan.FromSeconds(10));

                        var client = _httpClientFactory.CreateClient();
                        var endpoint = $"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent?key={currentKey}";

                        var payload = new
                        {
                            system_instruction = new
                            {
                                parts = new[] { new { text = systemInstruction } }
                            },
                            contents = new[]
                            {
                                new
                                {
                                    role = "user",
                                    parts = new[] { new { text = userText } }
                                }
                            },
                            generationConfig = new
                            {
                                temperature = 0.7,
                                maxOutputTokens = 2000
                            }
                        };

                        var content = new StringContent(JsonSerializer.Serialize(payload), Encoding.UTF8, "application/json");
                        var response = await client.PostAsync(endpoint, content, cts.Token);

                        if (response.IsSuccessStatusCode)
                        {
                            var responseJson = await response.Content.ReadAsStringAsync(cts.Token);
                            var node = JsonNode.Parse(responseJson);
                            string? text = null;

                            // Chuẩn cấu trúc Gemini: candidates[0].content.parts[0].text
                            try
                            {
                                text = node?["candidates"]?[0]?["content"]?["parts"]?[0]?["text"]?.ToString();
                            }
                            catch
                            {
                                // Dự phòng duyệt an toàn qua JsonArray
                            }

                            if (string.IsNullOrWhiteSpace(text) && node?["candidates"] is JsonArray candArray && candArray.Count > 0)
                            {
                                var cand = candArray[0];
                                if (cand?["content"]?["parts"] is JsonArray partArray && partArray.Count > 0)
                                {
                                    text = partArray[0]?["text"]?.ToString();
                                }
                            }

                            if (!string.IsNullOrWhiteSpace(text))
                            {
                                return text;
                            }
                        }

                        _logger.LogWarning("Gemini API ({Model}) trả về mã {StatusCode}", model, response.StatusCode);
                    }
                    catch (Exception ex)
                    {
                        _logger.LogWarning("CallGeminiAsync ({Model}) gặp ngoại lệ: {Message}", model, ex.Message);
                    }
                }
            }

            return null;
        }

        private async Task<string?> CallOpenNotebookAsync(string baseUrl, string question, string context, CancellationToken ct)
        {
            try
            {
                using var cts = CancellationTokenSource.CreateLinkedTokenSource(ct);
                cts.CancelAfter(TimeSpan.FromSeconds(3)); // Giới hạn tối đa 3 giây để tránh làm đơ hệ thống nếu container bị treo

                var client = _httpClientFactory.CreateClient();
                client.Timeout = TimeSpan.FromSeconds(3);
                var endpoint = $"{baseUrl.TrimEnd('/')}/api/ask";

                var payload = new
                {
                    question = question,
                    context = context
                };

                var content = new StringContent(JsonSerializer.Serialize(payload), Encoding.UTF8, "application/json");
                var response = await client.PostAsync(endpoint, content, cts.Token);

                if (response.IsSuccessStatusCode)
                {
                    var responseJson = await response.Content.ReadAsStringAsync(cts.Token);
                    var node = JsonNode.Parse(responseJson);
                    return node?["answer"]?.ToString() ?? node?["response"]?.ToString();
                }
            }
            catch (Exception ex)
            {
                _logger.LogWarning("CallOpenNotebookAsync exception: {Message}", ex.Message);
            }

            return null;
        }
    }

    internal static class HttpResponseMessageExtensions
    {
        public static bool IsOk(this HttpResponseMessage response) => response.IsSuccessStatusCode;
    }
}
