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

export interface CourseAccessStatus {
  courseId: number;
  isPrivate: boolean;
  hasAccess: boolean;
  currentPasswordVersion: number;
}

export const courseAccessApi = {
  /**
   * Kiểm tra quyền truy cập của học viên hiện tại vào khóa học (Public/Private)
   */
  async checkAccess(courseId: number): Promise<CourseAccessStatus> {
    try {
      const res = await fetch(`/api/courses/${courseId}/access/check`, {
        headers: getAuthHeaders(),
      });
      return await handleResponse<CourseAccessStatus>(res);
    } catch {
      return {
        courseId,
        isPrivate: false,
        hasAccess: true,
        currentPasswordVersion: 1,
      };
    }
  },

  /**
   * Mở khóa học Private bằng mật khẩu
   */
  async unlockCourse(courseId: number, password: string): Promise<{ message: string }> {
    const res = await fetch(`/api/courses/${courseId}/access/unlock`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ password }),
    });
    return await handleResponse<{ message: string }>(res);
  },

  /**
   * Cập nhật chế độ bảo mật (Public/Private) và đổi mật khẩu khóa học (Dành cho Giảng viên/Admin)
   */
  async setCoursePrivacy(courseId: number, isPrivate: boolean, newPassword?: string): Promise<{ message: string; success: boolean }> {
    const res = await fetch(`/api/courses/${courseId}/access/privacy`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ isPrivate, newPassword }),
    });
    return await handleResponse<{ message: string; success: boolean }>(res);
  },
};
