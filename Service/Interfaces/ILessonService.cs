using Microlearning.DTOs;
using Microlearning.Model.Entities;

namespace Microlearning.Service.Interfaces
{
    public interface ILessonService
    {
        Task CreateLesson(CreateLessonDTO dto);
        Task<List<Lesson>> GetLessonsBySubjectId(int subjectId);
        Task<Lesson> GetLessonById(int lessonId);
        Task UpdateLesson(int lessonId, UpdateLessonDTO dto);
        Task TogglePublishLesson(int lessonId);
        Task DeleteLesson(int lessonId);
    }
}
