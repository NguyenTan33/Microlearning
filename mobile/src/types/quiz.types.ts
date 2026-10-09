export interface QuizOption {
  id: number;
  questionId: number;
  optionText: string;
  sortOrder: number;
}

export interface QuizQuestion {
  id: number;
  quizId: number;
  questionText: string;
  explanation?: string;
  sortOrder: number;
  options: QuizOption[];
}

export interface QuizPackage {
  quizId: number;
  lessonId: number;
  title: string;
  passScore: number;
  version: number;
  questions: QuizQuestion[];
}

export interface QuizAnswerItem {
  questionId: number;
  selectedOptionIds: number[];
}

export interface QuizSubmitRequest {
  clientAttemptId: string;
  quizId: number;
  lessonId: number;
  answers: QuizAnswerItem[];
}

export interface QuizSubmitResponse {
  clientAttemptId: string;
  score: number;
  isPassed: boolean;
  correctAnswersCount: number;
  totalQuestionsCount: number;
  message?: string;
}

export interface UserQuizMistake {
  id: number;
  questionId: number;
  questionText: string;
  lessonId: number;
  lessonTitle: string;
  wrongCount: number;
  lastAttemptAt: string;
  options: QuizOption[];
}
