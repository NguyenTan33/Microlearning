import { apiClient } from './apiClient';

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
};
