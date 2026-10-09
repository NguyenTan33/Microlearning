import { apiClient } from './apiClient';

export interface StreakInfo {
  currentStreak: number;
  longestStreak: number;
  lastActiveDate?: string | null;
  hasMasterCrown: boolean;
  crownAwardedAt?: string | null;
  completedLessons: number;
  totalLessons: number;
  progressPercent: number;
  message?: string;
  isNewStreakToday?: boolean;
}

export const streakApi = {
  /**
   * Lấy chuỗi streak thật từ Azure CSDL
   */
  async getMyStreak(): Promise<StreakInfo> {
    const res = await apiClient.get<StreakInfo>('/api/streak/my-streak');
    return res.data;
  },

  /**
   * Điểm danh học tập để tăng chuỗi streak
   */
  async pingStreak(): Promise<StreakInfo> {
    const res = await apiClient.post<StreakInfo>('/api/streak/ping');
    return res.data;
  },
};
