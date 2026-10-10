import { apiClient } from './apiClient';

export interface VideoCoverageRequest {
  lessonId: number;
  watchedIntervals: Array<{ start: number; end: number }>;
  totalDurationSeconds: number;
}

export interface LessonProgressDto {
  lessonId: number;
  watchedSeconds: number;
  percent: number;
  isCompleted: boolean;
  completedAt?: string;
  lastPlayedAt?: string;
}

export const progressApi = {
  /**
   * Lưu tiến độ xem bài học lên Backend (endpoint chính thức /api/progress/events)
   */
  async saveProgress(
    lessonId: number,
    watchedSeconds: number,
    percent: number
  ): Promise<LessonProgressDto | null> {
    try {
      const res = await apiClient.post<LessonProgressDto>('/api/progress/events', {
        lessonId,
        watchedSeconds: Math.round(watchedSeconds),
        percent: Math.min(100, Math.round(percent * 10) / 10),
      });
      return res.data;
    } catch {
      return null;
    }
  },

  /**
   * Lấy chi tiết tiến độ bài học của người dùng từ Backend
   */
  async getLessonProgress(lessonId: number): Promise<LessonProgressDto | null> {
    try {
      const res = await apiClient.get<LessonProgressDto>(`/api/progress/lesson/${lessonId}`);
      return res.data;
    } catch {
      return null;
    }
  },

  /**
   * Lấy danh sách ID các bài học đã hoàn thành
   */
  async getCompletedLessonIds(courseId?: number): Promise<number[]> {
    try {
      const url = courseId ? `/api/progress/completed?courseId=${courseId}` : '/api/progress/completed';
      const res = await apiClient.get<number[]>(url);
      return Array.isArray(res.data) ? res.data : [];
    } catch {
      return [];
    }
  },

  /**
   * Ghi nhận tiến độ xem kèm thuật toán Interval Union chống tua
   */
  async recordVideoCoverage(data: VideoCoverageRequest): Promise<{ isCompleted: boolean; percent: number }> {
    const res = await apiClient.post<{ isCompleted: boolean; percent: number }>('/api/progress/video-coverage', data);
    return res.data;
  },
};
