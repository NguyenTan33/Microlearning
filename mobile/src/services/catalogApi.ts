import { apiClient, getApiBaseUrl } from './apiClient';
import { STORAGE_KEYS } from '../utils/constants';
import { secureStorage } from '../utils/secureStorage';
import { catalogRepository } from '../db/repositories/catalogRepository';
import type { Course, CourseDetail, Subject, Lesson } from '../types/catalog.types';
import type { LessonMediaInfo, LinkExternalMediaRequest } from '../types/media.types';

const CREATED_COURSES_KEY = 'microlearn_locally_created_courses';
const DELETED_COURSES_KEY = 'microlearn_deleted_course_ids';

async function getDeletedCourseIds(): Promise<Set<number>> {
  try {
    const raw = await secureStorage.getItem(DELETED_COURSES_KEY);
    return raw ? new Set(JSON.parse(raw)) : new Set();
  } catch {
    return new Set();
  }
}

async function saveDeletedCourseId(id: number): Promise<void> {
  try {
    const ids = await getDeletedCourseIds();
    ids.add(id);
    await secureStorage.setItem(DELETED_COURSES_KEY, JSON.stringify(Array.from(ids)));
  } catch {
    // ignore
  }
}

async function removeDeletedCourseId(id: number): Promise<void> {
  try {
    const ids = await getDeletedCourseIds();
    ids.delete(id);
    await secureStorage.setItem(DELETED_COURSES_KEY, JSON.stringify(Array.from(ids)));
  } catch {
    // ignore
  }
}

