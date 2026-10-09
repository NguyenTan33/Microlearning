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

export interface UserStreak {
  currentStreak: number;
  longestStreak: number;
  lastActiveDate: string | null;
  hasMasterCrown: boolean;
  crownAwardedAt: string | null;
  completedLessons: number;
  totalEligibleLessons: number;
  overallProgressPercent: number;
  statusMessage: string;
  isNewStreakToday?: boolean;
}

const LOCAL_STREAK_KEY = 'microlearning_user_streak';

function getLocalStreak(): UserStreak {
  try {
    const stored = localStorage.getItem(LOCAL_STREAK_KEY);
    if (stored) {
      return JSON.parse(stored) as UserStreak;
    }
  } catch {}

  return {
    currentStreak: 0,
    longestStreak: 0,
    lastActiveDate: null,
    hasMasterCrown: false,
    crownAwardedAt: null,
    completedLessons: 0,
    totalEligibleLessons: 0,
    overallProgressPercent: 0,
    statusMessage: 'Hãy hoàn thành một bài học ngay hôm nay để kích hoạt chuỗi học tập!',
    isNewStreakToday: false,
  };
}

function saveLocalStreak(streak: UserStreak): void {
  try {
    localStorage.setItem(LOCAL_STREAK_KEY, JSON.stringify(streak));
  } catch {}
}

export function getTodayString(): string {
  // Chuỗi ngày YYYY-MM-DD theo giờ Việt Nam UTC+7
  const now = new Date();
  const utc7 = new Date(now.getTime() + 7 * 3600 * 1000);
  return utc7.toISOString().split('T')[0];
}

function getYesterdayString(): string {
  const now = new Date();
  const utc7 = new Date(now.getTime() + 7 * 3600 * 1000 - 24 * 3600 * 1000);
  return utc7.toISOString().split('T')[0];
}

export function isSameDayAsToday(dateStr?: string | null): boolean {
  if (!dateStr) return false;
  const todayUtc7 = getTodayString();
  const todayIso = new Date().toISOString().slice(0, 10);
  const clean = dateStr.split('T')[0].trim();
  return clean === todayUtc7 || clean === todayIso;
}

export function hasCelebratedToday(userId?: string): boolean {
  const todayStr = getTodayString();
  const todayIso = new Date().toISOString().slice(0, 10);

  // 1. Kiểm tra khóa bộ nhớ In-Memory (chặn race condition tức thì trong cùng phiên duyệt)
  if (
    typeof window !== 'undefined' &&
    ((window as unknown as { __microlearn_streak_celebrated_date?: string }).__microlearn_streak_celebrated_date === todayStr ||
     (window as unknown as { __microlearn_streak_celebrated_date?: string }).__microlearn_streak_celebrated_date === todayIso)
  ) {
    return true;
  }

  try {
    // 2. Kiểm tra tất cả các khóa lưu trữ cục bộ (tương thích ngược với các phiên bản trước)
    const k1 = localStorage.getItem('microlearn_streak_awarded_date');
    const k2 = localStorage.getItem('microlearning_streak_celebrated_date');
    const uKey = userId ? localStorage.getItem(`microlearn_streak_awarded_date_${userId}`) : null;

    if (isSameDayAsToday(k1) || isSameDayAsToday(k2) || isSameDayAsToday(uKey)) {
      return true;
    }

    // 3. Kiểm tra thông tin điểm danh trong User Streak Cache
    const local = getLocalStreak();
    if (isSameDayAsToday(local.lastActiveDate) && local.currentStreak > 0) {
      return true;
    }
  } catch {}

  return false;
}

export function markCelebratedToday(userId?: string): void {
  const todayStr = getTodayString();
  if (typeof window !== 'undefined') {
    (window as unknown as { __microlearn_streak_celebrated_date?: string }).__microlearn_streak_celebrated_date = todayStr;
  }
  try {
    localStorage.setItem('microlearn_streak_awarded_date', todayStr);
    localStorage.setItem('microlearning_streak_celebrated_date', todayStr);
    if (userId) {
      localStorage.setItem(`microlearn_streak_awarded_date_${userId}`, todayStr);
    }
  } catch {}
}

