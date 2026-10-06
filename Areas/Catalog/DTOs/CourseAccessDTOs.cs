namespace Microlearning.Areas.Catalog.DTOs
{
    public record CourseAccessStatusDto(
        int CourseId,
        bool IsPrivate,
        bool HasAccess,
        int CurrentPasswordVersion
    );

    public record UnlockCourseRequest(
        string Password
    );

    public record SetCoursePrivacyRequest(
        bool IsPrivate,
        string? NewPassword
    );
}
