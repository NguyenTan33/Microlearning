import type {
  Course,
  CourseDetail,
  Subject,
  Lesson,
  LessonPackageResponse,
} from '../types/catalog.types';

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

export const catalogApi = {
  /**
   * Lấy danh sách tất cả các khóa học đã xuất bản
   */
  async getAllCourses(): Promise<Course[]> {
    const res = await fetch('/api/courses', {
      headers: getAuthHeaders(),
    });
    return handleResponse<Course[]>(res);
  },

  /**
   * Lấy thông tin chi tiết một khóa học kèm danh sách môn học
   */
  async getCourseById(courseId: number): Promise<CourseDetail> {
    const res = await fetch(`/api/courses/${courseId}`, {
      headers: getAuthHeaders(),
    });
    return handleResponse<CourseDetail>(res);
  },

  /**
   * Lấy danh sách các môn học thuộc về một khóa học
   */
  async getSubjectsByCourse(courseId: number): Promise<Subject[]> {
    const res = await fetch(`/api/subjects/course/${courseId}`, {
      headers: getAuthHeaders(),
    });
    return handleResponse<Subject[]>(res);
  },

  /**
   * Lấy danh sách bài học thuộc về một môn học
   */
  async getLessonsBySubject(subjectId: number): Promise<Lesson[]> {
    const res = await fetch(`/api/lessons/subject/${subjectId}`, {
      headers: getAuthHeaders(),
    });
    return handleResponse<Lesson[]>(res);
  },

  /**
   * Lấy thông tin chi tiết bài học
   */
  async getLessonById(lessonId: number): Promise<Lesson> {
    const res = await fetch(`/api/lessons/${lessonId}`, {
      headers: getAuthHeaders(),
    });
    return handleResponse<Lesson>(res);
  },

  /**
   * Lấy toàn bộ gói dữ liệu của bài học để học và lưu trữ ngoại tuyến
   */
  async getLessonPackage(lessonId: number): Promise<LessonPackageResponse> {
    const res = await fetch(`/api/lessons/${lessonId}/package`, {
      headers: getAuthHeaders(),
    });
    return handleResponse<LessonPackageResponse>(res);
  },
};
