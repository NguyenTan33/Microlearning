// Types cho Khóa học, Môn học, Bài học, Video Media và Quiz

export interface Course {
  id: number;
  title: string;
  description: string;
  thumbnailUrl: string;
  version: number;
  isPublished: boolean;
  totalSubjects: number;
}

export interface Subject {
  id: number;
  courseId: number;
  title: string;
  description: string;
  sortOrder: number;
  totalLessons: number;
  lessons?: Lesson[];
}

export interface MediaAsset {
  id: number;
  type: number; // 1 = Video, 2 = Audio
  fileName: string;
  blobKey: string;
  sizeBytes: number;
  checksum: string; // Mã SHA-256 từ Server để đối soát
  durationSeconds: number;
  status: number; // 1 = Uploaded, 2 = Processing, 3 = Ready
  downloadUrl?: string;
  streamUrl?: string;
}

export interface LessonMediaInfo {
  lessonId: number;
  mediaId: number | null;
  sourceType: string; // 'azure' | 'direct_url' | 'youtube' | 'vimeo' | 'demo'
  streamUrl: string | null;
  externalUrl: string | null;
  embedUrl: string | null;
  contentType: string;
  fileSizeBytes: number;
}

export interface Lesson {
  id: number;
  subjectId: number;
  title: string;
  description: string;
  durationSeconds: number;
  sortOrder: number;
  version: number;
  isPublished: boolean;
  hasQuiz: boolean;
  mediaAssetCount: number;
  mediaAssets?: MediaAsset[];
}

export interface CourseDetail extends Course {
  subjects: Subject[];
}

export interface QuizOption {
  id: number;
  optionText: string;
  sortOrder: number;
}

export interface QuizQuestion {
  id: number;
  content: string;
  points: number;
  sortOrder: number;
  questionType: number; // 1 = Single Choice, 2 = Multiple Choice
  options: QuizOption[];
}

export interface QuizPackage {
  id: number;
  title: string;
  passScore: number;
  version: number;
  questions: QuizQuestion[];
}

export interface LessonPackage {
  lessonId: number;
  subjectId: number;
  title: string;
  description: string;
  durationSeconds: number;
  sortOrder: number;
  version: number;
  mediaAssets: MediaAsset[];
  quiz?: QuizPackage;
}

export interface SubmitQuizAttemptRequest {
  quizId: number;
  clientAttemptId: string; // GUID v4
  startedAt: string;
  answers: Array<{
    questionId: number;
    selectedOptionIds: number[];
  }>;
}

export interface SubmitQuizAttemptResponse {
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
