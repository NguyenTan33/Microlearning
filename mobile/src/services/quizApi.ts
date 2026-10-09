import { apiClient } from './apiClient';
import type { QuizPackage, QuizSubmitRequest, QuizSubmitResponse, UserQuizMistake } from '../types/quiz.types';

export const quizApi = {
  async getQuizPackageByLessonId(lessonId: number): Promise<QuizPackage> {
    try {
      const res = await apiClient.get<QuizPackage>(`/quizzes/lesson/${lessonId}`);
      return res.data;
    } catch {
      const res = await apiClient.get<any>(`/lessons/${lessonId}/package`);
      if (res.data && res.data.quiz) {
        return res.data.quiz;
      }
      throw new Error('Không thể tải bài thi trắc nghiệm.');
    }
  },

  async submitQuizAttempt(data: QuizSubmitRequest): Promise<QuizSubmitResponse> {
    const res = await apiClient.post<QuizSubmitResponse>('/quizzes/attempts', data);
    return res.data;
  },

  async getMistakeVault(): Promise<UserQuizMistake[]> {
    try {
      const res = await apiClient.get<UserQuizMistake[]>('/quizzes/mistakes');
      return res.data;
    } catch {
      return [];
    }
  },
};
