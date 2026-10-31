using Microlearning.Areas.Admin.DTOs;
using Microlearning.Areas.Admin.Interfaces;
using Microlearning.Exceptions;
using Microlearning.Model;
using Microsoft.EntityFrameworkCore;

namespace Microlearning.Areas.Admin.Services
{
    public class StudentProgressAnalyticsService : IStudentProgressAnalyticsService
    {
        private readonly ApplicationDbContext _dbContext;

        public StudentProgressAnalyticsService(ApplicationDbContext dbContext)
        {
            _dbContext = dbContext;
        }

        public async Task<CourseOverviewMetricsDto> GetCourseMetricsOverviewAsync(int courseId, CancellationToken cancellationToken = default)
        {
            var course = await _dbContext.Courses
                .AsNoTracking()
                .FirstOrDefaultAsync(c => c.Id == courseId, cancellationToken);

            if (course == null)
            {
                throw new BusinessException($"Không tìm thấy khóa học với mã {courseId}.");
            }

            var totalLessons = await _dbContext.Lessons
                .AsNoTracking()
                .CountAsync(l => l.Subject.CourseId == courseId && l.IsPublished, cancellationToken);

            var totalQuizzesInCourse = await _dbContext.Quizzes
                .AsNoTracking()
                .CountAsync(q => q.Lesson.Subject.CourseId == courseId && q.Lesson.IsPublished, cancellationToken);

            var enrolledStudentIds = await _dbContext.Enrollments
                .AsNoTracking()
                .Where(e => e.CourseId == courseId)
                .Select(e => e.AccountId)
                .ToListAsync(cancellationToken);

            var activeStudentIdsWithProgress = await _dbContext.LessonProgresses
                .AsNoTracking()
                .Where(p => p.Lesson.Subject.CourseId == courseId)
                .Select(p => p.AccountId)
                .ToListAsync(cancellationToken);

            var allStudentIds = enrolledStudentIds
                .Union(activeStudentIdsWithProgress)
                .Distinct()
                .ToList();

            if (allStudentIds.Count == 0 || totalLessons == 0)
            {
                return new CourseOverviewMetricsDto(
                    courseId,
                    course.Title,
                    allStudentIds.Count,
                    totalLessons,
                    0,
                    0,
                    totalQuizzesInCourse,
                    0.0,
                    0
                );
            }

            var completedCounts = await _dbContext.LessonProgresses
                .AsNoTracking()
                .Where(p => allStudentIds.Contains(p.AccountId) &&
                            p.Lesson.Subject.CourseId == courseId &&
                            p.IsCompleted &&
                            (p.Percent >= 80 || p.WatchedCoveragePercent == 0 || p.WatchedCoveragePercent >= 80) &&
                            p.Lesson.IsPublished)
                .GroupBy(p => p.AccountId)
                .Select(g => new { AccountId = g.Key, Count = g.Count() })
                .ToDictionaryAsync(x => x.AccountId, x => x.Count, cancellationToken);

            int completedStudentsCount = completedCounts.Values.Count(c => c >= totalLessons);
            long totalCompletedLessonsSum = completedCounts.Values.Sum();
            double avgProgress = Math.Round((double)totalCompletedLessonsSum / (allStudentIds.Count * totalLessons) * 100.0, 1);

            // Thống kê bài tập Quiz
            var quizAttemptsQuery = _dbContext.QuizAttempts
                .AsNoTracking()
                .Where(a => allStudentIds.Contains(a.AccountId) && a.Quiz.Lesson.Subject.CourseId == courseId);

            var quizAttempts = await quizAttemptsQuery.ToListAsync(cancellationToken);
            double avgCourseQuizScore = quizAttempts.Any()
                ? Math.Round((double)quizAttempts.Average(a => a.Score), 1)
                : 0.0;

            int studentsCompletedAllQuizzes = 0;
            if (totalQuizzesInCourse > 0)
            {
                var studentPassedQuizzesCount = quizAttempts
                    .Where(a => a.IsPassed)
                    .GroupBy(a => a.AccountId)
                    .Select(g => new { AccountId = g.Key, PassedCount = g.Select(x => x.QuizId).Distinct().Count() })
                    .ToList();

                studentsCompletedAllQuizzes = studentPassedQuizzesCount.Count(x => x.PassedCount >= totalQuizzesInCourse);
            }

            return new CourseOverviewMetricsDto(
                courseId,
                course.Title,
                allStudentIds.Count,
                totalLessons,
                avgProgress,
                completedStudentsCount,
                totalQuizzesInCourse,
                avgCourseQuizScore,
                studentsCompletedAllQuizzes
            );
        }

