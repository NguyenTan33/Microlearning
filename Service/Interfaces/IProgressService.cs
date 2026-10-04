using Microlearning.DTOs;
using Microlearning.Model.Entities;

namespace Microlearning.Service.Interfaces
{
    public interface IProgressService
    {
        Task SaveProgress(string accountId, SaveProgressDTO dto);
        Task<LessonProgress?> GetLessonProgress(string accountId, int lessonId);
        Task<decimal> GetCourseProgress(string accountId, int courseId);
    }
}
