function getAuthHeaders(): HeadersInit {
  const token = localStorage.getItem('accessToken');
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  return headers;
}

async function handleResponse<T>(res: Response): Promise<T> {
  if (!res.ok) {
    const errorData = await res.json().catch(() => null);
    const message = errorData?.message || `Yêu cầu thất bại với mã trạng thái ${res.status}.`;
    throw new Error(message);
  }
  return res.json() as Promise<T>;
}

export interface CourseOverviewMetrics {
  courseId: number;
  courseTitle: string;
  totalStudentsEnrolled: number;
  totalLessons: number;
  averageProgressPercent: number;
  completedStudentsCount: number;
  totalQuizzesInCourse: number;
  averageCourseQuizScore: number;
  studentsCompletedAllQuizzesCount: number;
}

export interface StudentProgressDetail {
  accountId: string;
  fullName: string;
  email?: string | null;
  phoneNumber?: string | null;
  completedLessons: number;
  totalLessons: number;
  progressPercent: number;
  totalQuizzesInCourse: number;
  completedQuizzes: number;
  quizCompletionPercent: number;
  averageQuizScore: number;
  hasPassedAllQuizzes: boolean;
  lastActiveAt?: string | null;
  hasCompletedCourse: boolean;
}

export interface StudentQuizPerformance {
  quizId: number;
  quizTitle: string;
  passScore: number;
  bestScore: number;
  isPassed: boolean;
  attemptsCount: number;
  lastAttemptAt?: string | null;
}

export interface StudentLessonQuizDetail {
  lessonId: number;
  lessonTitle: string;
  subjectTitle: string;
  durationSeconds: number;
  watchedSeconds: number;
  videoPercent: number;
  isVideoCompleted: boolean;
  quizzes: StudentQuizPerformance[];
}

export interface PagedResult<T> {
  items: T[];
  totalCount: number;
  pageNumber: number;
  pageSize: number;
  totalPages: number;
}

export interface StudentProgressFilter {
  searchTerm?: string;
  pageNumber?: number;
  pageSize?: number;
  onlyCompleted?: boolean;
  onlyCompletedQuizzes?: boolean;
}

export const studentAnalyticsApi = {
  /**
   * Lấy số liệu thống kê tổng quan của khóa học (video + bài tập)
   */
  async getCourseOverview(courseId: number): Promise<CourseOverviewMetrics> {
    const res = await fetch(`/api/admin/courses/${courseId}/analytics/overview`, {
      headers: getAuthHeaders(),
    });
    return await handleResponse<CourseOverviewMetrics>(res);
  },

  /**
   * Lấy danh sách học viên và % tiến độ hoàn thành video + bài tập trong khóa học
   */
  async getStudentsProgress(courseId: number, filter?: StudentProgressFilter): Promise<PagedResult<StudentProgressDetail>> {
    const params = new URLSearchParams();
    if (filter?.searchTerm) params.append('searchTerm', filter.searchTerm);
    if (filter?.pageNumber) params.append('pageNumber', filter.pageNumber.toString());
    if (filter?.pageSize) params.append('pageSize', filter.pageSize.toString());
    if (filter?.onlyCompleted !== undefined) params.append('onlyCompleted', filter.onlyCompleted.toString());
    if (filter?.onlyCompletedQuizzes !== undefined) params.append('onlyCompletedQuizzes', filter.onlyCompletedQuizzes.toString());

    const queryString = params.toString();
    const url = `/api/admin/courses/${courseId}/analytics/students-progress${queryString ? `?${queryString}` : ''}`;

    const res = await fetch(url, {
      headers: getAuthHeaders(),
    });
    return await handleResponse<PagedResult<StudentProgressDetail>>(res);
  },

  /**
   * Lấy chi tiết từng bài học (video % + điểm các bài quiz) của một sinh viên cụ thể trong khóa học
   */
  async getStudentCourseDetail(courseId: number, studentId: string): Promise<StudentLessonQuizDetail[]> {
    const res = await fetch(`/api/admin/courses/${courseId}/analytics/students/${studentId}/detail`, {
      headers: getAuthHeaders(),
    });
    return await handleResponse<StudentLessonQuizDetail[]>(res);
  },
};
