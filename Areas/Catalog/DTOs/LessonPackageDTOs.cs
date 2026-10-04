using Microlearning.Model.Entities.Enums;

namespace Microlearning.Areas.Catalog.DTOs
{
    /// <summary>
    /// Gói tải trọn vẹn của 1 bài học phục vụ Offline-First (bao gồm thông tin bài học, media video tải về, và đề thi trắc nghiệm)
    /// </summary>
    public record LessonPackageResponse(
        int LessonId,
        int SubjectId,
        string Title,
        string? Description,
        int DurationSeconds,
        int SortOrder,
        int Version,
        List<LessonPackageMediaAssetDTO> MediaAssets,
        LessonPackageQuizDTO? Quiz
    );

    public record LessonPackageMediaAssetDTO(
        int Id,
        MediaType Type,
        string FileName,
        string BlobKey,
        long SizeBytes,
        string? Checksum,
        int? DurationSeconds,
        MediaAssetStatus Status
    );

    public record LessonPackageQuizDTO(
        int Id,
        string Title,
        int PassScore,
        int Version,
        List<LessonPackageQuestionDTO> Questions
    );

    public record LessonPackageQuestionDTO(
        int Id,
        string Content,
        string? Explanation,
        int Points,
        int SortOrder,
        QuestionType QuestionType,
        List<LessonPackageOptionDTO> Options
    );

    public record LessonPackageOptionDTO(
        int Id,
        string OptionText,
        int SortOrder
    );
}
