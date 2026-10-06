import { apiClient } from './apiClient';
import type {
  Course,
  CourseDetail,
  Subject,
  Lesson,
  LessonPackage,
  SubmitQuizAttemptRequest,
  SubmitQuizAttemptResponse,
} from '../types/catalog.types';

export const catalogApi = {
  /**
   * Lấy danh sách toàn bộ khóa học
   */
  async getAllCourses(): Promise<Course[]> {
    const response = await apiClient.get<Course[]>('/courses');
    return response.data;
  },

  /**
   * Lấy chi tiết khóa học kèm danh sách môn học và bài học
   */
  async getCourseById(courseId: number): Promise<CourseDetail> {
    const courseRes = await apiClient.get<Course>(`/courses/${courseId}`);
    const subjectsRes = await apiClient.get<Subject[]>(`/subjects/course/${courseId}`);

    const subjects: Subject[] = [];
    for (const sub of subjectsRes.data) {
      try {
        const lessonsRes = await apiClient.get<Lesson[]>(`/lessons/subject/${sub.id}`);
        subjects.push({
          ...sub,
          lessons: lessonsRes.data,
        });
      } catch {
        subjects.push({ ...sub, lessons: [] });
      }
    }

    return {
      ...courseRes.data,
      subjects,
    };
  },

  /**
   * Lấy gói bài học ngoại tuyến trọn gói (Metadata Video + Checksum SHA-256 + Quiz)
   */
  async getLessonPackage(lessonId: number): Promise<LessonPackage> {
    const response = await apiClient.get<LessonPackage>(`/lessons/${lessonId}/package`);
    return response.data;
  },

  /**
   * Nộp bài thi trắc nghiệm trực tuyến
   */
  async submitQuizAttempt(
    request: SubmitQuizAttemptRequest
  ): Promise<SubmitQuizAttemptResponse> {
    const response = await apiClient.post<SubmitQuizAttemptResponse>(
      '/quizzes/attempts',
      request
    );
    return response.data;
  },

  /**
   * Gửi sự kiện xem video lên Server (Monotonic Merge)
   */
  async sendProgressEvent(
    lessonId: number,
    watchedSeconds: number,
    totalDurationSeconds: number
  ): Promise<{ lessonId: number; percent: number; isCompleted: boolean }> {
    const response = await apiClient.post<{
      lessonId: number;
      percent: number;
      isCompleted: boolean;
    }>('/progress/events', {
      lessonId,
      watchedSeconds,
      totalDurationSeconds,
    });
    return response.data;
  },
};
