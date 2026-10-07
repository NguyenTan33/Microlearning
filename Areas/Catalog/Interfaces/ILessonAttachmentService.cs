using Microlearning.Areas.Catalog.DTOs;

namespace Microlearning.Areas.Catalog.Interfaces
{
    public interface IAttachmentStorageProvider
    {
        Task<UploadFileResult> UploadAsync(Stream stream, string fileName, string contentType, CancellationToken cancellationToken = default);
        Task DeleteAsync(string fileUrl, CancellationToken cancellationToken = default);
    }

    public interface ILessonAttachmentService
    {
        Task<LessonAttachmentDto> AddAttachmentAsync(int lessonId, IFormFile file, CancellationToken cancellationToken = default);
        Task<bool> DeleteAttachmentAsync(int attachmentId, CancellationToken cancellationToken = default);
        Task<IReadOnlyList<LessonAttachmentDto>> GetAttachmentsByLessonIdAsync(int lessonId, CancellationToken cancellationToken = default);
        Task<IReadOnlyList<CourseAttachmentDto>> GetAttachmentsByCourseIdAsync(int courseId, CancellationToken cancellationToken = default);
    }
}
