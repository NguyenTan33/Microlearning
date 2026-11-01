using Microlearning.Areas.Catalog.DTOs;
using Microsoft.AspNetCore.Http;

namespace Microlearning.Areas.Catalog.Interfaces
{
    public interface ICourseService
    {
        Task<List<CourseResponse>> GetAllCoursesAsync(bool includeUnpublished = false, string? currentUserId = null, bool isAdmin = false);
        Task<CourseDetailResponse> GetCourseByIdAsync(int courseId, bool includeUnpublished = false, string? currentUserId = null, bool isAdmin = false);
        Task<CourseResponse> CreateCourseAsync(CreateCourseRequest request, string? currentUserId = null, string? authorName = null);
        Task<CourseResponse> UpdateCourseAsync(int courseId, UpdateCourseRequest request, string? currentUserId = null, bool isAdmin = false);
        Task<bool> DeleteCourseAsync(int courseId, string? currentUserId = null, bool isAdmin = false);
        Task<bool> TogglePublishAsync(int courseId, string? currentUserId = null, bool isAdmin = false);
        Task<bool> CanUserManageCourseAsync(int courseId, string? currentUserId, bool isAdmin);
        Task<string> UploadThumbnailAsync(IFormFile file, CancellationToken cancellationToken = default);
        void InvalidateCache(int? courseId = null);
    }
}
