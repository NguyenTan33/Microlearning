export interface Course {
  id: number;
  title: string;
  description?: string;
  thumbnailUrl?: string;
  version: number;
  isPublished: boolean;
  isPrivate?: boolean;
  hasAccess?: boolean;
  createdAt: string;
  updatedAt?: string;
  totalSubjects: number;
  authorName?: string;
  createdByAccountId?: string;
  canEdit?: boolean;
}

export interface CourseDetail extends Course {
  subjects: Subject[];
}

export interface LessonAttachment {
  id: number;
  lessonId: number;
  fileName: string;
  originalFileName: string;
  fileType: 'PDF' | 'WORD';
  fileUrl: string;
  fileSizeBytes: number;
  sha256Checksum: string;
  createdAt: string;
}

export interface Subject {
  id: number;
  courseId: number;
  title: string;
  description?: string;
  sortOrder: number;
  createdAt: string;
  updatedAt?: string;
  totalLessons: number;
  lessons?: Lesson[];
}

export interface Lesson {
  id: number;
  subjectId: number;
  title: string;
  description?: string;
  durationSeconds: number;
  sortOrder: number;
  version: number;
  isPublished: boolean;
  createdAt: string;
  updatedAt?: string;
  hasQuiz: boolean;
  mediaAssetCount: number;
  videoUrl?: string | null;
  slideUrl?: string | null;
  slideType?: string | null;
  quizCount?: number;
}

export interface QuizSummary {
  id: number;
  lessonId: number;
  title: string;
  passScore: number;
  version: number;
  questionCount: number;
  bestScore?: number | null;
  isPassed?: boolean;
  attemptsCount?: number;
}

export interface LessonPackageMediaAsset {
  id: number;
  type: number;
  fileName: string;
  blobKey: string;
  sizeBytes: number;
  checksum?: string;
  durationSeconds?: number;
  status: number;
}

export interface LessonPackageOption {
  id: number;
  optionText: string;
  sortOrder: number;
}

export interface LessonPackageQuestion {
  id: number;
  content: string;
  explanation?: string;
  points: number;
  sortOrder: number;
  questionType: number;
  options: LessonPackageOption[];
}

export interface LessonPackageQuiz {
  id: number;
  title: string;
  passScore: number;
  version: number;
  questions: LessonPackageQuestion[];
}

export interface LessonPackageResponse {
  lessonId: number;
  subjectId: number;
  title: string;
  description?: string;
  durationSeconds: number;
  sortOrder: number;
  version: number;
  mediaAssets: LessonPackageMediaAsset[];
  quiz?: LessonPackageQuiz;
}

export interface Enrollment {
  id: number;
  accountId: string;
  courseId: number;
  courseTitle: string;
  courseThumbnail?: string;
  status: number;
  enrolledAt: string;
  overallProgressPercent: number;
  completedLessons?: number;
  totalLessons?: number;
}

export interface LessonProgress {
  lessonId: number;
  watchedSeconds: number;
  percent: number;
  isCompleted: boolean;
  completedAt?: string;
  lastPlayedAt: string;
}

export interface CourseProgress {
  courseId: number;
  overallPercent: number;
  completedLessons: number;
  totalLessons: number;
}

export interface QuizOption {
  id: number;
  optionText: string;
  sortOrder: number;
  isCorrect?: boolean;
}

export interface QuizQuestion {
  id: number;
  content: string;
  explanation?: string;
  points: number;
  sortOrder: number;
  questionType: number;
  options: QuizOption[];
}

export interface QuizDetail {
  id: number;
  lessonId: number;
  title: string;
  passScore: number;
  version: number;
  questions: QuizQuestion[];
}

export interface SubmitAnswerItem {
  questionId: number;
  selectedOptionIds: number[];
}

export interface SubmitQuizAttemptRequest {
  clientAttemptId: string;
  quizId: number;
  startedAt: string;
  answers: SubmitAnswerItem[];
}

export interface QuizAttemptResult {
  attemptId: number;
  clientAttemptId: string;
  quizId: number;
  score: number;
  isPassed: boolean;
  isDuplicate: boolean;
  submittedAt: string;
  correctAnswersCount: number;
  totalQuestionsCount: number;
}

export interface QuizHistoryItem {
  attemptId: number;
  clientAttemptId: string;
  quizId: number;
  quizTitle: string;
  score: number;
  isPassed: boolean;
  startedAt: string;
  submittedAt: string;
  totalAnswers: number;
}

export interface TtsSynthesizeResponse {
  audioUrl: string;
  fileName: string;
  fileSizeBytes: number;
  voiceUsed: string;
  status: string;
}
