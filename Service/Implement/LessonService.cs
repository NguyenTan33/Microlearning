using Microlearning.DTOs;
using Microlearning.Model;
using Microlearning.Model.Entities;
using Microsoft.EntityFrameworkCore;

namespace Microlearning.Service.Implement
{
    public class LessonService
    {
        public readonly ApplicationDbContext dbContext;
        public LessonService(ApplicationDbContext dbContext)
        {
            this.dbContext = dbContext;
        }
        public async Task CreateLesson(CreateLessonDTO dto)
        {
            var lesson = new Lesson
            {
                SubjectId = dto.SubjectId,
                Title = dto.Title,
                SortOrder = dto.SortOrder,
                IsPublished = dto.IsPublished,
                CreatedAt = DateTime.UtcNow,
                Description = dto.Description,
                DurationSeconds = dto.DurationSeconds,
            };
            dbContext.Lessons.Add(lesson);
            await dbContext.SaveChangesAsync();
        }
        public async Task<List<Lesson>> GetLessonsBySubjectId(int subjectId)
        {
            List<Lesson> lessons = await dbContext.Lessons
                .Where(l => l.SubjectId == subjectId)
                .OrderBy(l => l.SortOrder)
                .ToListAsync();
            return lessons;
        }
        public async Task<Lesson> GetLessonById(int lessonId)
        {
            var lesson = await dbContext.Lessons.FindAsync(lessonId);
            if (lesson == null)
            {
                throw new Exception("Lesson not found");
            }
            return lesson;
        }
        public async Task UpdateLesson(int lessonId, UpdateLessonDTO dto)
        {
            var lesson = await dbContext.Lessons.FindAsync(lessonId);
            if (lesson == null)
            {
                throw new Exception("Lesson not found");
            }
            lesson.Title = dto.Title;
            lesson.SortOrder = dto.SortOrder;
            lesson.IsPublished = dto.IsPublished;
            lesson.UpdatedAt = DateTime.UtcNow;
            lesson.Version += 1;
            lesson.Description = dto.Description;
            lesson.DurationSeconds = dto.DurationSeconds;
            await dbContext.SaveChangesAsync();
        }
        public async Task TogglePublishLesson(int lessonId)
        {
            var lesson = await dbContext.Lessons.FindAsync(lessonId);
            if (lesson == null)
            {
                throw new Exception("Lesson not found");
            }
            lesson.IsPublished = !lesson.IsPublished;
            lesson.UpdatedAt = DateTime.UtcNow;
            await dbContext.SaveChangesAsync();
        }
        public async Task DeleteLesson(int lessonId)
        {
            var lesson = await dbContext.Lessons.FindAsync(lessonId);
            if (lesson == null)
            {
                throw new Exception("Lesson not found");
            }
            dbContext.Lessons.Remove(lesson);
            await dbContext.SaveChangesAsync();
        }
    }
//    CreateLesson(CreateLessonDTO dto) : Thêm bài học mới.
//GetLessonsBySubjectId(int subjectId): Lấy danh sách bài học theo Môn(sắp xếp theo SortOrder).
//GetLessonById(int lessonId) : Xem chi tiết 1 bài học.
//UpdateLesson(int lessonId, UpdateLessonDTO dto): Sửa thông tin bài học(nhớ lesson.Version += 1).
//TogglePublishLesson(int lessonId) : Ẩn / Hiện bài học.
//DeleteLesson(int lessonId): Xóa bài học.
}
