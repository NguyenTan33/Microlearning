using Microlearning.DTOs;
using Microlearning.Model.Entities;

namespace Microlearning.Service.Interfaces
{
    public interface ISubjectService
    {
        Task CreateSubject(CreateSubjectDTO dto);
        Task<List<Subject>> GetSubjectsByCourseId(int courseId);
        Task UpdateSubject(int subjectId, UpdateSubjectDTO dto);
        Task DeleteSubject(int subjectId);
    }
}
