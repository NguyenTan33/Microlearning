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
      const res = await apiClient.get<StudentProgressDetail[]>(
        `/api/admin/courses/${courseId}/analytics/students-progress`
      );
      return res.data;
    } catch {
      // Mock data when offline or server unreachable
      return [
        {
          accountId: 'st-1',
          fullName: 'Nguyễn Văn Học',
          phoneNumber: '0912345678',
          completedLessons: 8,
          totalLessons: 10,
          progressPercent: 80,
          hasCompletedCourse: false,
        },
        {
          accountId: 'st-2',
          fullName: 'Trần Thị Giỏi',
          phoneNumber: '0988776655',
          completedLessons: 10,
          totalLessons: 10,
          progressPercent: 100,
          hasCompletedCourse: true,
        },
      ];
    }
  },
};
