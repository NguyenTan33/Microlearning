// Types cho Kiến trúc Offline-First, SQLite Schema & Động cơ Tự động Đồng bộ

export type SyncOperationType = 'LESSON_PROGRESS' | 'QUIZ_ATTEMPT';

export interface SyncOperationItem {
  clientOperationId: string; // GUID v4
  operationType: SyncOperationType;
  entityType?: 'Lesson' | 'Quiz';
  entityId?: number;
  payloadJson: string;
  createdAt: string;
}

export interface SyncPushRequest {
  deviceId: string;
  operations: SyncOperationItem[];
}

export interface SyncPushResultItem {
  clientOperationId: string;
  success: boolean;
  message: string;
}

export interface SyncPushResponse {
  acceptedOperationIds: string[];
  results: SyncPushResultItem[];
  processedAt: string;
}

export interface ContentChangeItemDto {
  sequence: number;
  entityType: 'Lesson' | 'Course' | string;
  entityId: number;
  changeType: 'Created' | 'Updated' | 'Deleted' | string;
  version: number;
  changedAt: string;
  payload: Record<string, unknown> | null;
}

export interface SyncPullResponse {
  currentCheckpointSequence: number;
  newCheckpointSequence: number;
  hasMoreChanges: boolean;
  changes: ContentChangeItemDto[];
}

// Bảng DownloadedMedia trong SQLite
export type DownloadStatus = 'PENDING' | 'DOWNLOADING' | 'DOWNLOADED' | 'FAILED';

export interface DownloadedMediaRecord {
  mediaId: number;
  lessonId: number;
  fileName: string;
  localPath: string;
  fileSizeBytes: number;
  checksum: string;
  downloadedAt: string;
  lastPlayedAt: string;
  isPinned: number; // 0 = False, 1 = True
  status: DownloadStatus;
}

// Bảng LocalLessonProgress trong SQLite
export interface LocalLessonProgressRecord {
  lessonId: number;
  watchedSeconds: number;
  percent: number;
  isCompleted: number; // 0 = False, 1 = True
  completedAt: string | null;
  lastPlayedAt: string;
  isDirty: number; // 1 = Chưa đẩy lên server
}

// Bảng LocalQuizAttempts trong SQLite
export interface LocalQuizAttemptRecord {
  clientAttemptId: string; // GUID v4
  quizId: number;
  lessonId: number;
  score: number;
  isPassed: number; // 0 = False, 1 = True
  submittedAt: string;
  answersJson: string;
  syncStatus: 'PENDING' | 'SYNCED';
}
