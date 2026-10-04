using Microlearning.Areas.Enrollment.DTOs;

namespace Microlearning.Areas.Enrollment.Interfaces
{
    public interface IEnrollmentService
    {
        Task<EnrollmentResponse> EnrollCourseAsync(string accountId, int courseId);
        Task<List<EnrollmentResponse>> GetMyEnrollmentsAsync(string accountId);
    }
}
