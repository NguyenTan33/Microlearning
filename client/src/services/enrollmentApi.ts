import type { Enrollment } from '../types/catalog.types';

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
    const res = await fetch(`/api/enrollments/course/${courseId}`, {
      method: 'POST',
      headers: getAuthHeaders(),
    });
    return handleResponse<Enrollment>(res);
  },

  /**
   * Lấy danh sách các khóa học tài khoản hiện tại đã ghi danh
   */
  async getMyEnrollments(): Promise<Enrollment[]> {
    const res = await fetch('/api/enrollments/my-courses', {
      headers: getAuthHeaders(),
    });
    return handleResponse<Enrollment[]>(res);
  },
};
