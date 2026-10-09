import { apiClient } from './apiClient';

export interface QuizMistakeItem {
  id: number;
  quizId: number;
  questionId: number;
  lessonId: number;
  lessonTitle: string;
  questionText: string;
  options: string[];
  userAnswer: number;
  correctAnswer: number;
  explanation?: string;
  createdAt: string;
}

export const mistakeVaultApi = {
  /**
   * Lấy danh sách các câu hỏi trắc nghiệm đã làm sai (Mistake Vault)
   */
  async getMistakes(): Promise<QuizMistakeItem[]> {
    try {
      const response = await apiClient.get<QuizMistakeItem[]>('/quizzes/mistakes');
      return response.data;
    } catch {
      return [];
    }
  },

  /**
   * Xóa câu hỏi sai khỏi kho (khi học sinh ôn luyện lại thành công)
   */
  async removeMistake(questionId: number): Promise<boolean> {
    try {
      await apiClient.delete(`/quizzes/mistakes/${questionId}`);
      return true;
    } catch {
      return true;
    }
  },
};
