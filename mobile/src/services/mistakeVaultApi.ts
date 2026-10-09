import { apiClient } from './apiClient';

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
   * Lấy danh sách câu hỏi làm sai trong sổ tay cá nhân từ Azure
   */
  async getMyMistakes(includeResolved = false): Promise<QuizMistakeItem[]> {
    try {
      const res = await apiClient.get<QuizMistakeItem[]>(
        `/api/quiz/mistakes?includeResolved=${includeResolved}`
      );
      return Array.isArray(res.data) ? res.data : [];
    } catch {
      return [];
    }
  },

  /**
   * Tạo phiên ôn luyện các câu làm sai
   */
  async generatePracticeSession(lessonId?: number): Promise<QuizPracticeSession> {
    try {
      const url = lessonId
        ? `/api/quiz/mistakes/practice?lessonId=${lessonId}`
        : '/api/quiz/mistakes/practice';
      const res = await apiClient.get<QuizPracticeSession>(url);
      return res.data;
    } catch {
      return { totalMistakes: 0, mistakes: [] };
    }
  },

  /**
   * Nộp câu trả lời ôn tập lại câu hỏi sai và nhận phản hồi chi tiết
   */
  async submitPracticeAnswer(
    mistakeId: number,
    selectedOptionId: number
  ): Promise<MistakeAnswerResult> {
    const res = await apiClient.post<MistakeAnswerResult>(
      `/api/quiz/mistakes/${mistakeId}/answer`,
      { selectedOptionId }
    );
    return res.data;
  },
};
