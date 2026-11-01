export interface LessonAttachment {
  id: number;
  lessonId: number;
  fileName: string;
  originalFileName?: string;
  fileUrl: string;
  fileSizeBytes: number;
  fileType: string;
}

export interface Lesson {
  id: number;
  subjectId: number;
  title: string;
  description?: string;
  durationSeconds: number;
  videoUrl?: string;
  slideUrl?: string;
  slideType?: string;
  audioTtsUrl?: string;
  sortOrder: number;
  version: number;
  isPublished: boolean;
  hasQuiz: boolean;
  mediaAssetCount: number;
  attachments?: LessonAttachment[];
}

export interface Subject {
  id: number;
  courseId: number;
  title: string;
  description?: string;
  sortOrder: number;
  totalLessons: number;
  lessons?: Lesson[];
}

export interface Course {
  id: number;
  title: string;
  description?: string;
  thumbnailUrl?: string;
  category?: string;
  authorName?: string;
  createdByAccountId?: string;
  canEdit?: boolean;
  isPublished: boolean;
  isPrivate?: boolean;
  version?: number;
  totalSubjects: number;
  isEnrolled?: boolean;
  isLocked?: boolean;
}

export interface CourseDetail extends Course {
  subjects: Subject[];
}

export type { QuizQuestion, QuizOption } from './quiz.types';
