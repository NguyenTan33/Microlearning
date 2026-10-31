import { apiClient } from './apiClient';
import type { QuizPackage, QuizSubmitRequest, QuizSubmitResponse, UserQuizMistake } from '../types/quiz.types';

function normalizeQuizPackage(data: any, fallbackLessonId: number): QuizPackage {
  const quizId = Number(data.quizId ?? data.id);
  const lessonId = Number(data.lessonId ?? fallbackLessonId);
  const questions = (data.questions || []).map((q: any, idx: number) => ({
    id: Number(q.id ?? idx + 1),
    quizId: Number(q.quizId ?? quizId),
    questionText: q.questionText ?? q.content ?? '',
    explanation: q.explanation || '',
    sortOrder: Number(q.sortOrder ?? idx + 1),
    options: (q.options || q.quizOptions || []).map((opt: any, optIdx: number) => ({
      id: Number(opt.id ?? optIdx + 1),
      questionId: Number(opt.questionId ?? q.id ?? idx + 1),
      optionText: opt.optionText ?? '',
      sortOrder: Number(opt.sortOrder ?? optIdx + 1),
    })),
  }));

  return {
    quizId,
    lessonId,
    title: data.title || 'Bài thi trắc nghiệm',
    passScore: Number(data.passScore ?? 80),
    version: Number(data.version ?? 1),
    questions,
  };
}

export const quizApi = {
  async getAllQuizzesByLesson(lessonId: number): Promise<Array<{
    id: number;
    title: string;
    passScore: number;
    totalQuestions: number;
    isCompleted?: boolean;
    highestScore?: number | null;
  }>> {
    try {
      const res = await apiClient.get<any[]>(`/api/quizzes/lesson/${lessonId}/all`);
      return Array.isArray(res.data) ? res.data : [];
    } catch {
      return [];
    }
  },

  async getQuizById(quizId: number): Promise<QuizPackage | null> {
    try {
      const res = await apiClient.get<any>(`/api/quizzes/${quizId}`);
      if (res.data) {
        return normalizeQuizPackage(res.data, res.data.lessonId || 0);
      }
      return null;
    } catch {
      return null;
    }
  },

  async getQuizPackageByLessonId(lessonId: number): Promise<QuizPackage> {
    try {
      const res = await apiClient.get<any>(`/api/quizzes/lesson/${lessonId}`);
      if (res.data) {
        return normalizeQuizPackage(res.data, lessonId);
      }
      throw new Error('Không có dữ liệu bài thi.');
    } catch {
      const res = await apiClient.get<any>(`/api/lessons/${lessonId}/package`);
      if (res.data && res.data.quiz) {
        return normalizeQuizPackage(res.data.quiz, lessonId);
      }
      throw new Error('Không thể tải bài thi trắc nghiệm.');
    }
  },

  async submitQuizAttempt(data: QuizSubmitRequest): Promise<QuizSubmitResponse> {
    const res = await apiClient.post<QuizSubmitResponse>('/api/quizzes/attempts', data);
    return res.data;
  },

  async getMistakeVault(): Promise<UserQuizMistake[]> {
    try {
      const res = await apiClient.get<UserQuizMistake[]>('/api/quizzes/mistakes');
      return res.data;
    } catch {
      return [];
    }
  },
};
