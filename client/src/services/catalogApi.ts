import type {
  Course,
  CourseDetail,
  Subject,
  Lesson,
  LessonPackageResponse,
} from '../types/catalog.types';
import { SAMPLE_COURSES, SAMPLE_QUIZZES } from './sampleCatalogData';

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
   * Lấy danh sách các khóa học (mặc định chỉ lấy các khóa đã xuất bản; Studio truyền includeUnpublished=true)
   */
  async getAllCourses(includeUnpublished: boolean = false): Promise<Course[]> {
    try {
      const url = includeUnpublished ? '/api/courses?includeUnpublished=true' : '/api/courses';
      const res = await fetch(url, {
        headers: getAuthHeaders(),
      });
      const data = await handleResponse<Course[]>(res);
      if (Array.isArray(data) && data.length > 0) {
        return data;
      }
      return SAMPLE_COURSES;
    } catch {
      return SAMPLE_COURSES;
    }
  },

  /**
   * Lấy thông tin chi tiết một khóa học kèm danh sách môn học
   */
  async getCourseById(courseId: number, includeUnpublished: boolean = false): Promise<CourseDetail> {
    try {
      const url = includeUnpublished ? `/api/courses/${courseId}?includeUnpublished=true` : `/api/courses/${courseId}`;
      const res = await fetch(url, {
        headers: getAuthHeaders(),
      });
      return await handleResponse<CourseDetail>(res);
    } catch {
      const found = SAMPLE_COURSES.find((c) => c.id === courseId);
      if (found) return found;
      return SAMPLE_COURSES[0];
    }
  },

  /**
   * Lấy danh sách các môn học thuộc về một khóa học
   */
  async getSubjectsByCourse(courseId: number): Promise<Subject[]> {
    try {
      const res = await fetch(`/api/subjects/course/${courseId}`, {
        headers: getAuthHeaders(),
      });
      return await handleResponse<Subject[]>(res);
    } catch {
      const found = SAMPLE_COURSES.find((c) => c.id === courseId);
      return found?.subjects || [];
    }
  },

  /**
   * Lấy danh sách bài học thuộc về một môn học
   */
  async getLessonsBySubject(subjectId: number, includeUnpublished: boolean = false): Promise<Lesson[]> {
    try {
      const url = includeUnpublished ? `/api/lessons/subject/${subjectId}?includeUnpublished=true` : `/api/lessons/subject/${subjectId}`;
      const res = await fetch(url, {
        headers: getAuthHeaders(),
      });
      return await handleResponse<Lesson[]>(res);
    } catch {
      for (const course of SAMPLE_COURSES) {
        const subj = course.subjects.find((s) => s.id === subjectId);
        if (subj?.lessons) return subj.lessons;
      }
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
      for (const course of SAMPLE_COURSES) {
        for (const subj of course.subjects) {
          const l = subj.lessons?.find((item) => item.id === lessonId);
          if (l) return l;
        }
      }
      return SAMPLE_COURSES[0].subjects[0].lessons![0];
    }
  },

  /**
   * Lấy toàn bộ gói dữ liệu của bài học để học và lưu trữ ngoại tuyến
   */
  async getLessonPackage(lessonId: number): Promise<LessonPackageResponse> {
    try {
      const res = await fetch(`/api/lessons/${lessonId}/package`, {
        headers: getAuthHeaders(),
      });
      return await handleResponse<LessonPackageResponse>(res);
    } catch {
      let foundLesson: Lesson | null = null;
      for (const course of SAMPLE_COURSES) {
        for (const subj of course.subjects) {
          const l = subj.lessons?.find((item) => item.id === lessonId);
          if (l) {
            foundLesson = l;
            break;
          }
        }
        if (foundLesson) break;
      }

      const lesson = foundLesson || SAMPLE_COURSES[0].subjects[0].lessons![0];
      const quiz = SAMPLE_QUIZZES[lessonId];

      return {
        lessonId: lesson.id,
        subjectId: lesson.subjectId,
        title: lesson.title,
        description: lesson.description,
        durationSeconds: lesson.durationSeconds,
        sortOrder: lesson.sortOrder,
        version: lesson.version,
        mediaAssets: [
          {
            id: lesson.id,
            type: 1,
            fileName: 'test.mp4',
            blobKey: 'videos/test.mp4',
            sizeBytes: 17979812,
            checksum: '38a141d8684b59ffeb40dcdf65278e9b926248c7f56022551ce4e82910bab68c',
            durationSeconds: lesson.durationSeconds,
            status: 3,
          },
        ],
        quiz: quiz
          ? {
              id: quiz.id,
              title: quiz.title,
              passScore: quiz.passScore,
              version: quiz.version,
              questions: quiz.questions.map((q) => ({
                id: q.id,
                content: q.content,
                explanation: q.explanation,
                points: q.points,
                sortOrder: q.sortOrder,
                questionType: q.questionType,
                options: q.options.map((o) => ({
                  id: o.id,
                  optionText: o.optionText,
                  sortOrder: o.sortOrder,
                })),
              })),
            }
          : undefined,
      };
    }
  },

  /**
   * Tạo khóa học mới (Teacher & Admin)
   */
  async createCourse(request: { title: string; description: string; thumbnailUrl: string }): Promise<Course> {
    const res = await fetch('/api/courses', {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(request),
    });
    return await handleResponse<Course>(res);
  },

  /**
   * Cập nhật thông tin khóa học (Teacher & Admin)
   */
  async updateCourse(id: number, request: { title: string; description: string; thumbnailUrl: string }): Promise<Course> {
    const res = await fetch(`/api/courses/${id}`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify(request),
    });
    return await handleResponse<Course>(res);
  },

  /**
   * Bật/Tắt trạng thái xuất bản khóa học (Teacher & Admin)
   */
  async togglePublishCourse(id: number): Promise<{ isPublished: boolean; message: string }> {
    const res = await fetch(`/api/courses/${id}/toggle-publish`, {
      method: 'PATCH',
      headers: getAuthHeaders(),
    });
    return await handleResponse<{ isPublished: boolean; message: string }>(res);
  },

  /**
   * Xóa khóa học (Teacher & Admin)
   */
  async deleteCourse(id: number): Promise<{ message: string }> {
    const res = await fetch(`/api/courses/${id}`, {
      method: 'DELETE',
      headers: getAuthHeaders(),
    });
    return await handleResponse<{ message: string }>(res);
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
};
