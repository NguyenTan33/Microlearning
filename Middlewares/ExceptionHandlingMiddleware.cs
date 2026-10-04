using System.Text.Json;
using Microlearning.Exceptions;

namespace Microlearning.Middlewares
{
    public class ExceptionHandlingMiddleware
    {
        private readonly RequestDelegate _next;
        private readonly ILogger<ExceptionHandlingMiddleware> _logger;
        private readonly IWebHostEnvironment _env;

        public ExceptionHandlingMiddleware(
            RequestDelegate next,
            ILogger<ExceptionHandlingMiddleware> logger,
            IWebHostEnvironment env)
        {
            _next = next;
            _logger = logger;
            _env = env;
        }

        public async Task InvokeAsync(HttpContext context)
        {
            try
            {
                await _next(context);
            }
            catch (BusinessException ex)
            {
                await HandleBusinessExceptionAsync(context, ex);
            }
            catch (Exception ex)
            {
                await HandleUnexpectedExceptionAsync(context, ex);
            }
        }

        private static async Task HandleBusinessExceptionAsync(
            HttpContext context,
            BusinessException ex)
        {
            context.Response.StatusCode = StatusCodes.Status400BadRequest;
            context.Response.ContentType = "application/json";

            var response = new
            {
                success = false,
                message = ex.Message
            };

            var json = JsonSerializer.Serialize(response);
            await context.Response.WriteAsync(json);
        }

        private async Task HandleUnexpectedExceptionAsync(
            HttpContext context,
            Exception ex)
        {
            _logger.LogError(ex, "Lỗi không dự kiến phát sinh: {Message}", ex.Message);

            context.Response.StatusCode = StatusCodes.Status500InternalServerError;
            context.Response.ContentType = "application/json";

            var response = new
            {
                success = false,
                message = _env.IsDevelopment()
                    ? $"Đã xảy ra lỗi hệ thống: {ex.Message} {(ex.InnerException != null ? $" -> {ex.InnerException.Message}" : "")}"
                    : "Đã xảy ra lỗi hệ thống. Vui lòng thử lại sau."
            };

            var json = JsonSerializer.Serialize(response);
            await context.Response.WriteAsync(json);
        }
    }
}
