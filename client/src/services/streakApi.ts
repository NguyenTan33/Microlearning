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
}

export const streakApi = {
  /**
   * Lấy chuỗi streak học tập hàng ngày và trạng thái Vương Miện Danh Dự (Master Crown)
   */
  async getMyStreak(): Promise<UserStreak> {
    try {
      const res = await fetch('/api/streak/my-streak', {
        headers: getAuthHeaders(),
      });
      return await handleResponse<UserStreak>(res);
    } catch {
      // Fallback trạng thái mặc định nếu offline hoặc chưa đăng nhập
      return {
        currentStreak: 0,
        longestStreak: 0,
        lastActiveDate: null,
        hasMasterCrown: false,
        crownAwardedAt: null,
        completedLessons: 0,
        totalEligibleLessons: 0,
        overallProgressPercent: 0,
        statusMessage: 'Hãy hoàn thành bài học hôm nay để bắt đầu chuỗi streak!',
      };
    }
  },

  /**
   * Ghi nhận điểm danh học tập hàng ngày
   */
  async pingDailyActivity(): Promise<UserStreak> {
    const res = await fetch('/api/streak/ping', {
      method: 'POST',
      headers: getAuthHeaders(),
    });
    return await handleResponse<UserStreak>(res);
  },
};
