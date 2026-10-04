using Microlearning.Areas.Catalog.DTOs;
using Microlearning.Areas.Catalog.Interfaces;
using Microlearning.Exceptions;
using Microlearning.Model;
using Microlearning.Model.Entities;
using Microsoft.EntityFrameworkCore;

namespace Microlearning.Areas.Catalog.Services
{
    public class LessonService : ILessonService
    {
        private readonly ApplicationDbContext _dbContext;

        public LessonService(ApplicationDbContext dbContext)
        {
            _dbContext = dbContext;
        }

        public async Task<List<LessonResponse>> GetLessonsBySubjectIdAsync(int subjectId)
        {
            var lessons = await _dbContext.Lessons
                .AsNoTracking()
                .Where(l => l.SubjectId == subjectId && l.IsPublished)
                .OrderBy(l => l.SortOrder)
                .Select(l => new LessonResponse(
                    l.Id,
                    l.SubjectId,
                    l.Title,
                    l.Description,
                    l.DurationSeconds,
                    l.SortOrder,
                    l.Version,
                    l.IsPublished,
                    l.CreatedAt,
                    l.UpdatedAt,
                    l.Quiz != null,
                    l.MediaAssets.Count
                ))
                .ToListAsync();

            return lessons;
        }

        public async Task<LessonResponse> GetLessonByIdAsync(int lessonId)
        {
            var lesson = await _dbContext.Lessons
                .AsNoTracking()
                .Include(l => l.Quiz)
                .Include(l => l.MediaAssets)
                .FirstOrDefaultAsync(l => l.Id == lessonId);

            if (lesson == null)
            {
                throw new BusinessException($"Không tìm thấy bài học với mã {lessonId}.");
            }

            return new LessonResponse(
                lesson.Id,
                lesson.SubjectId,
                lesson.Title,
                lesson.Description,
                lesson.DurationSeconds,
                lesson.SortOrder,
                lesson.Version,
                lesson.IsPublished,
                lesson.CreatedAt,
                lesson.UpdatedAt,
                lesson.Quiz != null,
                lesson.MediaAssets.Count
            );
        }

        /// <summary>
        /// Lấy trọn gói dữ liệu bài học phục vụ tải Offline (Metadata + MediaAssets + Quiz)
        /// Tuyệt đối KHÔNG trả về cột IsCorrect của đáp án Quiz
        /// </summary>
        public async Task<LessonPackageResponse> GetLessonPackageAsync(int lessonId)
        {
            var lesson = await _dbContext.Lessons
                .AsNoTracking()
                .Include(l => l.MediaAssets)
                .Include(l => l.Quiz)
                    .ThenInclude(q => q!.Questions.OrderBy(ques => ques.SortOrder))
                        .ThenInclude(ques => ques.QuizOptions.OrderBy(opt => opt.SortOrder))
                .FirstOrDefaultAsync(l => l.Id == lessonId);

            if (lesson == null)
            {
                throw new BusinessException($"Không tìm thấy bài học với mã {lessonId} để tạo gói ngoại tuyến.");
            }

            var mediaList = lesson.MediaAssets.Select(m => new LessonPackageMediaAssetDTO(
                m.Id,
                m.MediaType,
                m.FileName,
                m.BlobKey,
                m.SizeBytes,
                m.Checksum,
                m.DurationSeconds,
                m.Status
            )).ToList();

            LessonPackageQuizDTO? quizDto = null;
            if (lesson.Quiz != null)
            {
                var questionsDto = lesson.Quiz.Questions.Select(q => new LessonPackageQuestionDTO(
                    q.Id,
                    q.Content,
                    q.Explanation,
                    q.Points,
                    q.SortOrder,
                    q.QuestionType,
                    q.QuizOptions.Select(opt => new LessonPackageOptionDTO(
                        opt.Id,
                        opt.OptionText,
                        opt.SortOrder
                    )).ToList() // Ẩn IsCorrect tuyệt đối
                )).ToList();

                quizDto = new LessonPackageQuizDTO(
                    lesson.Quiz.Id,
                    lesson.Quiz.Title,
                    lesson.Quiz.PassScore,
                    lesson.Quiz.Version,
                    questionsDto
                );
            }

            return new LessonPackageResponse(
                lesson.Id,
                lesson.SubjectId,
                lesson.Title,
                lesson.Description,
                lesson.DurationSeconds,
                lesson.SortOrder,
                lesson.Version,
                mediaList,
                quizDto
            );
        }

