using Microlearning.Areas.Catalog.DTOs;

namespace Microlearning.Areas.Catalog.Interfaces
{
    public interface ICourseService
    {
        Task<List<CourseResponse>> GetAllCoursesAsync();
        Task<CourseDetailResponse> GetCourseByIdAsync(int courseId);
        Task<CourseResponse> CreateCourseAsync(CreateCourseRequest request);
        Task<CourseResponse> UpdateCourseAsync(int courseId, UpdateCourseRequest request);
        Task<bool> DeleteCourseAsync(int courseId);
        Task<bool> TogglePublishAsync(int courseId);
    }
}