        public async Task<PagedResult<StudentProgressDetailDto>> GetCourseStudentsProgressAsync(
            int courseId,
            StudentProgressFilterDto filter,
            CancellationToken cancellationToken = default)
        {
            var course = await _dbContext.Courses
                .AsNoTracking()
                .FirstOrDefaultAsync(c => c.Id == courseId, cancellationToken);

            if (course == null)
            {
                throw new BusinessException($"Không tìm thấy khóa học với mã {courseId}.");
            }

            var totalLessons = await _dbContext.Lessons
                .AsNoTracking()
                .CountAsync(l => l.Subject.CourseId == courseId && l.IsPublished, cancellationToken);

            var totalQuizzesInCourse = await _dbContext.Quizzes
                .AsNoTracking()
                .CountAsync(q => q.Lesson.Subject.CourseId == courseId && q.Lesson.IsPublished, cancellationToken);

            var enrolledStudentIds = await _dbContext.Enrollments
                .AsNoTracking()
                .Where(e => e.CourseId == courseId)
                .Select(e => e.AccountId)
                .ToListAsync(cancellationToken);

            var progressStudentIds = await _dbContext.LessonProgresses
                .AsNoTracking()
                .Where(p => p.Lesson.Subject.CourseId == courseId)
                .Select(p => p.AccountId)
                .ToListAsync(cancellationToken);

            var allStudentIds = enrolledStudentIds
                .Union(progressStudentIds)
                .Distinct()
                .ToList();

            if (allStudentIds.Count == 0)
            {
                return new PagedResult<StudentProgressDetailDto>(new List<StudentProgressDetailDto>(), 0, filter.PageNumber, filter.PageSize, 0);
            }

            var usersQuery = _dbContext.Users
                .AsNoTracking()
                .Where(u => allStudentIds.Contains(u.Id));

            if (!string.IsNullOrWhiteSpace(filter.SearchTerm))
            {
                var term = filter.SearchTerm.Trim().ToLower();
                usersQuery = usersQuery.Where(u =>
                    (u.FullName != null && u.FullName.ToLower().Contains(term)) ||
                    (u.Email != null && u.Email.ToLower().Contains(term)) ||
                    (u.PhoneNumber != null && u.PhoneNumber.Contains(term)));
            }

            var matchedUsers = await usersQuery.ToListAsync(cancellationToken);
            var matchedUserIds = matchedUsers.Select(u => u.Id).ToList();

            // 1. Thống kê bài học xem video
            var progressStats = await _dbContext.LessonProgresses
                .AsNoTracking()
                .Where(p => matchedUserIds.Contains(p.AccountId) && p.Lesson.Subject.CourseId == courseId && p.Lesson.IsPublished)
                .GroupBy(p => p.AccountId)
                .Select(g => new
                {
                    AccountId = g.Key,
                    CompletedCount = g.Count(x => x.IsCompleted && (x.Percent >= 80 || x.WatchedCoveragePercent == 0 || x.WatchedCoveragePercent >= 80)),
                    LastActiveAt = g.Max(x => x.LastPlayedAt)
                })
                .ToDictionaryAsync(x => x.AccountId, cancellationToken);

            // 2. Thống kê bài tập Quiz
            var quizAttempts = await _dbContext.QuizAttempts
                .AsNoTracking()
                .Where(a => matchedUserIds.Contains(a.AccountId) && a.Quiz.Lesson.Subject.CourseId == courseId)
                .ToListAsync(cancellationToken);

            var studentQuizStats = quizAttempts
                .GroupBy(a => a.AccountId)
                .ToDictionary(
                    g => g.Key,
                    g => new
                    {
                        CompletedQuizzes = g.Where(x => x.IsPassed).Select(x => x.QuizId).Distinct().Count(),
                        AvgScore = g.Any() ? Math.Round((double)g.Average(x => x.Score), 1) : 0.0,
                        LastAttemptAt = g.Max(x => (DateTime?)x.SubmittedAt)
                    }
                );

            var detailList = matchedUsers.Select(u =>
            {
                progressStats.TryGetValue(u.Id, out var stat);
                int completed = stat?.CompletedCount ?? 0;
                double percent = totalLessons > 0 ? Math.Round((double)completed / totalLessons * 100.0, 1) : 0;
                bool isCompleted = totalLessons > 0 && completed >= totalLessons;

                studentQuizStats.TryGetValue(u.Id, out var qStat);
                int completedQuizzes = qStat?.CompletedQuizzes ?? 0;
                double quizPercent = totalQuizzesInCourse > 0
                    ? Math.Round((double)completedQuizzes / totalQuizzesInCourse * 100.0, 1)
                    : 100.0;
                double avgQuizScore = qStat?.AvgScore ?? 0.0;
                bool hasPassedAllQuizzes = totalQuizzesInCourse == 0 || completedQuizzes >= totalQuizzesInCourse;

                var lastActive = stat?.LastActiveAt;
                if (qStat?.LastAttemptAt != null && (lastActive == null || qStat.LastAttemptAt > lastActive))
                {
                    lastActive = qStat.LastAttemptAt;
                }

                return new StudentProgressDetailDto(
                    u.Id,
                    u.FullName ?? "Chưa cập nhật",
                    u.Email,
                    u.PhoneNumber,
                    completed,
                    totalLessons,
                    percent,
                    totalQuizzesInCourse,
                    completedQuizzes,
                    quizPercent,
                    avgQuizScore,
                    hasPassedAllQuizzes,
                    lastActive,
                    isCompleted
                );
            }).ToList();

            if (filter.OnlyCompleted.HasValue)
            {
                detailList = detailList.Where(d => d.HasCompletedCourse == filter.OnlyCompleted.Value).ToList();
            }

            if (filter.OnlyCompletedQuizzes.HasValue)
            {
                detailList = detailList.Where(d => d.HasPassedAllQuizzes == filter.OnlyCompletedQuizzes.Value).ToList();
            }

            int totalCount = detailList.Count;
            int pageSize = Math.Max(1, filter.PageSize);
            int pageNumber = Math.Max(1, filter.PageNumber);
            int totalPages = (int)Math.Ceiling((double)totalCount / pageSize);

            var pagedItems = detailList
                .OrderByDescending(d => d.ProgressPercent)
                .ThenByDescending(d => d.QuizCompletionPercent)
                .ThenBy(d => d.FullName)
                .Skip((pageNumber - 1) * pageSize)
                .Take(pageSize)
                .ToList();

            return new PagedResult<StudentProgressDetailDto>(
                pagedItems,
                totalCount,
                pageNumber,
                pageSize,
                totalPages
            );
        }

