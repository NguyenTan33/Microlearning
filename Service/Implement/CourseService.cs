using Microlearning.DTOs;
using Microlearning.Model;
using Microlearning.Model.Entities;
using Microsoft.EntityFrameworkCore; 

namespace Microlearning.Service.Implement
{
    public class CourseService
    {
        public readonly ApplicationDbContext dbContext;

        public CourseService(ApplicationDbContext dbContext)
        {
            this.dbContext = dbContext;
        }

        public async Task CreateCourse(CreateCourseDTO createCourseDTO)
        {
            var course = new Model.Entities.Course
            {
                Title = createCourseDTO.Title,
                Description = createCourseDTO.Description,
                ThumbnailUrl = createCourseDTO.ThumbnailUrl,
                IsPublished = createCourseDTO.IsPublished,
                CreatedAt = DateTime.UtcNow
            };
            dbContext.Courses.Add(course);
            await dbContext.SaveChangesAsync();
        }
        public async Task UpdateCourse(int courseId, CreateCourseDTO updateCourseDTO)
        {
            var course = await dbContext.Courses.FindAsync(courseId);
            if (course == null)
            {
                throw new Exception("Course not found");
            }
            course.Title = updateCourseDTO.Title;
            course.Description = updateCourseDTO.Description;
            course.ThumbnailUrl = updateCourseDTO.ThumbnailUrl;
            course.IsPublished = updateCourseDTO.IsPublished;
            course.UpdatedAt = DateTime.UtcNow;
            course.Version += 1; 
            await dbContext.SaveChangesAsync();
        }
        public async Task DeleteCourse(int courseId)
        {
            var course = await dbContext.Courses.FindAsync(courseId);
            if (course == null)
            {
                throw new Exception("Course not found");
            }
            dbContext.Courses.Remove(course);
            await dbContext.SaveChangesAsync();
        }
        public async Task TogglePublishAsync(int courseId)
        {
            var course = await dbContext.Courses.FindAsync(courseId);
            if (course == null)
            {
                throw new Exception("Course not found");
            }
            course.IsPublished = !course.IsPublished;
            course.UpdatedAt = DateTime.UtcNow;
            await dbContext.SaveChangesAsync();
        }
        public async Task<List<Course>> GetAllCourse()
        {
            return await dbContext.Courses
            .Where(c => c.IsPublished)
            .ToListAsync();
        }
        public async Task<Course> GetCourseByID(int courseID)
        {
            var course = await dbContext.Courses
                .Include(c => c.Subjects)
                .FirstOrDefaultAsync(c => c.Id == courseID);
            if (course == null)
            {
                throw new Exception("Course not found");
            }
            return course;
        }
    }
}
