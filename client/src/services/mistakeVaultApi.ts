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
  courseId: number;
  courseTitle: string;
  subjectTitle: string;
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
  subjectTitle: string;
  totalMistakes: number;
  unresolvedCount: number;
  mistakes: QuizMistakeItem[];
}

export interface CourseMistakeGroup {
  courseId: number;
  courseTitle: string;
  totalMistakes: number;
  unresolvedCount: number;
  lessons: LessonMistakeGroup[];
}

export interface QuizPracticeSession {
  totalMistakes: number;
  mistakes: QuizMistakeItem[];
  currentLessonId?: number | null;
  currentLessonTitle?: string | null;
  currentCourseId?: number | null;
  currentCourseTitle?: string | null;
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
   * Lấy danh sách Sổ câu sai phân cấp theo Khóa học -> Bài học
   */
  async getGroupedMistakes(includeResolved = false): Promise<CourseMistakeGroup[]> {
    try {
      const res = await fetch(`/api/quiz/mistakes/grouped?includeResolved=${includeResolved}`, {
        headers: getAuthHeaders(),
      });
      return await handleResponse<CourseMistakeGroup[]>(res);
    } catch {
      return [];
    }
  },

  /**
   * Tạo phiên ôn luyện các câu làm sai (hỗ trợ lọc theo bài học hoặc khóa học cụ thể)
   */
  async generatePracticeSession(lessonId?: number, courseId?: number): Promise<QuizPracticeSession> {
    try {
      const params = new URLSearchParams();
      if (lessonId) params.append('lessonId', lessonId.toString());
      if (courseId) params.append('courseId', courseId.toString());
      const queryString = params.toString();
      const url = `/api/quiz/mistakes/practice${queryString ? `?${queryString}` : ''}`;
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