        public async Task<List<StudentLessonQuizDetailDto>> GetStudentCourseDetailAsync(
            int courseId,
            string studentId,
            CancellationToken cancellationToken = default)
        {
            var lessons = await _dbContext.Lessons
                .AsNoTracking()
                .Include(l => l.Subject)
                .Include(l => l.Quizzes)
                .Where(l => l.Subject.CourseId == courseId && l.IsPublished)
                .OrderBy(l => l.Subject.Id)
                .ThenBy(l => l.SortOrder)
                .ToListAsync(cancellationToken);

            var lessonIds = lessons.Select(l => l.Id).ToList();

            var progresses = await _dbContext.LessonProgresses
                .AsNoTracking()
                .Where(p => p.AccountId == studentId && lessonIds.Contains(p.LessonId))
                .ToDictionaryAsync(p => p.LessonId, cancellationToken);

            var allQuizIds = lessons.SelectMany(l => l.Quizzes).Select(q => q.Id).ToList();

            var quizAttempts = await _dbContext.QuizAttempts
                .AsNoTracking()
                .Where(a => a.AccountId == studentId && allQuizIds.Contains(a.QuizId))
                .ToListAsync(cancellationToken);

            var result = new List<StudentLessonQuizDetailDto>();

            foreach (var lesson in lessons)
            {
                progresses.TryGetValue(lesson.Id, out var progress);
                double videoPercent = progress != null ? (double)progress.Percent : 0.0;
                int watchedSeconds = progress != null ? progress.WatchedSeconds : 0;
                bool isCompleted = progress != null && progress.IsCompleted;

                var quizDtos = new List<StudentQuizPerformanceDto>();
                foreach (var quiz in lesson.Quizzes)
                {
                    var attempts = quizAttempts.Where(a => a.QuizId == quiz.Id).ToList();
                    double bestScore = attempts.Any() ? (double)attempts.Max(a => a.Score) : 0.0;
                    bool isPassed = attempts.Any(a => a.IsPassed);
                    int attemptsCount = attempts.Count;
                    DateTime? lastAttempt = attempts.OrderByDescending(a => a.SubmittedAt).FirstOrDefault()?.SubmittedAt;

                    quizDtos.Add(new StudentQuizPerformanceDto(
                        quiz.Id,
                        quiz.Title,
                        quiz.PassScore,
                        bestScore,
                        isPassed,
                        attemptsCount,
                        lastAttempt
                    ));
                }

                result.Add(new StudentLessonQuizDetailDto(
                    lesson.Id,
                    lesson.Title,
                    lesson.Subject?.Title ?? "Chưa phân môn",
                    lesson.DurationSeconds,
                    watchedSeconds,
                    videoPercent,
                    isCompleted,
                    quizDtos
                ));
            }

            return result;
        }
    }
}
