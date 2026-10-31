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

export interface LessonMistakeGroup {
  lessonId: number;
  lessonTitle: string;
  courseId: number;
  courseTitle: string;
  totalMistakes: number;
  unresolvedMistakes: number;
  mistakes: QuizMistakeItem[];
}

export interface CourseMistakeGroup {
  courseId: number;
  courseTitle: string;
  subjectTitle: string;
  totalMistakes: number;
  unresolvedMistakes: number;
  lessons: LessonMistakeGroup[];
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
   * Lấy danh sách câu hỏi làm sai phân cấp theo Khóa học -> Bài học
   */
  async getGroupedMistakes(includeResolved = false): Promise<CourseMistakeGroup[]> {
    try {
      const res = await apiClient.get<CourseMistakeGroup[]>(
        `/api/quiz/mistakes/grouped?includeResolved=${includeResolved}`
      );
      return Array.isArray(res.data) ? res.data : [];
    } catch {
      return [];
    }
  },

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
   * Tạo phiên ôn luyện các câu làm sai (hỗ trợ lọc theo bài học / khóa học)
   */
  async generatePracticeSession(lessonId?: number, courseId?: number): Promise<QuizPracticeSession> {
    try {
      const params = new URLSearchParams();
      if (lessonId) params.append('lessonId', lessonId.toString());
      if (courseId) params.append('courseId', courseId.toString());
      const query = params.toString() ? `?${params.toString()}` : '';

      const res = await apiClient.get<QuizPracticeSession>(`/api/quiz/mistakes/practice${query}`);
      return res.data;
    } catch {
      return { totalMistakes: 0, mistakes: [] };
    }
  },

  /**
   * Trả lời câu hỏi trong phiên ôn tập
   */
  async answerMistakeQuestion(
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
