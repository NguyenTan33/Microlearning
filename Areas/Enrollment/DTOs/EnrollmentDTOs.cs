using Microlearning.Model.Entities.Enums;

namespace Microlearning.Areas.Enrollment.DTOs
{
    public record EnrollCourseRequest(
        int CourseId
    );

    public record EnrollmentResponse(
        int Id,
        string AccountId,
        int CourseId,
        string CourseTitle,
        string? CourseThumbnail,
        EnrollmentStatus Status,
        DateTime EnrolledAt,
        decimal OverallProgressPercent = 0
    );
}
