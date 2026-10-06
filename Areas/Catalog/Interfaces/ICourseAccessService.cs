using Microlearning.Areas.Catalog.DTOs;

namespace Microlearning.Areas.Catalog.Interfaces
{
    public interface ICourseAccessService
    {
        Task<CourseAccessStatusDto> CheckAccessAsync(string? userId, int courseId, CancellationToken cancellationToken = default);
        Task<bool> UnlockCourseWithPasswordAsync(string userId, int courseId, string password, CancellationToken cancellationToken = default);
        Task<bool> SetCoursePrivacyAsync(int courseId, SetCoursePrivacyRequest request, CancellationToken cancellationToken = default);
    }
}
