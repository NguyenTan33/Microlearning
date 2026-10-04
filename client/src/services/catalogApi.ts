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
   * Lấy danh sách tất cả các khóa học đã xuất bản
   */
  async getAllCourses(): Promise<Course[]> {
    try {
      const res = await fetch('/api/courses', {
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
  async getCourseById(courseId: number): Promise<CourseDetail> {
    try {
      const res = await fetch(`/api/courses/${courseId}`, {
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
  async getLessonsBySubject(subjectId: number): Promise<Lesson[]> {
    try {
      const res = await fetch(`/api/lessons/subject/${subjectId}`, {
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
};
