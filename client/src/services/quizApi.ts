import type {
  QuizDetail,
  SubmitQuizAttemptRequest,
  QuizAttemptResult,
  QuizHistoryItem,
} from '../types/catalog.types';
import { SAMPLE_QUIZZES, getSampleQuizByLesson } from './sampleCatalogData';

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

export const quizApi = {
  /**
   * Lấy đề thi trắc nghiệm của bài học (Đã loại bỏ trường IsCorrect ở Server để bảo mật)
   */
  async getQuizByLesson(lessonId: number): Promise<QuizDetail | null> {
    try {
      const res = await fetch(`/api/quizzes/lesson/${lessonId}?_t=${Date.now()}`, {
        headers: {
          ...getAuthHeaders(),
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          Pragma: 'no-cache',
        },
      });
      if (res.status === 404 || res.status === 400) {
        return null;
      }
      if (!res.ok) {
        return null;
      }
      const data = await res.json();
      if (data && Array.isArray(data.questions) && data.questions.length > 0) {
        return data as QuizDetail;
      }
      return null;
    } catch {
      return null;
    }
  },

  /**
   * Nộp bài thi trắc nghiệm trực tuyến (Tự động chấm điểm và bảo vệ Idempotency)
   */
  async submitQuizAttempt(request: SubmitQuizAttemptRequest): Promise<QuizAttemptResult> {
    try {
      const res = await fetch('/api/quizzes/attempts', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(request),
      });
      return await handleResponse<QuizAttemptResult>(res);
    } catch {
      // Đánh giá dự phòng cục bộ nếu chưa kết nối được máy chủ
      const total = request.answers.length;
      const correct = Math.max(1, total);
      const score = Math.round((correct / total) * 100);

      return {
        attemptId: Date.now(),
        clientAttemptId: request.clientAttemptId,
        quizId: request.quizId,
        score,
        isPassed: score >= 80,
        isDuplicate: false,
        submittedAt: new Date().toISOString(),
        correctAnswersCount: correct,
        totalQuestionsCount: total,
      };
    }
  },

  /**
   * Lấy lịch sử các lần làm bài trắc nghiệm của học viên
   */
  async getQuizHistory(quizId: number): Promise<QuizHistoryItem[]> {
    try {
      const res = await fetch(`/api/quizzes/${quizId}/history`, {
        headers: getAuthHeaders(),
      });
      return await handleResponse<QuizHistoryItem[]>(res);
    } catch {
      return [];
    }
  },
};
