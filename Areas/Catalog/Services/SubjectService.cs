using Microlearning.Areas.Catalog.DTOs;
using Microlearning.Areas.Catalog.Interfaces;
using Microlearning.Exceptions;
using Microlearning.Model;
using Microlearning.Model.Entities;
using Microsoft.EntityFrameworkCore;

namespace Microlearning.Areas.Catalog.Services
{
    public class SubjectService : ISubjectService
    {
        private readonly ApplicationDbContext _dbContext;

        public SubjectService(ApplicationDbContext dbContext)
        {
            _dbContext = dbContext;
        }

        public async Task<List<SubjectResponse>> GetSubjectsByCourseIdAsync(int courseId)
        {
            var subjects = await _dbContext.Subjects
                .AsNoTracking()
                .Where(s => s.CourseId == courseId)
                .OrderBy(s => s.SortOrder)
                .Select(s => new SubjectResponse(
                    s.Id,
                    s.CourseId,
                    s.Title,
                    s.Description,
                    s.SortOrder,
                    s.CreatedAt,
                    s.UpdatedAt,
                    s.Lessons.Count
                ))
                .ToListAsync();

            return subjects;
        }

        public async Task<SubjectResponse> GetSubjectByIdAsync(int subjectId)
        {
            var subject = await _dbContext.Subjects
                .AsNoTracking()
                .Include(s => s.Lessons)
                .FirstOrDefaultAsync(s => s.Id == subjectId);

            if (subject == null)
            {
                throw new BusinessException($"Không tìm thấy môn học với mã {subjectId}.");
            }

            return new SubjectResponse(
                subject.Id,
                subject.CourseId,
                subject.Title,
                subject.Description,
                subject.SortOrder,
                subject.CreatedAt,
                subject.UpdatedAt,
                subject.Lessons.Count
            );
        }

        public async Task<SubjectResponse> CreateSubjectAsync(CreateSubjectRequest request)
        {
            if (string.IsNullOrWhiteSpace(request.Title))
            {
                throw new BusinessException("Tiêu đề môn học không được để trống.");
            }

            var courseExists = await _dbContext.Courses.AnyAsync(c => c.Id == request.CourseId);
            if (!courseExists)
            {
                throw new BusinessException($"Khóa học với mã {request.CourseId} không tồn tại.");
            }

            var subject = new Subject
            {
                CourseId = request.CourseId,
                Title = request.Title.Trim(),
                Description = request.Description?.Trim(),
                SortOrder = request.SortOrder,
                CreatedAt = DateTime.UtcNow
            };

            _dbContext.Subjects.Add(subject);
            await _dbContext.SaveChangesAsync();

            return new SubjectResponse(
                subject.Id,
                subject.CourseId,
                subject.Title,
                subject.Description,
                subject.SortOrder,
                subject.CreatedAt,
                subject.UpdatedAt,
                0
            );
        }

        public async Task<SubjectResponse> UpdateSubjectAsync(int subjectId, UpdateSubjectRequest request)
        {
            var subject = await _dbContext.Subjects.FindAsync(subjectId);
            if (subject == null)
            {
                throw new BusinessException($"Không tìm thấy môn học với mã {subjectId} để cập nhật.");
            }

            if (string.IsNullOrWhiteSpace(request.Title))
            {
                throw new BusinessException("Tiêu đề môn học không được để trống.");
            }

            subject.Title = request.Title.Trim();
            subject.Description = request.Description?.Trim();
            subject.SortOrder = request.SortOrder;
            subject.UpdatedAt = DateTime.UtcNow;

            await _dbContext.SaveChangesAsync();

            return new SubjectResponse(
                subject.Id,
                subject.CourseId,
                subject.Title,
                subject.Description,
                subject.SortOrder,
                subject.CreatedAt,
                subject.UpdatedAt
            );
        }

        public async Task<bool> DeleteSubjectAsync(int subjectId)
        {
            var subject = await _dbContext.Subjects.FindAsync(subjectId);
            if (subject == null)
            {
                throw new BusinessException($"Không tìm thấy môn học với mã {subjectId} để xóa.");
            }

            _dbContext.Subjects.Remove(subject);
            await _dbContext.SaveChangesAsync();
            return true;
        }
    }
}
