using Microlearning.Areas.Catalog.DTOs;
using Microlearning.Areas.Catalog.Interfaces;
using Microlearning.Exceptions;
using Microlearning.Model;
using Microlearning.Model.Entities;
using Microsoft.EntityFrameworkCore;

namespace Microlearning.Areas.Catalog.Services
{
    public class FavoriteSubjectService : IFavoriteSubjectService
    {
        private readonly ApplicationDbContext _dbContext;
        private readonly ILogger<FavoriteSubjectService> _logger;

        public FavoriteSubjectService(
            ApplicationDbContext dbContext,
            ILogger<FavoriteSubjectService> logger)
        {
            _dbContext = dbContext;
            _logger = logger;
        }

        public async Task<ToggleFavoriteResponse> ToggleFavoriteAsync(string userId, int subjectId, CancellationToken cancellationToken = default)
        {
            var subject = await _dbContext.Subjects
                .AsNoTracking()
                .FirstOrDefaultAsync(s => s.Id == subjectId, cancellationToken);

            if (subject == null)
            {
                throw new BusinessException($"Không tìm thấy môn học với mã {subjectId}.");
            }

            var existing = await _dbContext.UserFavoriteSubjects
                .FirstOrDefaultAsync(f => f.AccountId == userId && f.SubjectId == subjectId, cancellationToken);

            bool isFavorite;
            if (existing != null)
            {
                _dbContext.UserFavoriteSubjects.Remove(existing);
                isFavorite = false;
            }
            else
            {
                _dbContext.UserFavoriteSubjects.Add(new UserFavoriteSubject
                {
                    AccountId = userId,
                    SubjectId = subjectId,
                    CreatedAt = DateTime.UtcNow
                });
                isFavorite = true;
            }

            await _dbContext.SaveChangesAsync(cancellationToken);

            _logger.LogInformation("Người dùng {UserId} đã {Action} môn học {SubjectId}", userId, isFavorite ? "thả tim yêu thích" : "bỏ yêu thích", subjectId);

            return new ToggleFavoriteResponse(
                subjectId,
                isFavorite,
                isFavorite ? "Đã thêm vào danh sách môn học yêu thích." : "Đã xóa khỏi danh sách môn học yêu thích."
            );
        }

        public async Task<IReadOnlyList<FavoriteSubjectDto>> GetMyFavoritesAsync(string userId, CancellationToken cancellationToken = default)
        {
            var favorites = await _dbContext.UserFavoriteSubjects
                .AsNoTracking()
                .Where(f => f.AccountId == userId)
                .OrderByDescending(f => f.CreatedAt)
                .Select(f => new FavoriteSubjectDto(
                    f.SubjectId,
                    f.Subject.Title,
                    f.Subject.Description,
                    f.Subject.CourseId,
                    f.Subject.Course.Title,
                    f.Subject.Lessons.Count(l => l.IsPublished),
                    f.CreatedAt
                ))
                .ToListAsync(cancellationToken);

            return favorites;
        }

        public async Task<IReadOnlyList<int>> GetMyFavoriteSubjectIdsAsync(string userId, CancellationToken cancellationToken = default)
        {
            return await _dbContext.UserFavoriteSubjects
                .AsNoTracking()
                .Where(f => f.AccountId == userId)
                .Select(f => f.SubjectId)
                .ToListAsync(cancellationToken);
        }
    }
}
