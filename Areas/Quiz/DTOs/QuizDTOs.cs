using Microlearning.Model.Entities.Enums;

namespace Microlearning.Areas.Quiz.DTOs
{
    public record CreateQuizRequest(
        string Title,
        int PassScore = 80,
        List<CreateQuestionRequest>? Questions = null
    );

    public record UpdateQuizRequest(
        string Title,
        int PassScore = 80,
        List<CreateQuestionRequest>? Questions = null
    );

    public record CreateQuestionRequest(
        string Content,
        string? Explanation,
        int Points = 10,
        int SortOrder = 0,
        QuestionType QuestionType = QuestionType.SingleChoice,
        List<CreateQuizOptionRequest>? Options = null
    );

    public record CreateQuizOptionRequest(
        string OptionText,
        bool IsCorrect,
        int SortOrder = 0
    );

    public record QuizSummaryResponse(
        int Id,
        int LessonId,
        string Title,
        int PassScore,
        int Version,
        int QuestionCount,
        double? BestScore = null,
        bool IsPassed = false,
        int AttemptsCount = 0
    );

    public record QuizDetailResponse(
        int Id,
        int LessonId,
        string Title,
        int PassScore,
        int Version,
        List<QuestionResponse> Questions
    );

    public record QuestionResponse(
        int Id,
        string Content,
        string? Explanation,
        int Points,
        int SortOrder,
        QuestionType QuestionType,
        List<QuizOptionResponse> Options
    );

    /// <summary>
    /// Lựa chọn đáp án trả về cho Client - TUYỆT ĐỐI KHÔNG CÓ trường IsCorrect
    /// </summary>
    public record QuizOptionResponse(
        int Id,
        string OptionText,
        int SortOrder
    );
}