        public async Task<LessonResponse> CreateLessonAsync(CreateLessonRequest request)
        {
            if (string.IsNullOrWhiteSpace(request.Title))
            {
                throw new BusinessException("Tiêu đề bài học không được để trống.");
            }

            var subjectExists = await _dbContext.Subjects.AnyAsync(s => s.Id == request.SubjectId);
            if (!subjectExists)
            {
                throw new BusinessException($"Môn học với mã {request.SubjectId} không tồn tại.");
            }

            var lesson = new Lesson
            {
                SubjectId = request.SubjectId,
                Title = request.Title.Trim(),
                Description = request.Description?.Trim(),
                DurationSeconds = request.DurationSeconds,
                SortOrder = request.SortOrder,
                IsPublished = request.IsPublished,
                Version = 1,
                CreatedAt = DateTime.UtcNow
            };

            _dbContext.Lessons.Add(lesson);
            await _dbContext.SaveChangesAsync();

            return new LessonResponse(
                lesson.Id,
                lesson.SubjectId,
                lesson.Title,
                lesson.Description,
                lesson.DurationSeconds,
                lesson.SortOrder,
                lesson.Version,
                lesson.IsPublished,
                lesson.CreatedAt,
                lesson.UpdatedAt,
                false,
                0
            );
        }

        public async Task<LessonResponse> UpdateLessonAsync(int lessonId, UpdateLessonRequest request)
        {
            var lesson = await _dbContext.Lessons.FindAsync(lessonId);
            if (lesson == null)
            {
                throw new BusinessException($"Không tìm thấy bài học với mã {lessonId} để cập nhật.");
            }

            if (string.IsNullOrWhiteSpace(request.Title))
            {
                throw new BusinessException("Tiêu đề bài học không được để trống.");
            }

            lesson.Title = request.Title.Trim();
            lesson.Description = request.Description?.Trim();
            lesson.DurationSeconds = request.DurationSeconds;
            lesson.SortOrder = request.SortOrder;
            lesson.IsPublished = request.IsPublished;
            lesson.Version += 1; // Tăng version hỗ trợ Delta Sync
            lesson.UpdatedAt = DateTime.UtcNow;

            await _dbContext.SaveChangesAsync();

            return new LessonResponse(
                lesson.Id,
                lesson.SubjectId,
                lesson.Title,
                lesson.Description,
                lesson.DurationSeconds,
                lesson.SortOrder,
                lesson.Version,
                lesson.IsPublished,
                lesson.CreatedAt,
                lesson.UpdatedAt
            );
        }

        public async Task<bool> TogglePublishLessonAsync(int lessonId)
        {
            var lesson = await _dbContext.Lessons.FindAsync(lessonId);
            if (lesson == null)
            {
                throw new BusinessException($"Không tìm thấy bài học với mã {lessonId}.");
            }

            lesson.IsPublished = !lesson.IsPublished;
            lesson.UpdatedAt = DateTime.UtcNow;
            await _dbContext.SaveChangesAsync();

            return lesson.IsPublished;
        }

        public async Task<bool> DeleteLessonAsync(int lessonId)
        {
            var lesson = await _dbContext.Lessons.FindAsync(lessonId);
            if (lesson == null)
            {
                throw new BusinessException($"Không tìm thấy bài học với mã {lessonId} để xóa.");
            }

            _dbContext.Lessons.Remove(lesson);
            await _dbContext.SaveChangesAsync();
            return true;
        }
    }
}
