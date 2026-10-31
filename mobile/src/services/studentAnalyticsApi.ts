import { apiClient } from './apiClient';

export interface StudentLessonQuizDetail {
  lessonId: number;
  lessonTitle: string;
  watchedPercent: number;
  isVideoCompleted: boolean;
  totalQuizzes: number;
  completedQuizzes: number;
  quizzes: Array<{
    quizId: number;
    quizTitle: string;
    score: number;
    passScore: number;
    isPassed: boolean;
    submittedAt?: string | null;
  }>;
}

export interface StudentCourseAnalyticsDetail {
  studentId: string;
  fullName: string;
  email?: string | null;
  courseId: number;
  courseTitle: string;
  videoCompletionPercent: number;
  completedLessons: number;
  totalLessons: number;
  quizCompletionPercent: number;
  completedQuizzes: number;
  totalQuizzes: number;
  averageQuizScore: number;
  hasCompletedCourse: boolean;
  lessons: StudentLessonQuizDetail[];
}

export interface StudentProgressDetail {
  accountId: string;
  fullName: string;
  email?: string | null;
  phoneNumber?: string | null;
  completedLessons: number;
  totalLessons: number;
  progressPercent: number;
  lastActiveAt?: string | null;
  hasCompletedCourse: boolean;
  totalQuizzesInCourse?: number;
  completedQuizzes?: number;
  quizCompletionPercent?: number;
  averageQuizScore?: number;
  hasPassedAllQuizzes?: boolean;
}

export const studentAnalyticsApi = {
  async getStudentsProgress(courseId: number): Promise<StudentProgressDetail[]> {
    try {
      const res = await apiClient.get<any>(
        `/api/admin/courses/${courseId}/analytics/students-progress`
      );
      const raw = res.data;
      if (Array.isArray(raw)) {
        return raw;
      }
      if (raw && Array.isArray(raw.items)) {
        return raw.items;
      }
      return [];
    } catch (err) {
      console.warn(`[StudentAnalyticsApi] Error fetching students progress for course ${courseId}:`, err);
      return [];
    }
  },

  async getStudentCourseDetail(courseId: number, studentId: string): Promise<StudentCourseAnalyticsDetail | null> {
    try {
      const res = await apiClient.get<StudentCourseAnalyticsDetail>(
        `/api/admin/courses/${courseId}/analytics/students/${studentId}/detail`
      );
      return res.data;
    } catch (err) {
      console.warn(`[StudentAnalyticsApi] Error fetching student course detail:`, err);
      return null;
    }
  },
};
