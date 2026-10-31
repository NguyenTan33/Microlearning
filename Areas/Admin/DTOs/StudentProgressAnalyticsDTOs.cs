namespace Microlearning.Areas.Admin.DTOs
{
    public record StudentProgressDetailDto(
        string AccountId,
        string FullName,
        string? Email,
        string? PhoneNumber,
        int CompletedLessons,
        int TotalLessons,
        double ProgressPercent,
        int TotalQuizzesInCourse,
        int CompletedQuizzes,
        double QuizCompletionPercent,
        double AverageQuizScore,
        bool HasPassedAllQuizzes,
        DateTime? LastActiveAt,
        bool HasCompletedCourse
    );

    public record StudentLessonQuizDetailDto(
        int LessonId,
        string LessonTitle,
        string SubjectTitle,
        int DurationSeconds,
        int WatchedSeconds,
        double VideoPercent,
        bool IsVideoCompleted,
        List<StudentQuizPerformanceDto> Quizzes
    );

    public record StudentQuizPerformanceDto(
        int QuizId,
        string QuizTitle,
        int PassScore,
        double BestScore,
        bool IsPassed,
        int AttemptsCount,
        DateTime? LastAttemptAt
    );

    public record CourseOverviewMetricsDto(
        int CourseId,
        string CourseTitle,
        int TotalStudentsEnrolled,
        int TotalLessons,
        double AverageProgressPercent,
        int CompletedStudentsCount,
        int TotalQuizzesInCourse = 0,
        double AverageCourseQuizScore = 0.0,
        int StudentsCompletedAllQuizzesCount = 0
    );

    public class StudentProgressFilterDto
    {
        public string? SearchTerm { get; set; }
        public int PageNumber { get; set; } = 1;
        public int PageSize { get; set; } = 20;
        public bool? OnlyCompleted { get; set; }
        public bool? OnlyCompletedQuizzes { get; set; }
    }

    public record PagedResult<T>(
        List<T> Items,
        int TotalCount,
        int PageNumber,
        int PageSize,
        int TotalPages
    );
}
