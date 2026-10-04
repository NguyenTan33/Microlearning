using Microlearning.Areas.Catalog.DTOs;

namespace Microlearning.Areas.Catalog.Interfaces
{
    public interface ISubjectService
    {
        Task<List<SubjectResponse>> GetSubjectsByCourseIdAsync(int courseId);
        Task<SubjectResponse> GetSubjectByIdAsync(int subjectId);
        Task<SubjectResponse> CreateSubjectAsync(CreateSubjectRequest request);
        Task<SubjectResponse> UpdateSubjectAsync(int subjectId, UpdateSubjectRequest request);
        Task<bool> DeleteSubjectAsync(int subjectId);
    }
}
