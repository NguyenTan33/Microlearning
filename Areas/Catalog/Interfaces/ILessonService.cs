using Microlearning.Areas.Catalog.DTOs;

namespace Microlearning.Areas.Catalog.Interfaces
{
    public interface ILessonService
    {
        Task<List<LessonResponse>> GetLessonsBySubjectIdAsync(int subjectId, bool includeUnpublished = false);
        Task<LessonResponse> GetLessonByIdAsync(int lessonId);
        Task<LessonPackageResponse> GetLessonPackageAsync(int lessonId);
        Task<LessonResponse> CreateLessonAsync(CreateLessonRequest request);
        Task<LessonResponse> UpdateLessonAsync(int lessonId, UpdateLessonRequest request);
        Task<bool> TogglePublishLessonAsync(int lessonId);
        Task<bool> DeleteLessonAsync(int lessonId);
    }
}
