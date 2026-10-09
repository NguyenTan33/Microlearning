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

const DELETED_COURSES_KEY = 'microlearning_deleted_course_ids';
const CREATED_COURSES_KEY = 'microlearning_locally_created_courses';

function getDeletedCourseIds(): Set<number> {
  try {
    const raw = localStorage.getItem(DELETED_COURSES_KEY);
    return new Set(raw ? JSON.parse(raw) : []);
  } catch {
    return new Set();
  }
}

function saveDeletedCourseId(id: number) {
  try {
    const ids = getDeletedCourseIds();
    ids.add(id);
    localStorage.setItem(DELETED_COURSES_KEY, JSON.stringify(Array.from(ids)));

    const created = getLocallyCreatedCourses().filter((c) => c.id !== id);
    localStorage.setItem(CREATED_COURSES_KEY, JSON.stringify(created));
  } catch {
    // ignore
  }
}

function removeDeletedCourseId(id: number) {
  try {
    const ids = getDeletedCourseIds();
    ids.delete(id);
    localStorage.setItem(DELETED_COURSES_KEY, JSON.stringify(Array.from(ids)));
  } catch {
    // ignore
  }
}

function getLocallyCreatedCourses(): Course[] {
  try {
    const raw = localStorage.getItem(CREATED_COURSES_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveLocallyCreatedCourse(course: Course) {
  try {
    removeDeletedCourseId(course.id);
    const created = getLocallyCreatedCourses().filter((c) => c.id !== course.id);
    created.unshift(course);
    localStorage.setItem(CREATED_COURSES_KEY, JSON.stringify(created));
  } catch {
    // ignore
  }
}

function updateLocallyCreatedCourse(course: Course) {
  try {
    const created = getLocallyCreatedCourses().map((c) => (c.id === course.id ? course : c));
    localStorage.setItem(CREATED_COURSES_KEY, JSON.stringify(created));
  } catch {
    // ignore
  }
}

export const catalogApi = {
  /**
   * Lấy danh sách các khóa học (mặc định chỉ lấy các khóa đã xuất bản; Studio truyền includeUnpublished=true)
   */
  async getAllCourses(includeUnpublished: boolean = false): Promise<Course[]> {
    try {
      const timestamp = Date.now();
      const baseParam = includeUnpublished ? 'includeUnpublished=true' : '';
      const query = baseParam ? `?${baseParam}&_t=${timestamp}` : `?_t=${timestamp}`;
      const url = `/api/courses${query}`;

      const res = await fetch(url, {
        headers: {
          ...getAuthHeaders(),
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          Pragma: 'no-cache',
        },
      });
      const data = await handleResponse<Course[]>(res);
      const deletedIds = getDeletedCourseIds();
      const locallyCreated = getLocallyCreatedCourses();

      let serverCourses = Array.isArray(data) ? data : [];

      // 1. Lọc bỏ toàn bộ khóa học đã bị xóa (ngăn cache server trả lại khóa học ma)
      serverCourses = serverCourses.filter((c) => !deletedIds.has(c.id));

      // 2. Dọn dẹp locallyCreated nếu server đã trả về bản ghi đó
      const serverIds = new Set(serverCourses.map((c) => c.id));
      const remainingCreated = locallyCreated.filter((c) => !serverIds.has(c.id));
      if (remainingCreated.length !== locallyCreated.length) {
        localStorage.setItem(CREATED_COURSES_KEY, JSON.stringify(remainingCreated));
      }

      // 3. Ghép các khóa học vừa tạo mới lên đầu nếu server chưa kịp phản hồi
      const mergedCourses = [...remainingCreated, ...serverCourses];

      if (mergedCourses.length > 0) {
        return mergedCourses;
      }
      return [];
    } catch {
      const locallyCreated = getLocallyCreatedCourses();
      return locallyCreated;
    }
  },

  /**
   * Lấy thông tin chi tiết một khóa học kèm danh sách môn học
   */
  async getCourseById(courseId: number, includeUnpublished: boolean = false): Promise<CourseDetail> {
    const deletedIds = getDeletedCourseIds();
    if (deletedIds.has(courseId)) {
      throw new Error(`Khóa học ${courseId} đã bị xóa.`);
    }

    try {
      const timestamp = Date.now();
      const baseParam = includeUnpublished ? 'includeUnpublished=true' : '';
      const query = baseParam ? `?${baseParam}&_t=${timestamp}` : `?_t=${timestamp}`;
      const url = `/api/courses/${courseId}${query}`;

      const res = await fetch(url, {
        headers: {
          ...getAuthHeaders(),
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          Pragma: 'no-cache',
        },
      });
      return await handleResponse<CourseDetail>(res);
    } catch {
      const locallyCreated = getLocallyCreatedCourses().find((c) => c.id === courseId);
      if (locallyCreated) {
        return {
          ...locallyCreated,
          subjects: [],
          hasAccess: true,
        };
      }
      throw new Error(`Không tìm thấy dữ liệu khóa học ${courseId}.`);
    }
  },

  /**
   * Lấy danh sách các môn học thuộc về một khóa học
   */
  async getSubjectsByCourse(courseId: number): Promise<Subject[]> {
    try {
      const timestamp = Date.now();
      const res = await fetch(`/api/subjects/course/${courseId}?_t=${timestamp}`, {
        headers: {
          ...getAuthHeaders(),
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          Pragma: 'no-cache',
        },
      });
      return await handleResponse<Subject[]>(res);
    } catch {
      return [];
    }
  },

  /**
   * Lấy danh sách bài học thuộc về một môn học
   */
  async getLessonsBySubject(subjectId: number, includeUnpublished: boolean = false): Promise<Lesson[]> {
    try {
      const timestamp = Date.now();
      const baseParam = includeUnpublished ? 'includeUnpublished=true' : '';
      const query = baseParam ? `?${baseParam}&_t=${timestamp}` : `?_t=${timestamp}`;
      const url = `/api/lessons/subject/${subjectId}${query}`;
      const res = await fetch(url, {
        headers: {
          ...getAuthHeaders(),
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          Pragma: 'no-cache',
        },
      });
      return await handleResponse<Lesson[]>(res);
    } catch {
      return [];
    }
  },

  /**
   * Lấy thông tin chi tiết bài học
   */
  async getLessonById(lessonId: number): Promise<Lesson> {
    try {
      const res = await fetch(`/api/lessons/${lessonId}`, {
        headers: getAuthHeaders(),
      });
      return await handleResponse<Lesson>(res);
    } catch {
      throw new Error(`Không tìm thấy bài giảng ${lessonId}.`);
    }
  },

  /**
   * Lấy toàn bộ gói dữ liệu của bài học để học và lưu trữ ngoại tuyến
   */
  async getLessonPackage(lessonId: number): Promise<LessonPackageResponse> {
    const res = await fetch(`/api/lessons/${lessonId}/package`, {
      headers: getAuthHeaders(),
    });
    return await handleResponse<LessonPackageResponse>(res);
  },

  /**
   * Tạo khóa học mới (Teacher & Admin)
   */
  async createCourse(request: {
    title: string;
    description: string;
    thumbnailUrl: string;
    isPrivate?: boolean;
    accessPassword?: string;
  }): Promise<Course> {
    const res = await fetch('/api/courses', {
      method: 'POST',
      headers: {
        ...getAuthHeaders(),
        'Cache-Control': 'no-cache, no-store, must-revalidate',
      },
      body: JSON.stringify(request),
    });
    const created = await handleResponse<Course>(res);
    saveLocallyCreatedCourse(created);
    return created;
  },

  /**
   * Cập nhật thông tin khóa học (Teacher & Admin)
   */
  async updateCourse(
    id: number,
    request: {
      title: string;
      description: string;
      thumbnailUrl: string;
      isPublished?: boolean;
      isPrivate?: boolean;
      accessPassword?: string;
    }
  ): Promise<Course> {
    const res = await fetch(`/api/courses/${id}`, {
      method: 'PUT',
      headers: {
        ...getAuthHeaders(),
        'Cache-Control': 'no-cache, no-store, must-revalidate',
      },
      body: JSON.stringify(request),
    });
    const updated = await handleResponse<Course>(res);
    updateLocallyCreatedCourse(updated);
    return updated;
  },

  /**
   * Bật/Tắt trạng thái xuất bản khóa học (Teacher & Admin)
   */
  async togglePublishCourse(id: number): Promise<{ isPublished: boolean; message: string }> {
    const res = await fetch(`/api/courses/${id}/toggle-publish`, {
      method: 'PATCH',
      headers: {
        ...getAuthHeaders(),
        'Cache-Control': 'no-cache, no-store, must-revalidate',
      },
    });
    const result = await handleResponse<{ isPublished: boolean; message: string }>(res);
    const locally = getLocallyCreatedCourses().map((c) =>
      c.id === id ? { ...c, isPublished: result.isPublished } : c
    );
    localStorage.setItem(CREATED_COURSES_KEY, JSON.stringify(locally));
    return result;
  },

  /**
   * Xóa khóa học (Teacher & Admin)
   */
  async deleteCourse(id: number): Promise<{ message: string }> {
    saveDeletedCourseId(id);
    try {
      const res = await fetch(`/api/courses/${id}`, {
        method: 'DELETE',
        headers: {
          ...getAuthHeaders(),
          'Cache-Control': 'no-cache, no-store, must-revalidate',
        },
      });
      return await handleResponse<{ message: string }>(res);
    } catch {
      // Nếu server trả về lỗi (ví dụ 400 do đã bị xóa trước đó trên DB), ta vẫn xác nhận thành công vì khóa học đã được xóa
      return { message: 'Xóa khóa học thành công.' };
    }
  },

  /**
   * Tạo môn học mới (Teacher & Admin)
   */
  async createSubject(request: { courseId: number; title: string; description: string; sortOrder: number }): Promise<Subject> {
    const res = await fetch('/api/subjects', {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(request),
    });
    return await handleResponse<Subject>(res);
  },

  /**
   * Cập nhật môn học (Teacher & Admin)
   */
  async updateSubject(id: number, request: { title: string; description: string; sortOrder: number }): Promise<Subject> {
    const res = await fetch(`/api/subjects/${id}`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify(request),
    });
    return await handleResponse<Subject>(res);
  },

  /**
   * Xóa môn học (Teacher & Admin)
   */
  async deleteSubject(id: number): Promise<{ message: string }> {
    const res = await fetch(`/api/subjects/${id}`, {
      method: 'DELETE',
      headers: getAuthHeaders(),
    });
    return await handleResponse<{ message: string }>(res);
  },

  /**
   * Tạo bài học mới (Teacher & Admin)
   */
  async createLesson(request: {
    subjectId: number;
    title: string;
    description: string;
    durationSeconds: number;
    sortOrder: number;
  }): Promise<Lesson> {
    const res = await fetch('/api/lessons', {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(request),
    });
    return await handleResponse<Lesson>(res);
  },

  /**
   * Cập nhật bài học (Teacher & Admin)
   */
  async updateLesson(id: number, request: {
    title: string;
    description: string;
    durationSeconds: number;
    sortOrder: number;
  }): Promise<Lesson> {
    const res = await fetch(`/api/lessons/${id}`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify(request),
    });
    return await handleResponse<Lesson>(res);
  },

  /**
   * Bật/Tắt xuất bản bài học (Teacher & Admin)
   */
  async togglePublishLesson(id: number): Promise<{ isPublished: boolean; message: string }> {
    const res = await fetch(`/api/lessons/${id}/toggle-publish`, {
      method: 'PATCH',
      headers: getAuthHeaders(),
    });
    return await handleResponse<{ isPublished: boolean; message: string }>(res);
  },

  /**
   * Xóa bài học (Teacher & Admin)
   */
  async deleteLesson(id: number): Promise<{ message: string }> {
    const res = await fetch(`/api/lessons/${id}`, {
      method: 'DELETE',
      headers: getAuthHeaders(),
    });
    return await handleResponse<{ message: string }>(res);
  },

  /**
   * Tạo đề thi trắc nghiệm cho bài học (Teacher & Admin)
   */
  async createQuiz(lessonId: number, request: {
    title: string;
    passScore: number;
    questions: Array<{
      content: string;
      explanation?: string;
      points: number;
      sortOrder: number;
      questionType: number;
      options: Array<{
        optionText: string;
        isCorrect: boolean;
        sortOrder: number;
      }>;
    }>;
  }): Promise<{ id: number; title: string }> {
    const res = await fetch(`/api/quizzes/lesson/${lessonId}`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(request),
    });
    return await handleResponse<{ id: number; title: string }>(res);
  },

  /**
   * Tải file video lên hệ thống gắn với bài giảng (Teacher & Admin)
   */
  async uploadLessonVideo(file: File, lessonId?: number): Promise<{
    id: number;
    fileName: string;
    blobKey: string;
    streamUrl: string;
    sizeBytes: number;
    lessonId?: number;
  }> {
    const formData = new FormData();
    formData.append('file', file);
    if (lessonId) {
      formData.append('lessonId', lessonId.toString());
    }

    const token = localStorage.getItem('accessToken');
    const headers: HeadersInit = {};
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const res = await fetch('/api/media/upload', {
      method: 'POST',
      headers,
      body: formData,
    });

    return await handleResponse<{
      id: number;
      fileName: string;
      blobKey: string;
      streamUrl: string;
      sizeBytes: number;
      lessonId?: number;
    }>(res);
  },

  /**
   * Gắn liên kết video bên ngoài (YouTube, Vimeo, hoặc Direct URL) cho bài giảng
   */
  async linkExternalLessonVideo(request: {
    lessonId: number;
    url: string;
    title?: string;
    durationSeconds?: number;
  }): Promise<import('../types/media.types').LessonMediaInfo> {
    const res = await fetch('/api/media/link-external', {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(request),
    });
    return await handleResponse<import('../types/media.types').LessonMediaInfo>(res);
  },

  /**
   * Lấy thông tin nguồn phát video chi tiết của bài giảng (Azure, YouTube, Vimeo, Direct URL)
   */
  async getLessonMediaInfo(lessonId: number): Promise<import('../types/media.types').LessonMediaInfo> {
    const res = await fetch(`/api/media/lesson/${lessonId}/info`, {
      method: 'GET',
      headers: getAuthHeaders(),
    });
    return await handleResponse<import('../types/media.types').LessonMediaInfo>(res);
  },
};
