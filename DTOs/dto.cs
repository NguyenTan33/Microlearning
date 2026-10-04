using Microlearning.Model.Entities.Enums;

namespace Microlearning.DTOs
{
    public class dto
    {
    }
    public record RegisterDeviceDTO(string deviceID , DevicePlatform devicePlatform , string? DeviceModel,
        string? OsVersion , string accountID);
    public record CreateCourseDTO(
        string Title,
        string? Description = null,
        string? ThumbnailUrl = null,
        bool IsPublished = false,
        int Version = 1
    );

    public record CreateSubjectDTO(
    int CourseId,
    string Title,
    string? Description = null,
    int SortOrder = 0
);

    public record UpdateSubjectDTO(
        string Title,
        string? Description = null,
        int SortOrder = 0
    );

    public record CreateLessonDTO(
        int SubjectId,
        string Title,
        string? Description = null,
        int DurationSeconds = 0,
        int SortOrder = 0,
        bool IsPublished = false
    );

    public record UpdateLessonDTO(
        string Title,
        string? Description = null,
        int DurationSeconds = 0,
        int SortOrder = 0,
        bool IsPublished = false
    );


    /////////////////////
    ///
    /// <summary>
    /// Học viên gửi cập nhật tiến độ xem video (số giây đã xem, %)
    /// </summary>
    public record SaveProgressDTO(
        int LessonId,
        int WatchedSeconds,
        decimal Percent
    );
    /// <summary>
    /// Trả về chi tiết tiến độ của 1 bài học
    /// </summary>
    public record LessonProgressResponseDTO(
        int LessonId,
        int WatchedSeconds,
        decimal Percent,
        bool IsCompleted,
        DateTime? CompletedAt,
        DateTime LastPlayedAt
    );
    /// <summary>
    /// Trả về tổng tiến độ hoàn thành của cả khóa học
    /// </summary>
    public record CourseProgressResponseDTO(
        int CourseId,
        decimal OverallPercent,
        int CompletedLessons,
        int TotalLessons
    );

    /////
    ///

    /// <summary>
    /// Thông tin để App tải video về máy học offline kèm mã Checksum SHA256
    /// </summary>
    public record MediaDownloadInfoDTO(
        int MediaAssetId,
        int LessonId,
        string FileName,
        string DownloadUrl,
        long SizeBytes,
        int? DurationSeconds,
        string Checksum // SHA256 để kiểm tra file không bị hỏng khi tải
    );
    /// <summary>
    /// Kịch bản thuyết minh để đưa vào AI Text-To-Speech (TTS)
    /// </summary>
    public record CreateNarrationScriptDTO(
        int MediaAssetId,
        string ScriptText,
        string VoiceName = "vi-VN-HoaiMyNeural",
        string Language = "vi-VN"
    );
    public record CreateQuizDTO(
        int LessonId,
        string Title,
        int PassScore = 80,
        int Version = 1
    );
    // ================= DTO NỘP BÀI THI =================
    public record SubmitAnswerItemDTO(
        int QuestionId,
        List<int> SelectedOptionIds // Danh sách các ID đáp án đã tích
    );
    public record SubmitQuizAttemptDTO(
        Guid ClientAttemptId,             // Mã GUID do điện thoại tự sinh (chống nộp trùng)
        int QuizId,                       // Thuộc đề thi nào
        DateTime StartedAt,               // Bắt đầu làm bài lúc mấy giờ
        List<SubmitAnswerItemDTO> Answers // Danh sách các câu học viên đã trả lời
    );
    public record QuizAttemptResultDTO(
        int AttemptId,
        Guid ClientAttemptId,
        int QuizId,
        decimal Score,
        bool IsPassed,
        bool IsDuplicate, // Báo cho client biết đây là bài nộp mới hay kết quả cũ đã có
        DateTime SubmittedAt
    );
    // ================= DTO LẤY ĐỀ THI (ẨN IsCorrect ĐỂ BẢO MẬT) =================
    public record QuizOptionResponseDTO(
        int Id,
        string OptionText,
        int SortOrder
    );
    public record QuestionResponseDTO(
        int Id,
        string Content,
        int Points,
        int SortOrder,
        QuestionType QuestionType,
        List<QuizOptionResponseDTO> Options
    );
    public record QuizDetailDTO(
        int Id,
        int LessonId,
        string Title,
        int PassScore,
        int Version,
        List<QuestionResponseDTO> Questions
    );
    

}
