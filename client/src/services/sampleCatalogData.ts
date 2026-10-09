import type { CourseDetail, QuizDetail } from '../types/catalog.types';

/**
 * Danh sách khóa học mẫu (đã dọn dẹp để vận hành dữ liệu thật)
 */
export const SAMPLE_COURSES: CourseDetail[] = [];

/**
 * Danh sách câu hỏi trắc nghiệm mẫu
 */
export const SAMPLE_QUIZZES: Record<number, QuizDetail> = {};

/**
 * Trả về cấu trúc đề thi mặc định nếu bài học chưa có trắc nghiệm từ máy chủ
 */
export function getSampleQuizByLesson(lessonId: number): QuizDetail {
  return (
    SAMPLE_QUIZZES[lessonId] || {
      id: lessonId,
      lessonId,
      title: 'Kiểm tra trắc nghiệm bài học',
      passScore: 60,
      timeLimitMinutes: 10,
      questions: [],
    }
  );
}
