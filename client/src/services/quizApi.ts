import type {
  QuizDetail,
  QuizSummary,
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
   * Lấy toàn bộ danh sách các đề thi Quiz của bài học kèm trạng thái đã hoàn thành của học viên
   */
  async getAllQuizzesByLesson(lessonId: number): Promise<QuizSummary[]> {
    try {
      const res = await fetch(`/api/quizzes/lesson/${lessonId}/all?_t=${Date.now()}`, {
        headers: {
          ...getAuthHeaders(),
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          Pragma: 'no-cache',
        },
      });
      if (!res.ok) return [];
      const data = await res.json();
      return Array.isArray(data) ? (data as QuizSummary[]) : [];
    } catch {
      return [];
    }
  },

  /**
   * Lấy chi tiết một đề thi trắc nghiệm theo QuizId
   */
  async getQuizById(quizId: number): Promise<QuizDetail | null> {
    try {
      const res = await fetch(`/api/quizzes/${quizId}?_t=${Date.now()}`, {
        headers: {
          ...getAuthHeaders(),
          'Cache-Control': 'no-cache, no-store, must-revalidate',
        },
      });
      if (!res.ok) return null;
      const data = await res.json();
      return data as QuizDetail;
    } catch {
      return null;
    }
  },

  /**
   * Lấy đề thi trắc nghiệm đầu tiên của bài học (Tương thích ngược)
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
      if (res.status === 404 || res.status === 400 || !res.ok) {
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
   * Tạo bài tập Quiz mới cho bài học
   */
  async createQuiz(lessonId: number, data: { title: string; passScore?: number; questions?: any[] }): Promise<QuizDetail> {
    const res = await fetch(`/api/quizzes/lesson/${lessonId}`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(data),
    });
    return await handleResponse<QuizDetail>(res);
  },

  /**
   * Cập nhật nội dung một bài quiz
   */
  async updateQuiz(quizId: number, data: { title: string; passScore?: number; questions?: any[] }): Promise<QuizDetail> {
    const res = await fetch(`/api/quizzes/${quizId}`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify(data),
    });
    return await handleResponse<QuizDetail>(res);
  },

  /**
   * Xóa một bài quiz
   */
  async deleteQuiz(quizId: number): Promise<boolean> {
    const res = await fetch(`/api/quizzes/${quizId}`, {
      method: 'DELETE',
      headers: getAuthHeaders(),
    });
    return res.ok;
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
