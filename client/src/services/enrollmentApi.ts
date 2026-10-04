import type { Enrollment } from '../types/catalog.types';
import { SAMPLE_COURSES } from './sampleCatalogData';

const LOCAL_ENROLLMENTS_KEY = 'microlearning_enrolled_courses';

function getLocalEnrollments(): number[] {
  try {
    const raw = localStorage.getItem(LOCAL_ENROLLMENTS_KEY);
    if (raw) return JSON.parse(raw);
  } catch {
    // ignore
  }
  // Mặc định tự động ghi danh vào 2 khóa học: Excel và React Web IT
  return [1, 3];
}

function saveLocalEnrollment(courseId: number): void {
  const current = getLocalEnrollments();
  if (!current.includes(courseId)) {
    current.push(courseId);
    localStorage.setItem(LOCAL_ENROLLMENTS_KEY, JSON.stringify(current));
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
      const course = SAMPLE_COURSES.find((c) => c.id === courseId) || SAMPLE_COURSES[0];
      return {
        id: courseId,
        accountId: 'current-user',
        courseId,
        courseTitle: course.title,
        courseThumbnail: course.thumbnailUrl,
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
      const data = await handleResponse<Enrollment[]>(res);
      if (Array.isArray(data) && data.length > 0) {
        return data;
      }
      throw new Error('Fallback');
    } catch {
      const enrolledIds = getLocalEnrollments();
      return enrolledIds.map((id) => {
        const course = SAMPLE_COURSES.find((c) => c.id === id) || SAMPLE_COURSES[0];
        return {
          id,
          accountId: 'current-user',
          courseId: id,
          courseTitle: course.title,
          courseThumbnail: course.thumbnailUrl,
          status: 1,
          enrolledAt: '2026-10-01T08:00:00Z',
          overallProgressPercent: id === 1 ? 45 : id === 3 ? 20 : 0,
        };
      });
    }
  },
};
