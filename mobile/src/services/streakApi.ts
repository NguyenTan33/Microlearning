import { apiClient } from './apiClient';
import { secureStorage } from '../utils/secureStorage';

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

const STREAK_CACHE_KEY = 'microlearning_cached_user_streak';
type StreakListener = (streak: StreakInfo) => void;
const streakListeners = new Set<StreakListener>();

export const streakApi = {
  subscribe(fn: StreakListener): () => void {
    streakListeners.add(fn);
    return () => {
      streakListeners.delete(fn);
    };
  },

  notifyListeners(data: StreakInfo): void {
    streakListeners.forEach((fn) => {
      try {
        fn(data);
      } catch {
        // ignore
      }
    });
  },

  /**
   * Lấy chuỗi streak thật từ Azure CSDL (kèm SQLite / SecureStorage fallback)
   */
  async getMyStreak(): Promise<StreakInfo> {
    try {
      const res = await apiClient.get<StreakInfo>('/api/streak/my-streak');
      if (res.data) {
        await secureStorage.setItem(STREAK_CACHE_KEY, JSON.stringify(res.data));
        this.notifyListeners(res.data);
        return res.data;
      }
    } catch {
      // Offline fallback
    }

    try {
      const cached = await secureStorage.getItem(STREAK_CACHE_KEY);
      if (cached) {
        return JSON.parse(cached) as StreakInfo;
      }
    } catch {
      // ignore
    }

    return {
      currentStreak: 1,
      longestStreak: 1,
      hasMasterCrown: false,
      completedLessons: 1,
      totalLessons: 10,
      progressPercent: 10,
      message: 'Hãy hoàn thành bài học mỗi ngày để duy trì ngọn lửa học tập!',
    };
  },

  /**
   * Điểm danh học tập để tăng chuỗi streak trên toàn hệ thống
   */
  async pingStreak(): Promise<StreakInfo> {
    try {
      const res = await apiClient.post<StreakInfo>('/api/streak/ping');
      if (res.data) {
        await secureStorage.setItem(STREAK_CACHE_KEY, JSON.stringify(res.data));
        this.notifyListeners(res.data);
        return res.data;
      }
    } catch {
      // Offline update
    }

    const current = await this.getMyStreak();
    const updated: StreakInfo = {
      ...current,
      currentStreak: current.currentStreak + 1,
      longestStreak: Math.max(current.longestStreak, current.currentStreak + 1),
      isNewStreakToday: true,
    };
    await secureStorage.setItem(STREAK_CACHE_KEY, JSON.stringify(updated));
    this.notifyListeners(updated);
    return updated;
  },
};
