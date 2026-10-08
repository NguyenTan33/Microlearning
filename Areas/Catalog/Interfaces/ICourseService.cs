using Microlearning.Areas.Catalog.DTOs;

namespace Microlearning.Areas.Catalog.Interfaces
{
    public interface ICourseService
    {
        Task<List<CourseResponse>> GetAllCoursesAsync(bool includeUnpublished = false);
        Task<CourseDetailResponse> GetCourseByIdAsync(int courseId, bool includeUnpublished = false);
        Task<CourseResponse> CreateCourseAsync(CreateCourseRequest request);
        Task<CourseResponse> UpdateCourseAsync(int courseId, UpdateCourseRequest request);
        Task<bool> DeleteCourseAsync(int courseId);
        Task<bool> TogglePublishAsync(int courseId);
        void InvalidateCache(int? courseId = null);
    }
}
