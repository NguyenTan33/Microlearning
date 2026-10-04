using Microlearning.DTOs;
using Microlearning.Model.Entities;

namespace Microlearning.Service.Interfaces
{
    public interface ICourseService
    {
        Task CreateCourse(CreateCourseDTO createCourseDTO);
        Task UpdateCourse(int courseId, CreateCourseDTO updateCourseDTO);
        Task DeleteCourse(int courseId);
        Task TogglePublishAsync(int courseId);
        Task<List<Course>> GetAllCourse();
        Task<Course> GetCourseByID(int courseID);
    }
}
