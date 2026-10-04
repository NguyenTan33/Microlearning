import type { LessonProgress, CourseProgress } from '../types/catalog.types';

function getAuthHeaders(): HeadersInit {
  const token = localStorage.getItem('accessToken');
  const headers: HeadersInit = {
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

export const progressApi = {
  /**
   * Ghi nhận sự kiện xem video lên máy chủ (Áp dụng thuật toán Monotonic Math.Max chống tụt tiến độ)
   */
  async saveProgress(lessonId: number, watchedSeconds: number, percent: number): Promise<LessonProgress> {
    const res = await fetch('/api/progress/events', {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({
        lessonId,
        watchedSeconds: Math.round(watchedSeconds),
        percent: Math.min(100, Math.round(percent * 100) / 100),
      }),
    });
    return handleResponse<LessonProgress>(res);
  },

  /**
   * Lấy chi tiết tiến độ xem của một bài học
   */
  async getLessonProgress(lessonId: number): Promise<LessonProgress | null> {
    const res = await fetch(`/api/progress/lesson/${lessonId}`, {
      headers: getAuthHeaders(),
    });
    if (res.status === 404) return null;
    return handleResponse<LessonProgress>(res);
  },

  /**
   * Tính tổng tiến độ hoàn thành của toàn bộ khóa học
   */
  async getCourseProgress(courseId: number): Promise<CourseProgress> {
    const res = await fetch(`/api/progress/course/${courseId}`, {
      headers: getAuthHeaders(),
    });
    return handleResponse<CourseProgress>(res);
  },
};
