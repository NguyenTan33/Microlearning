import type { Enrollment } from '../types/catalog.types';
import { getCurrentUser } from '../utils/tokenHelper';

function getLocalEnrollmentsKey(): string {
  const user = getCurrentUser();
  const userId = user?.userId ? user.userId.trim() : 'guest';
  return `microlearning_enrolled_courses_${userId}`;
}

function getLocalEnrollments(): number[] {
  try {
    const raw = localStorage.getItem(getLocalEnrollmentsKey());
    if (raw) return JSON.parse(raw);
  } catch {
    // ignore
  }
  return [];
}

function saveLocalEnrollment(courseId: number): void {
  const current = getLocalEnrollments();
  if (!current.includes(courseId)) {
    current.push(courseId);
    try {
      localStorage.setItem(getLocalEnrollmentsKey(), JSON.stringify(current));
    } catch {
      // ignore
    }
  }
}

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

export const enrollmentApi = {
  /**
   * Ghi danh tham gia một khóa học
   */
  async enrollCourse(courseId: number): Promise<Enrollment> {
    saveLocalEnrollment(courseId);
    try {
      const res = await fetch(`/api/enrollments/course/${courseId}`, {
        method: 'POST',
        headers: getAuthHeaders(),
      });
      return await handleResponse<Enrollment>(res);
    } catch {
      const user = getCurrentUser();
      return {
        id: courseId,
        accountId: user?.userId || 'current-user',
        courseId,
        courseTitle: `Khóa học #${courseId}`,
        courseThumbnail: '',
        status: 1,
        enrolledAt: new Date().toISOString(),
        overallProgressPercent: 0,
      };
    }
  },

  /**
   * Lấy danh sách các khóa học tài khoản hiện tại đã ghi danh
   */
  async getMyEnrollments(): Promise<Enrollment[]> {
    try {
      const res = await fetch('/api/enrollments/my-courses', {
        headers: getAuthHeaders(),
      });
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data)) {
          return data;
        }
      }
      throw new Error('Fallback to local');
    } catch {
      const user = getCurrentUser();
      const enrolledIds = getLocalEnrollments();
      return enrolledIds.map((id) => ({
        id,
        accountId: user?.userId || 'current-user',
        courseId: id,
        courseTitle: `Khóa học #${id}`,
        courseThumbnail: '',
        status: 1,
        enrolledAt: new Date().toISOString(),
        overallProgressPercent: 0,
      }));
    }
  },
};
