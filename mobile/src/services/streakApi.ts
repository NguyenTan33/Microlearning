import { apiClient } from './apiClient';

export interface StreakInfo {
  streakCount: number;
  isCrownActive: boolean;
  userXp: number;
  lastPingDate?: string;
}

export const streakApi = {
  async getMyStreak(): Promise<StreakInfo> {
    const res = await apiClient.get<StreakInfo>('/api/streak/my-streak');
    return res.data;
  },

  async pingStreak(): Promise<StreakInfo> {
    const res = await apiClient.post<StreakInfo>('/api/streak/ping');
    return res.data;
  },
};
