using Microlearning.Areas.Auth.Interfaces;
using Microlearning.Areas.Catalog.DTOs;
using Microlearning.Areas.Catalog.Interfaces;
using Microlearning.Exceptions;
using Microlearning.Model;
using Microlearning.Model.Entities;
using Microsoft.EntityFrameworkCore;

namespace Microlearning.Areas.Catalog.Services
{
    public class CourseAccessService : ICourseAccessService
    {
        private readonly ApplicationDbContext _dbContext;
        private readonly IHashService _hashService;
        private readonly IConfiguration _configuration;
        private readonly ILogger<CourseAccessService> _logger;

        private string PasswordSecret => _configuration["CourseAccess:SecretKey"] ?? "Microlearning_Course_Secret_Salt_Key_2026!";

        public CourseAccessService(
            ApplicationDbContext dbContext,
            IHashService hashService,
            IConfiguration configuration,
            ILogger<CourseAccessService> logger)
        {
            _dbContext = dbContext;
            _hashService = hashService;
            _configuration = configuration;
            _logger = logger;
        }

        public async Task<CourseAccessStatusDto> CheckAccessAsync(string? userId, int courseId, CancellationToken cancellationToken = default)
        {
            var course = await _dbContext.Courses
                .AsNoTracking()
                .FirstOrDefaultAsync(c => c.Id == courseId, cancellationToken);

            if (course == null)
            {
                throw new BusinessException($"Không tìm thấy khóa học với mã {courseId}.");
            }

            if (!course.IsPrivate)
            {
                return new CourseAccessStatusDto(course.Id, false, true, course.PasswordVersion);
            }

            if (string.IsNullOrEmpty(userId))
            {
                return new CourseAccessStatusDto(course.Id, true, false, course.PasswordVersion);
            }

            var access = await _dbContext.UserCourseAccesses
                .AsNoTracking()
                .FirstOrDefaultAsync(a => a.AccountId == userId && a.CourseId == courseId, cancellationToken);

            bool hasAccess = access != null && access.UnlockedPasswordVersion == course.PasswordVersion;

            return new CourseAccessStatusDto(course.Id, true, hasAccess, course.PasswordVersion);
        }

        public async Task<bool> UnlockCourseWithPasswordAsync(string userId, int courseId, string password, CancellationToken cancellationToken = default)
        {
            if (string.IsNullOrWhiteSpace(password))
            {
                return false;
            }

            var course = await _dbContext.Courses
                .FirstOrDefaultAsync(c => c.Id == courseId, cancellationToken);

            if (course == null)
            {
                throw new BusinessException($"Không tìm thấy khóa học với mã {courseId}.");
            }

            if (!course.IsPrivate)
            {
                return true;
            }

            if (string.IsNullOrEmpty(course.AccessPasswordHash) ||
                !_hashService.Verify(password.Trim(), course.AccessPasswordHash, PasswordSecret))
            {
                _logger.LogWarning("Người dùng {UserId} nhập sai mật khẩu cho khóa học {CourseId}", userId, courseId);
                return false;
            }

            var existingAccess = await _dbContext.UserCourseAccesses
                .FirstOrDefaultAsync(a => a.AccountId == userId && a.CourseId == courseId, cancellationToken);

            if (existingAccess == null)
            {
                _dbContext.UserCourseAccesses.Add(new UserCourseAccess
                {
                    AccountId = userId,
                    CourseId = courseId,
                    UnlockedPasswordVersion = course.PasswordVersion,
                    UnlockedAt = DateTime.UtcNow
                });
            }
            else
            {
                existingAccess.UnlockedPasswordVersion = course.PasswordVersion;
                existingAccess.UnlockedAt = DateTime.UtcNow;
            }

            await _dbContext.SaveChangesAsync(cancellationToken);
            _logger.LogInformation("Người dùng {UserId} đã mở khóa thành công khóa học {CourseId} (Version {Version})", userId, courseId, course.PasswordVersion);

            return true;
        }

        public async Task<bool> SetCoursePrivacyAsync(int courseId, SetCoursePrivacyRequest request, CancellationToken cancellationToken = default)
        {
            var course = await _dbContext.Courses
                .FirstOrDefaultAsync(c => c.Id == courseId, cancellationToken);

            if (course == null)
            {
                throw new BusinessException($"Không tìm thấy khóa học với mã {courseId}.");
            }

            course.IsPrivate = request.IsPrivate;

            if (request.IsPrivate)
            {
                if (!string.IsNullOrWhiteSpace(request.NewPassword))
                {
                    course.AccessPasswordHash = _hashService.Hash(request.NewPassword.Trim(), PasswordSecret);
                    course.PasswordVersion += 1;
                }
                else if (string.IsNullOrEmpty(course.AccessPasswordHash))
                {
                    throw new BusinessException("Khóa học ở chế độ Riêng tư bắt buộc phải thiết lập mật khẩu truy cập.");
                }
            }
            else
            {
                course.AccessPasswordHash = null;
            }

            course.UpdatedAt = DateTime.UtcNow;
            await _dbContext.SaveChangesAsync(cancellationToken);

            _logger.LogInformation("Đã cập nhật chế độ bảo mật cho khóa học {CourseId}: IsPrivate={IsPrivate}, Version={Version}", courseId, course.IsPrivate, course.PasswordVersion);
            return true;
        }
    }
}
