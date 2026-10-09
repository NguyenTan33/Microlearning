import { apiClient } from './apiClient';
import type { Course, CourseDetail, Subject, Lesson } from '../types/catalog.types';
import type { LessonMediaInfo, LinkExternalMediaRequest } from '../types/media.types';

export const catalogApi = {
  /**
   * Lấy danh sách toàn bộ khóa học (mặc định lấy khóa đã xuất bản; chế độ quản lý truyền includeUnpublished=true)
   */
  async getAllCourses(includeUnpublished: boolean = false): Promise<Course[]> {
    const timestamp = Date.now();
    const query = includeUnpublished ? `?includeUnpublished=true&_t=${timestamp}` : `?_t=${timestamp}`;
    const res = await apiClient.get<Course[]>(`/api/courses${query}`);
    return res.data;
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
      if (Array.isArray(liveSubjects)) {
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
   * Báo cáo tiến độ xem bài học
   */
  async sendProgressEvent(lessonId: number, watchedSeconds: number, totalDurationSeconds: number): Promise<boolean> {
    try {
      await apiClient.post(`/api/lessons/${lessonId}/progress`, {
        watchedSeconds,
        totalDurationSeconds,
      });
      return true;
    } catch {
      return false;
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
    return res.data;
  },

  async updateCourse(
    id: number,
    data: {
      title: string;
      description: string;
      thumbnailUrl?: string;
      isPrivate?: boolean;
      accessPassword?: string;
    }
  ): Promise<Course> {
    const res = await apiClient.put<Course>(`/api/courses/${id}`, data);
    return res.data;
  },

  async togglePublishCourse(id: number): Promise<{ courseId: number; isPublished: boolean; message: string }> {
    const res = await apiClient.patch<{ courseId: number; isPublished: boolean; message: string }>(
      `/api/courses/${id}/toggle-publish`
    );
    return res.data;
  },

  async deleteCourse(id: number): Promise<{ message: string }> {
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
    return res.data;
  },
};
