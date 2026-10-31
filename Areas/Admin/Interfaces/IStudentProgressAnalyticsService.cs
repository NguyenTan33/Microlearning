using Microlearning.Areas.Admin.DTOs;

namespace Microlearning.Areas.Admin.Interfaces
{
    public interface IStudentProgressAnalyticsService
    {
        Task<CourseOverviewMetricsDto> GetCourseMetricsOverviewAsync(int courseId, CancellationToken cancellationToken = default);
        Task<PagedResult<StudentProgressDetailDto>> GetCourseStudentsProgressAsync(int courseId, StudentProgressFilterDto filter, CancellationToken cancellationToken = default);
        Task<List<StudentLessonQuizDetailDto>> GetStudentCourseDetailAsync(int courseId, string studentId, CancellationToken cancellationToken = default);
    }
}