export const streakApi = {
  /**
   * Lấy chuỗi streak học tập hàng ngày và trạng thái Vương Miện Danh Dự (Master Crown)
   */
  async getMyStreak(): Promise<UserStreak> {
    const token = localStorage.getItem('accessToken');
    if (token) {
      try {
        const res = await fetch('/api/streak/my-streak', {
          headers: getAuthHeaders(),
        });
        if (res.ok) {
          const data = (await res.json()) as UserStreak;
          saveLocalStreak(data);
          if (isSameDayAsToday(data.lastActiveDate)) {
            markCelebratedToday();
          }
          return data;
        }
      } catch {
        // Dự phòng đọc từ local storage nếu tạm thời ngắt kết nối
      }
    }

    const local = getLocalStreak();
    const yesterday = getYesterdayString();

    // Nếu ngày hoạt động trước ngày hôm qua, streak hiển thị về 0 (chuỗi bị đứt)
    let currentStreak = local.currentStreak;
    if (local.lastActiveDate && local.lastActiveDate < yesterday) {
      currentStreak = 0;
    }

    if (isSameDayAsToday(local.lastActiveDate)) {
      markCelebratedToday();
    }

    return {
      ...local,
      currentStreak,
      statusMessage:
        currentStreak > 0
          ? `Tuyệt vời! Bạn đang duy trì chuỗi ${currentStreak} ngày học liên tiếp.`
          : 'Hãy hoàn thành một bài học ngay hôm nay để kích hoạt chuỗi học tập!',
    };
  },

  /**
   * Ghi nhận điểm danh học tập hàng ngày khi hoàn thành 1 bài học của môn học trong khóa học
   */
  async pingDailyActivity(): Promise<UserStreak> {
    const token = localStorage.getItem('accessToken');
    if (token) {
      try {
        const res = await fetch('/api/streak/ping', {
          method: 'POST',
          headers: getAuthHeaders(),
        });
        if (res.ok) {
          const data = (await res.json()) as UserStreak;
          saveLocalStreak(data);
          if (isSameDayAsToday(data.lastActiveDate)) {
            markCelebratedToday();
          }
          if (typeof window !== 'undefined') {
            window.dispatchEvent(new Event('lesson-progress-updated'));
          }
          return data;
        }
      } catch (err) {
        console.warn('Lỗi gọi API /api/streak/ping:', err);
      }
    }

    // Cơ chế fallback local cập nhật streak ngay lập tức (cho khách hoặc khi offline)
    const local = getLocalStreak();
    const today = getTodayString();
    const yesterday = getYesterdayString();

    let newStreak = local.currentStreak;
    let isNewStreakToday = false;

    if (!local.lastActiveDate) {
      newStreak = 1;
      isNewStreakToday = true;
    } else if (local.lastActiveDate === yesterday) {
      newStreak += 1;
      isNewStreakToday = true;
    } else if (local.lastActiveDate < yesterday) {
      newStreak = 1;
      isNewStreakToday = true;
    } else {
      // local.lastActiveDate === today: đã hoàn thành bài hôm nay rồi, không tăng streak mới
      isNewStreakToday = false;
    }

    const updated: UserStreak = {
      ...local,
      currentStreak: newStreak,
      longestStreak: Math.max(local.longestStreak, newStreak),
      lastActiveDate: today,
      completedLessons: local.completedLessons + 1,
      statusMessage: `Tuyệt vời! Bạn đang duy trì chuỗi ${newStreak} ngày học liên tiếp.`,
      isNewStreakToday,
    };
    saveLocalStreak(updated);
    if (isSameDayAsToday(today)) {
      markCelebratedToday();
    }

    if (typeof window !== 'undefined') {
      window.dispatchEvent(new Event('lesson-progress-updated'));
    }

    return updated;
  },

  getTodayString(): string {
    return getTodayString();
  },

  isSameDayAsToday(dateStr?: string | null): boolean {
    return isSameDayAsToday(dateStr);
  },

  hasCelebratedToday(userId?: string): boolean {
    return hasCelebratedToday(userId);
  },

  markCelebratedToday(userId?: string): void {
    markCelebratedToday(userId);
  },
};
