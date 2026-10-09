import { apiClient } from './apiClient';
import type { QuizPackage, QuizSubmitRequest, QuizSubmitResponse, UserQuizMistake } from '../types/quiz.types';

export const quizApi = {
  async getQuizPackageByLessonId(lessonId: number): Promise<QuizPackage> {
    const res = await apiClient.get<QuizPackage>(`/api/quizzes/lesson/${lessonId}`);
    return res.data;
  },

  async submitQuizAttempt(data: QuizSubmitRequest): Promise<QuizSubmitResponse> {
    const res = await apiClient.post<QuizSubmitResponse>('/api/quizzes/submit', data);
    return res.data;
  },

  async getMistakeVault(): Promise<UserQuizMistake[]> {
    const res = await apiClient.get<UserQuizMistake[]>('/api/quizmistakes');
    return res.data;
  },
};
