function getAuthHeaders(): HeadersInit {
  const token = localStorage.getItem('accessToken');
  const headers: Record<string, string> = {
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

export interface QuizMistakeOption {
  id: number;
  optionText: string;
  sortOrder: number;
}

export interface QuizMistakeItem {
  id: number;
  questionId: number;
  questionText: string;
  explanation?: string | null;
  quizId: number;
  lessonId: number;
  lessonTitle: string;
  selectedOptionId: number;
  failedCount: number;
  isResolved: boolean;
  lastFailedAt: string;
  resolvedAt?: string | null;
  options: QuizMistakeOption[];
}

export interface QuizPracticeSession {
  totalMistakes: number;
  mistakes: QuizMistakeItem[];
}

export interface MistakeAnswerResult {
  mistakeId: number;
  questionId: number;
  isCorrect: boolean;
  correctOptionId: number;
  explanation?: string | null;
  isResolved: boolean;
  failedCount: number;
  feedbackMessage: string;
}

export const mistakeVaultApi = {
  /**
   * Lấy danh sách câu hỏi làm sai trong sổ tay cá nhân
   */
  async getMyMistakes(includeResolved = false): Promise<QuizMistakeItem[]> {
    try {
      const res = await fetch(`/api/quiz/mistakes?includeResolved=${includeResolved}`, {
        headers: getAuthHeaders(),
      });
      return await handleResponse<QuizMistakeItem[]>(res);
    } catch {
      return [];
    }
  },

  /**
   * Tạo phiên ôn luyện các câu làm sai (có thể lọc theo bài học cụ thể)
   */
  async generatePracticeSession(lessonId?: number): Promise<QuizPracticeSession> {
    try {
      const url = lessonId ? `/api/quiz/mistakes/practice?lessonId=${lessonId}` : '/api/quiz/mistakes/practice';
      const res = await fetch(url, {
        headers: getAuthHeaders(),
      });
      return await handleResponse<QuizPracticeSession>(res);
    } catch {
      return { totalMistakes: 0, mistakes: [] };
    }
  },

  /**
   * Nộp câu trả lời ôn tập lại câu hỏi sai và nhận phản hồi chi tiết
   */
  async submitPracticeAnswer(mistakeId: number, selectedOptionId: number): Promise<MistakeAnswerResult> {
    const res = await fetch(`/api/quiz/mistakes/${mistakeId}/answer`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ selectedOptionId }),
    });
    return await handleResponse<MistakeAnswerResult>(res);
  },
};
