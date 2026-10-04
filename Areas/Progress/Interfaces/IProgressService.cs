using Microlearning.Areas.Progress.DTOs;

namespace Microlearning.Areas.Progress.Interfaces
{
    public interface IProgressService
    {
        Task<LessonProgressResponse> SaveProgressAsync(string accountId, SaveProgressRequest request);
        Task<LessonProgressResponse?> GetLessonProgressAsync(string accountId, int lessonId);
        Task<CourseProgressResponse> GetCourseProgressAsync(string accountId, int courseId);
    }
}
