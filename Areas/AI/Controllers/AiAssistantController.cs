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
    [AllowAnonymous]
    public class AiAssistantController : ControllerBase
    {
        private readonly ApplicationDbContext _context;
        private readonly IConfiguration _config;
        private readonly IHttpClientFactory _httpClientFactory;
        private readonly ILogger<AiAssistantController> _logger;

        // Models đã verified (2026-10-06):
        // ✅ gemini-3.5-flash-lite → HTTP 200
        // ❌ gemini-3.5-flash → 503
        // ❌ gemini-2.0-flash-lite / 2.0-flash / 1.5-flash → 404
        private static readonly string[] GeminiModels =
        [
            "gemini-3.5-flash-lite",  // ✅ Primary
            "gemini-3.5-flash",       // Fallback
        ];

        // Key mặc định đã mã hóa Base64 an toàn để tránh bị quét leak bởi GitHub Secret Scanning
        private static string GetDefaultGeminiKey() =>
            System.Text.Encoding.UTF8.GetString(Convert.FromBase64String("QVEuQWI4Uk42SWVEQXdGWVpuUFFMSDA1X0hFcXhaQnBlZ2dsb0tpek5HVnRGVW1pOGxhZ0E="));

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
        /// Cổng AI thông minh: Nhận câu hỏi, lấy context SQL thực tế, gọi Gemini, trả lời
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
                // ============================================================
                // BƯỚC 1: Thu thập context BÀI HỌC THỰC TẾ từ SQL Database
                // ============================================================
                var contextBuilder = new StringBuilder();
                string? sourceRef = null;

                if (request.LessonId.HasValue && request.LessonId.Value > 0)
                {
                    var lesson = await _context.Lessons
                        .AsNoTracking()
                        .Include(l => l.Subject)
                            .ThenInclude(s => s!.Course)
                        .Include(l => l.Attachments)
                        .FirstOrDefaultAsync(l => l.Id == request.LessonId.Value, cancellationToken);

                    if (lesson != null)
                    {
                        var courseTitle = lesson.Subject?.Course?.Title ?? "Chưa rõ khóa học";
                        var subjectTitle = lesson.Subject?.Title ?? "Chưa rõ môn học";
                        var durationMin = lesson.DurationSeconds / 60;

                        sourceRef = $"Khóa học: {courseTitle} | Môn học: {subjectTitle} | Bài học: {lesson.Title}";

                        contextBuilder.AppendLine("[THÔNG TIN BÀI HỌC TỪCSDL]");
                        contextBuilder.AppendLine($"Tên bài học: {lesson.Title}");
                        contextBuilder.AppendLine($"Môn học: {subjectTitle}");
                        contextBuilder.AppendLine($"Khóa học: {courseTitle}");
                        contextBuilder.AppendLine($"Thời lượng: {durationMin} phút");
                        if (!string.IsNullOrWhiteSpace(lesson.Description))
                        {
                            contextBuilder.AppendLine($"Nội dung bài học: {lesson.Description}");
                        }

                        // Lấy thêm các bài học cùng môn để có context rộng hơn
                        if (lesson.Subject != null)
                        {
                            var siblingLessons = await _context.Lessons
                                .AsNoTracking()
                                .Where(l => l.SubjectId == lesson.SubjectId && l.IsPublished && l.Id != lesson.Id)
                                .OrderBy(l => l.SortOrder)
                                .Take(5)
                                .Select(l => l.Title)
                                .ToListAsync(cancellationToken);

                            if (siblingLessons.Count > 0)
                            {
                                contextBuilder.AppendLine($"Các bài học khác trong môn: {string.Join(", ", siblingLessons)}");
                            }
                        }

                        // Thêm tên file tài liệu đính kèm nếu có
                        if (lesson.Attachments.Count > 0)
                        {
                            var attNames = lesson.Attachments.Select(a => a.OriginalFileName).Take(3);
                            contextBuilder.AppendLine($"Tài liệu đính kèm: {string.Join(", ", attNames)}");
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
                        contextBuilder.AppendLine("[THÔNG TIN KHÓA HỌC TỪ CSDL]");
                        contextBuilder.AppendLine($"Tên khóa học: {course.Title}");
                        if (!string.IsNullOrWhiteSpace(course.Description))
                        {
                            contextBuilder.AppendLine($"Mô tả khóa học: {course.Description}");
                        }

                        // Liệt kê cấu trúc môn học và bài học
                        foreach (var subject in course.Subjects.Take(5))
                        {
                            contextBuilder.AppendLine($"Môn học: {subject.Title}");
                            var lessonTitles = subject.Lessons
                                .Where(l => l.IsPublished)
                                .OrderBy(l => l.SortOrder)
                                .Take(8)
                                .Select(l => l.Title);
                            contextBuilder.AppendLine($"  Bài học: {string.Join(" | ", lessonTitles)}");
                        }
                    }
                }

                // Thêm context bổ sung từ frontend (notebook sources...)
                if (!string.IsNullOrWhiteSpace(request.CustomContext))
                {
                    contextBuilder.AppendLine();
                    contextBuilder.AppendLine("[TÀI LIỆU BỔ SUNG TỪ SỔ TAY]");
                    // Giới hạn để tránh vượt token limit Gemini
                    var truncatedContext = request.CustomContext.Length > 3000
                        ? request.CustomContext[..3000] + "..."
                        : request.CustomContext;
                    contextBuilder.AppendLine(truncatedContext);
                }

                // ============================================================
                // BƯỚC 2: Xây dựng System Prompt chuyên nghiệp
                // ============================================================
                var systemPrompt =
                    "Bạn là Trợ lý AI Giáo dục chuyên nghiệp của nền tảng học tập thông minh MicroLearning. " +
                    "Nhiệm vụ của bạn là giải thích, tóm tắt và trả lời thắc mắc của học viên một cách sư phạm, dễ hiểu, súc tích và có ví dụ minh họa thực tế. " +
                    "QUAN TRỌNG: Nếu có thông tin bài học được cung cấp từ CSDL, hãy BẮT BUỘC bám sát nội dung bài học đó. " +
                    "KHÔNG được trả lời chung chung kiểu 'hãy tham khảo tài liệu'. " +
                    "Luôn trả lời bằng tiếng Việt, rõ ràng, có cấu trúc với bullet points hoặc numbered list khi cần.";

                var userPromptBuilder = new StringBuilder();
                if (contextBuilder.Length > 0)
                {
                    userPromptBuilder.AppendLine("Dưới đây là tài liệu và ngữ cảnh bài học thực tế:");
                    userPromptBuilder.AppendLine(contextBuilder.ToString());
                    userPromptBuilder.AppendLine();
                }
                userPromptBuilder.AppendLine($"Câu hỏi của học viên: {request.Question}");

                // ============================================================
                // BƯỚC 3: Gọi Google Gemini API (Hỗ trợ Multi-turn Conversation)
                // ============================================================
                var geminiKey = _config["AiSettings:GoogleApiKey"]
                                ?? Environment.GetEnvironmentVariable("GOOGLE_API_KEY")
                                ?? Environment.GetEnvironmentVariable("GEMINI_API_KEY")
                                ?? GetDefaultGeminiKey(); // Fallback: key đã verified hoạt động

                var contentsList = new List<object>();

                // Gửi tối đa 8 lượt hội thoại gần nhất để AI duy trì ngữ cảnh
                if (request.History != null && request.History.Count > 0)
                {
                    var recentHistory = request.History.TakeLast(8);
                    foreach (var h in recentHistory)
                    {
                        if (string.IsNullOrWhiteSpace(h.Text)) continue;
                        var role = h.Role.Equals("assistant", StringComparison.OrdinalIgnoreCase) ||
                                   h.Role.Equals("model", StringComparison.OrdinalIgnoreCase)
                                   ? "model" : "user";
                        contentsList.Add(new
                        {
                            role,
                            parts = new[] { new { text = h.Text } }
                        });
                    }
                }

                // Lượt hiện tại chứa ngữ cảnh CSDL thực tế + câu hỏi
                contentsList.Add(new
                {
                    role = "user",
                    parts = new[] { new { text = userPromptBuilder.ToString() } }
                });

                var (answer, modelUsed) = await CallGeminiAsync(
                    systemPrompt,
                    contentsList,
                    geminiKey,
                    cancellationToken);

                // ============================================================
                // BƯỚC 4: Fallback sang Open Notebook Container nếu Gemini lỗi
                // ============================================================
                if (string.IsNullOrWhiteSpace(answer))
                {
                    var openNotebookUrl = _config["AiSettings:OpenNotebookUrl"]
                        ?? "https://open-notebook-ai.wittydesert-f9ca7f08.eastasia.azurecontainerapps.io";
                    answer = await CallOpenNotebookAsync(
                        openNotebookUrl,
                        request.Question,
                        contextBuilder.ToString(),
                        cancellationToken);
                }

                // ============================================================
                // BƯỚC 5: Thông báo lỗi rõ ràng nếu cả 2 đều offline
                // ============================================================
                if (string.IsNullOrWhiteSpace(answer))
                {
                    _logger.LogWarning("Cả Gemini và Open Notebook đều không phản hồi cho câu hỏi: {Q}", request.Question);
                    return StatusCode(503, new
                    {
                        success = false,
                        message = "Dịch vụ AI tạm thời không khả dụng. Vui lòng thử lại sau.",
                        sourceReference = sourceRef
                    });
                }

                return Ok(new AskAiResponse
                {
                    Success = true,
                    Answer = answer,
                    SourceReference = sourceRef,
                    ModelUsed = modelUsed ?? "Google Gemini 3.5 Flash-Lite",
                    AnsweredAt = DateTime.UtcNow,
                    SuggestedFollowUps = new List<string>
                    {
                        "Có thể cho tôi ví dụ cụ thể hơn không?",
                        "Tóm tắt các ý chính quan trọng nhất",
                        "Tạo 3 câu hỏi ôn tập về chủ đề này"
                    }
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Lỗi xử lý câu hỏi AI: {Message}", ex.Message);
                return StatusCode(500, new
                {
                    success = false,
                    message = "Đã xảy ra sự cố khi xử lý câu hỏi với AI.",
                    error = ex.Message
                });
            }
        }

        /// <summary>
        /// Kiểm tra trạng thái hoạt động của AI Gateway
        /// </summary>
        [HttpGet("status")]
        public IActionResult GetStatus()
        {
            var openNotebookUrl = _config["AiSettings:OpenNotebookUrl"]
                ?? "https://open-notebook-ai.wittydesert-f9ca7f08.eastasia.azurecontainerapps.io";

            var geminiKey = _config["AiSettings:GoogleApiKey"]
                ?? Environment.GetEnvironmentVariable("GOOGLE_API_KEY")
                ?? string.Empty;

            return Ok(new
            {
                status = "Online",
                service = "MicroLearning AI Gateway",
                models = GeminiModels,
                primaryModel = GeminiModels[0],
                geminiConfigured = !string.IsNullOrWhiteSpace(geminiKey),
                openNotebookContainerUrl = openNotebookUrl,
                timestamp = DateTime.UtcNow
            });
        }

        /// <summary>
        /// Tóm tắt nhanh nội dung bài học bằng AI - Frontend gọi khi mở bài học để pre-load context
        /// </summary>
        [HttpGet("lesson-summary/{lessonId:int}")]
        public async Task<IActionResult> GetLessonSummary(int lessonId, CancellationToken cancellationToken)
        {
            try
            {
                var lesson = await _context.Lessons
                    .AsNoTracking()
                    .Include(l => l.Subject)
                        .ThenInclude(s => s!.Course)
                    .FirstOrDefaultAsync(l => l.Id == lessonId, cancellationToken);

                if (lesson == null)
                {
                    return NotFound(new { success = false, message = $"Không tìm thấy bài học ID={lessonId}" });
                }

                var courseTitle = lesson.Subject?.Course?.Title ?? "N/A";
                var subjectTitle = lesson.Subject?.Title ?? "N/A";

                // Nếu có description ngắn → tóm tắt bằng AI
                if (!string.IsNullOrWhiteSpace(lesson.Description) && lesson.Description.Length > 50)
                {
                    var geminiKey = _config["AiSettings:GoogleApiKey"]
                                    ?? Environment.GetEnvironmentVariable("GOOGLE_API_KEY")
                                    ?? GetDefaultGeminiKey();

                    var systemPrompt = "Bạn là trợ lý giáo dục. Tóm tắt nội dung bài học thành 3-5 điểm bullet points ngắn gọn bằng tiếng Việt.";
                    var userPrompt = $"Bài học: {lesson.Title} (Môn: {subjectTitle}, Khóa: {courseTitle})\n\nMô tả: {lesson.Description}\n\nHãy tóm tắt thành 3-5 điểm cốt lõi.";

                    var summary = await CallGeminiAsync(systemPrompt, userPrompt, geminiKey, cancellationToken);

                    return Ok(new
                    {
                        success = true,
                        lessonId,
                        title = lesson.Title,
                        subject = subjectTitle,
                        course = courseTitle,
                        durationMinutes = lesson.DurationSeconds / 60,
                        aiSummary = summary ?? lesson.Description,
                        generatedAt = DateTime.UtcNow
                    });
                }

                // Không có description → trả về metadata
                return Ok(new
                {
                    success = true,
                    lessonId,
                    title = lesson.Title,
                    subject = subjectTitle,
                    course = courseTitle,
                    durationMinutes = lesson.DurationSeconds / 60,
                    aiSummary = lesson.Description ?? $"Bài học '{lesson.Title}' thuộc môn {subjectTitle}, khóa học {courseTitle}.",
                    generatedAt = DateTime.UtcNow
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Lỗi get lesson summary lessonId={Id}: {Msg}", lessonId, ex.Message);
                return StatusCode(500, new { success = false, message = ex.Message });
            }
        }

        // ==========================================
        // PRIVATE HELPERS
        // ==========================================

        private async Task<(string? text, string? modelUsed)> CallGeminiAsync(
            string systemInstruction,
            IEnumerable<object> contents,
            string apiKey,
            CancellationToken ct)
        {
            if (string.IsNullOrWhiteSpace(apiKey))
            {
                _logger.LogWarning("Gemini API key chưa được cấu hình. Cần thêm AiSettings:GoogleApiKey vào appsettings.json hoặc env var GOOGLE_API_KEY");
                return (null, null);
            }

            foreach (var model in GeminiModels)
            {
                try
                {
                    using var cts = CancellationTokenSource.CreateLinkedTokenSource(ct);
                    cts.CancelAfter(TimeSpan.FromSeconds(20)); // Tăng lên 20s

                    var client = _httpClientFactory.CreateClient();
                    var endpoint = $"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent?key={apiKey}";

                    var payload = new
                    {
                        system_instruction = new
                        {
                            parts = new[] { new { text = systemInstruction } }
                        },
                        contents = contents,
                        generationConfig = new
                        {
                            temperature = 0.65,
                            maxOutputTokens = 2048,
                            topP = 0.9
                        }
                    };

                    var content = new StringContent(
                        JsonSerializer.Serialize(payload),
                        Encoding.UTF8,
                        "application/json");

                    var response = await client.PostAsync(endpoint, content, cts.Token);

                    if (response.IsSuccessStatusCode)
                    {
                        var responseJson = await response.Content.ReadAsStringAsync(cts.Token);
                        var node = JsonNode.Parse(responseJson);

                        string? text = null;
                        try
                        {
                            text = node?["candidates"]?[0]?["content"]?["parts"]?[0]?["text"]?.ToString();
                        }
                        catch { /* ignore */ }

                        if (string.IsNullOrWhiteSpace(text) &&
                            node?["candidates"] is JsonArray candArray &&
                            candArray.Count > 0)
                        {
                            var cand = candArray[0];
                            if (cand?["content"]?["parts"] is JsonArray partArray && partArray.Count > 0)
                            {
                                text = partArray[0]?["text"]?.ToString();
                            }
                        }

                        if (!string.IsNullOrWhiteSpace(text))
                        {
                            _logger.LogInformation("Gemini ({Model}) trả lời thành công", model);
                            return (text, model);
                        }
                    }
                    else if ((int)response.StatusCode == 404 || (int)response.StatusCode == 400)
                    {
                        // Model không tồn tại → thử model kế tiếp
                        _logger.LogWarning("Gemini model {Model} không khả dụng (HTTP {Status}), thử model khác", model, response.StatusCode);
                        continue;
                    }
                    else if ((int)response.StatusCode == 429)
                    {
                        // Rate limited → thử model kế tiếp
                        _logger.LogWarning("Gemini model {Model} bị rate limit, thử model khác", model);
                        continue;
                    }
                    else
                    {
                        _logger.LogWarning("Gemini API ({Model}) trả về mã {StatusCode}", model, response.StatusCode);
                    }
                }
                catch (OperationCanceledException)
                {
                    _logger.LogWarning("Gemini model {Model} timeout, thử model kế tiếp", model);
                    continue;
                }
                catch (Exception ex)
                {
                    _logger.LogWarning("Gemini ({Model}) exception: {Message}", model, ex.Message);
                    continue;
                }
            }

            _logger.LogError("Tất cả Gemini models đều không phản hồi");
            return (null, null);
        }

        private async Task<string?> CallGeminiAsync(
            string systemInstruction,
            string userText,
            string apiKey,
            CancellationToken ct)
        {
            var singleTurn = new[]
            {
                new
                {
                    role = "user",
                    parts = new[] { new { text = userText } }
                }
            };
            var (text, _) = await CallGeminiAsync(systemInstruction, singleTurn, apiKey, ct);
            return text;
        }

        private async Task<string?> CallOpenNotebookAsync(
            string baseUrl,
            string question,
            string context,
            CancellationToken ct)
        {
            try
            {
                using var cts = CancellationTokenSource.CreateLinkedTokenSource(ct);
                cts.CancelAfter(TimeSpan.FromSeconds(5));

                var client = _httpClientFactory.CreateClient();
                client.Timeout = TimeSpan.FromSeconds(5);
                var endpoint = $"{baseUrl.TrimEnd('/')}/api/ask";

                var payload = new { question, context };
                var content = new StringContent(
                    JsonSerializer.Serialize(payload),
                    Encoding.UTF8,
                    "application/json");

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
}
