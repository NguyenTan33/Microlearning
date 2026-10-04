import type {
  QuizDetail,
  SubmitQuizAttemptRequest,
  QuizAttemptResult,
  QuizHistoryItem,
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

export const quizApi = {
  /**
   * Lấy đề thi trắc nghiệm của bài học (Đã loại bỏ trường IsCorrect ở Server để bảo mật)
   */
  async getQuizByLesson(lessonId: number): Promise<QuizDetail | null> {
    const res = await fetch(`/api/quizzes/lesson/${lessonId}`, {
      headers: getAuthHeaders(),
    });
    if (res.status === 404) return null;
    return handleResponse<QuizDetail>(res);
  },

  /**
   * Nộp bài thi trắc nghiệm trực tuyến (Tự động chấm điểm và bảo vệ Idempotency)
   */
  async submitQuizAttempt(request: SubmitQuizAttemptRequest): Promise<QuizAttemptResult> {
    const res = await fetch('/api/quizzes/attempts', {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(request),
    });
    return handleResponse<QuizAttemptResult>(res);
  },

  /**
   * Lấy lịch sử các lần làm bài trắc nghiệm của học viên
   */
  async getQuizHistory(quizId: number): Promise<QuizHistoryItem[]> {
    const res = await fetch(`/api/quizzes/${quizId}/history`, {
      headers: getAuthHeaders(),
    });
    return handleResponse<QuizHistoryItem[]>(res);
  },
};