async function getLocallyCreatedCourses(): Promise<Course[]> {
  try {
    const raw = await secureStorage.getItem(CREATED_COURSES_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

async function saveLocallyCreatedCourse(course: Course): Promise<void> {
  try {
    await removeDeletedCourseId(course.id);
    const created = (await getLocallyCreatedCourses()).filter((c) => c.id !== course.id);
    created.unshift(course);
    await secureStorage.setItem(CREATED_COURSES_KEY, JSON.stringify(created));
  } catch {
    // ignore
  }
}

async function updateLocallyCreatedCourse(course: Course): Promise<void> {
  try {
    const created = (await getLocallyCreatedCourses()).map((c) => (c.id === course.id ? course : c));
    await secureStorage.setItem(CREATED_COURSES_KEY, JSON.stringify(created));
  } catch {
    // ignore
  }
}

export const catalogApi = {
  /**
   * Lấy danh sách toàn bộ khóa học (mặc định lấy khóa đã xuất bản; chế độ quản lý truyền includeUnpublished=true)
   */
  async getAllCourses(includeUnpublished: boolean = false): Promise<Course[]> {
    const timestamp = Date.now();
    const query = includeUnpublished ? `?includeUnpublished=true&_t=${timestamp}` : `?_t=${timestamp}`;
    const deletedIds = await getDeletedCourseIds();
    const locallyCreated = await getLocallyCreatedCourses();

    let serverCourses: Course[] = [];
    try {
      const res = await apiClient.get<Course[]>(`/api/courses${query}`);
      serverCourses = Array.isArray(res.data) ? res.data : [];
    } catch {
      serverCourses = await catalogRepository.getAllCourses();
    }

    serverCourses = serverCourses.filter((c) => !deletedIds.has(c.id));

    // Hợp nhất các khóa học tạo cục bộ chưa kịp đồng bộ hoặc tồn tại trên máy
    const existingIds = new Set(serverCourses.map((c) => c.id));
    const mergedCourses = [...serverCourses];
    locallyCreated.forEach((lc) => {
      if (!existingIds.has(lc.id) && !deletedIds.has(lc.id)) {
        if (includeUnpublished || lc.isPublished) {
          mergedCourses.unshift(lc);
        }
      }
    });

    // Lưu vào SQLite phục vụ chế độ Offline-First
    catalogRepository.saveCourses(mergedCourses).catch(() => {});

    return mergedCourses;
  },

  /**
   * Lấy danh sách môn học thuộc về một khóa học (trực tiếp từ SQL, bypass cache)
   */
  async getSubjectsByCourse(courseId: number): Promise<Subject[]> {
    const timestamp = Date.now();
    const res = await apiClient.get<Subject[]>(`/api/subjects/course/${courseId}?_t=${timestamp}`);
    return res.data;
  },

  /**
   * Lấy danh sách bài học thuộc về môn học (trực tiếp từ SQL, bypass cache)
   */
  async getLessonsBySubject(subjectId: number, includeUnpublished: boolean = false): Promise<Lesson[]> {
    const timestamp = Date.now();
    const baseParam = includeUnpublished ? 'includeUnpublished=true' : '';
    const query = baseParam ? `?${baseParam}&_t=${timestamp}` : `?_t=${timestamp}`;
    const res = await apiClient.get<Lesson[]>(`/api/lessons/subject/${subjectId}${query}`);
    return res.data;
  },

  /**
   * Lấy chi tiết khóa học và tự động ghép nối live subjects & lessons để tránh lỗi cache server
   */
  async getCourseById(courseId: number, includeUnpublished: boolean = false): Promise<CourseDetail> {
    const timestamp = Date.now();
    const baseParam = includeUnpublished ? 'includeUnpublished=true' : '';
    const query = baseParam ? `?${baseParam}&_t=${timestamp}` : `?_t=${timestamp}`;
    const res = await apiClient.get<CourseDetail>(`/api/courses/${courseId}${query}`);
    const courseDetail = res.data;

    // Live composition: Tự động tải danh sách live subjects và lessons từ SQL để dữ liệu luôn mới 100%
    try {
      const liveSubjects = await this.getSubjectsByCourse(courseId);
      if (Array.isArray(liveSubjects) && liveSubjects.length > 0) {
        const subjectsWithLessons = await Promise.all(
          liveSubjects.map(async (subj) => {
            try {
              const liveLessons = await this.getLessonsBySubject(subj.id, includeUnpublished);
              return {
                ...subj,
                totalLessons: Array.isArray(liveLessons) ? liveLessons.length : 0,
                lessons: Array.isArray(liveLessons) ? liveLessons : [],
              };
            } catch {
              return {
                ...subj,
                lessons: subj.lessons || [],
              };
            }
          })
        );
        courseDetail.subjects = subjectsWithLessons;
        courseDetail.totalSubjects = subjectsWithLessons.length;
      }
    } catch (syncErr) {
      console.warn('[catalogApi] Lỗi ghép live subjects/lessons:', syncErr);
    }

    return courseDetail;
  },

  /**
   * Mở khóa khóa học có mật khẩu
   */
  async unlockCourse(courseId: number, passkey: string): Promise<{ success: boolean; message?: string }> {
    const res = await apiClient.post<{ success: boolean; message?: string }>(`/api/courses/${courseId}/unlock`, { passkey });
    return res.data;
  },

  /**
   * Lấy thông tin chi tiết một bài học
   */
  async getLessonById(lessonId: number): Promise<Lesson> {
    const res = await apiClient.get<Lesson>(`/api/lessons/${lessonId}`);
    return res.data;
  },

  /**
   * Lấy thông tin nguồn phát video thật của bài giảng (Azure Blob stream, YouTube embed, direct MP4)
   */
  async getLessonMediaInfo(lessonId: number): Promise<LessonMediaInfo> {
    const res = await apiClient.get<LessonMediaInfo>(`/api/media/lesson/${lessonId}/info`);
    return res.data;
  },

  /**
   * Báo cáo tiến độ xem bài học lên Backend (hỗ trợ cả /api/progress/events và /api/lessons/:id/progress)
   */
  async sendProgressEvent(lessonId: number, watchedSeconds: number, totalDurationSeconds: number): Promise<boolean> {
    const percent = totalDurationSeconds > 0 ? (watchedSeconds / totalDurationSeconds) * 100 : 0;
    try {
      await apiClient.post('/api/progress/events', {
        lessonId,
        watchedSeconds: Math.round(watchedSeconds),
        percent: Math.min(100, Math.round(percent * 10) / 10),
      });
      return true;
    } catch {
      try {
        await apiClient.post(`/api/lessons/${lessonId}/progress`, {
          watchedSeconds,
          totalDurationSeconds,
        });
        return true;
      } catch {
        return false;
      }
    }
  },

  // ==================== QUẢN LÝ KHÓA HỌC (ADMIN / TEACHER) ====================
  async createCourse(data: {
    title: string;
    description: string;
    thumbnailUrl?: string;
    isPrivate?: boolean;
    accessPassword?: string;
  }): Promise<Course> {
    const res = await apiClient.post<Course>('/api/courses', data);
    const created: Course = {
      ...res.data,
      isPrivate: data.isPrivate ?? false,
      isPublished: res.data.isPublished ?? true,
    };
    await saveLocallyCreatedCourse(created);
    await catalogRepository.saveCourses([created]);
    return created;
  },

  async updateCourse(
    id: number,
    data: {
      title: string;
      description: string;
      thumbnailUrl?: string;
      isPublished?: boolean;
      isPrivate?: boolean;
      accessPassword?: string;
    }
  ): Promise<Course> {
    const res = await apiClient.put<Course>(`/api/courses/${id}`, data);
    const updated: Course = {
      ...res.data,
      isPrivate: data.isPrivate,
      isPublished: data.isPublished ?? res.data.isPublished,
    };
    await updateLocallyCreatedCourse(updated);
    await catalogRepository.saveCourses([updated]);
    return updated;
  },

  async togglePublishCourse(id: number): Promise<{ courseId: number; isPublished: boolean; message: string }> {
    const res = await apiClient.patch<{ courseId: number; isPublished: boolean; message: string }>(
      `/api/courses/${id}/toggle-publish`
    );
    const locally = (await getLocallyCreatedCourses()).map((c) =>
      c.id === id ? { ...c, isPublished: res.data.isPublished } : c
    );
    await secureStorage.setItem(CREATED_COURSES_KEY, JSON.stringify(locally));
    const existing = await catalogRepository.getAllCourses();
    const target = existing.find((c) => c.id === id);
    if (target) {
      target.isPublished = res.data.isPublished;
      await catalogRepository.saveCourses([target]);
    }
    return res.data;
  },

  async deleteCourse(id: number): Promise<{ message: string }> {
    await saveDeletedCourseId(id);
    await catalogRepository.deleteCourse(id);
    const res = await apiClient.delete<{ message: string }>(`/api/courses/${id}`);
    return res.data;
  },

  // ==================== QUẢN LÝ MÔN HỌC (ADMIN / TEACHER) ====================
  async createSubject(data: { courseId: number; title: string; description: string; sortOrder: number }): Promise<Subject> {
    const res = await apiClient.post<Subject>('/api/subjects', data);
    return res.data;
  },

  async updateSubject(id: number, data: { title: string; description: string; sortOrder: number }): Promise<Subject> {
    const res = await apiClient.put<Subject>(`/api/subjects/${id}`, data);
    return res.data;
  },

  async deleteSubject(id: number): Promise<{ message: string }> {
    const res = await apiClient.delete<{ message: string }>(`/api/subjects/${id}`);
    return res.data;
  },

  // ==================== QUẢN LÝ BÀI HỌC (ADMIN / TEACHER) ====================
  async createLesson(data: {
    subjectId: number;
    title: string;
    description: string;
    durationSeconds: number;
    sortOrder: number;
  }): Promise<Lesson> {
    const res = await apiClient.post<Lesson>('/api/lessons', data);
    catalogRepository.saveLesson(res.data).catch(() => {});
    return res.data;
  },

  async updateLesson(
    id: number,
    data: {
      title: string;
      description: string;
      durationSeconds: number;
      sortOrder: number;
    }
  ): Promise<Lesson> {
    const res = await apiClient.put<Lesson>(`/api/lessons/${id}`, data);
    catalogRepository.saveLesson(res.data).catch(() => {});
    return res.data;
  },

  async togglePublishLesson(id: number): Promise<{ isPublished: boolean; message: string }> {
    const res = await apiClient.patch<{ isPublished: boolean; message: string }>(`/api/lessons/${id}/toggle-publish`);
    return res.data;
  },

  async deleteLesson(id: number): Promise<{ message: string }> {
    const res = await apiClient.delete<{ message: string }>(`/api/lessons/${id}`);
    return res.data;
  },

  async uploadLessonVideo(
    file: { uri: string; name: string; type: string },
    lessonId: number
  ): Promise<{
    id: number;
    fileName: string;
    blobKey: string;
    streamUrl: string;
    sizeBytes: number;
    lessonId?: number;
  }> {
    const formData = new FormData();
    formData.append('file', {
      uri: file.uri,
      name: file.name,
      type: file.type || 'video/mp4',
    } as unknown as Blob);
    formData.append('lessonId', String(lessonId));

    const token = await secureStorage.getItem(STORAGE_KEYS.ACCESS_TOKEN);
    const baseUrl = getApiBaseUrl().replace(/\/+$/, '');
    const headers: Record<string, string> = {};
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    // LƯU Ý QUAN TRỌNG CHO REACT NATIVE:
    // Tuyệt đối KHÔNG gán 'Content-Type': 'multipart/form-data' thủ công.
    // fetch trên React Native sẽ tự động gắn header kèm boundary thích hợp.

    const controller = new AbortController();
    // Cho phép upload video tối đa 10 phút trước khi hủy tác vụ
    const timeoutId = setTimeout(() => controller.abort(), 10 * 60 * 1000);

    try {
      const res = await fetch(`${baseUrl}/api/media/upload`, {
        method: 'POST',
        headers,
        body: formData,
        signal: controller.signal,
      });

      if (!res.ok) {
        let errorMsg = `Tải lên thất bại với mã lỗi HTTP ${res.status}`;
        try {
          const errData = await res.json();
          errorMsg = errData.message || errData.error || errorMsg;
        } catch {
          const raw = await res.text();
          if (raw) errorMsg = raw;
        }
        throw new Error(errorMsg);
      }

      const result = await res.json();

      // Cập nhật thông tin vào cache SQLite cục bộ nếu có
      try {
        const existingLesson = await catalogRepository.getLessonById(lessonId);
        if (existingLesson) {
          await catalogRepository.saveLesson({
            ...existingLesson,
            mediaAssetCount: (existingLesson.mediaAssetCount || 0) + 1,
            videoUrl: result.streamUrl || existingLesson.videoUrl,
          });
        }
      } catch {
        // ignore cache write error
      }

      return result;
    } finally {
      clearTimeout(timeoutId);
    }
  },

  async linkExternalLessonVideo(data: LinkExternalMediaRequest): Promise<LessonMediaInfo> {
    const res = await apiClient.post<LessonMediaInfo>('/api/media/link-external', data);
    return res.data;
  },

  async createQuiz(
    lessonId: number,
    data: {
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
    }
  ): Promise<{ id: number; title: string }> {
    const res = await apiClient.post<{ id: number; title: string }>(`/api/quizzes/lesson/${lessonId}`, data);
    try {
      const existing = await catalogRepository.getLessonById(lessonId);
      if (existing) {
        await catalogRepository.saveLesson({
          ...existing,
          hasQuiz: true,
        });
      }
    } catch {
      // ignore
    }
    return res.data;
  },
};
