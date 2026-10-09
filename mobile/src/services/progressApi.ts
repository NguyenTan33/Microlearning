import { apiClient } from './apiClient';

export interface VideoCoverageRequest {
  lessonId: number;
  watchedIntervals: Array<{ start: number; end: number }>;
  totalDurationSeconds: number;
}

export const progressApi = {
  async recordVideoCoverage(data: VideoCoverageRequest): Promise<{ isCompleted: boolean; percent: number }> {
    const res = await apiClient.post<{ isCompleted: boolean; percent: number }>('/api/progress/video-coverage', data);
    return res.data;
  },

  async getCompletedLessonIds(): Promise<number[]> {
    const res = await apiClient.get<number[]>('/api/progress/completed');
    return res.data;
  },
};
