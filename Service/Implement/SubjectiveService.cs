using Microlearning.DTOs;
using Microlearning.Model;
using Microlearning.Model.Entities;
using Microsoft.EntityFrameworkCore;
namespace Microlearning.Service.Implement
{
    public class SubjectiveService
    {
        public readonly ApplicationDbContext dbContext;
        public SubjectiveService(ApplicationDbContext dbContext)
        {
            this.dbContext = dbContext;
        }

        public async Task CreateSubject(CreateSubjectDTO dto)
        {
            var subject = new Model.Entities.Subject
            {
                CourseId = dto.CourseId,
                Title = dto.Title,
                Description = dto.Description,
                SortOrder = dto.SortOrder,
                CreatedAt = DateTime.UtcNow
            };
            dbContext.Subjects.Add(subject);
            await dbContext.SaveChangesAsync();
        }
        public async Task<List<Subject>> GetSubjectsByCourseId(int courseId)
        {
            List<Subject> subjects = await dbContext.Subjects
                .Where(s => s.CourseId == courseId)
                .OrderBy(s => s.SortOrder)
                .ToListAsync();
            return subjects;
        }
        public async Task UpdateSubject(int subjectId, UpdateSubjectDTO dto)
        {
            var subject = await dbContext.Subjects.FindAsync(subjectId);
            if (subject == null)
            {
                throw new Exception("Subject not found");
            }
            subject.Title = dto.Title;
            subject.Description = dto.Description;
            subject.SortOrder = dto.SortOrder;
            subject.UpdatedAt = DateTime.UtcNow;
            await dbContext.SaveChangesAsync();
        }
        public async Task DeleteSubject(int subjectId)
        {
            var subject = await dbContext.Subjects.FindAsync(subjectId);
            if (subject == null)
            {
                throw new Exception("Subject not found");
            }
            dbContext.Subjects.Remove(subject);
            await dbContext.SaveChangesAsync();
        }
    }
}
