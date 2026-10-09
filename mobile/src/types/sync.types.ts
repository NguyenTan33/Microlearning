export interface SyncOutboxItem {
  clientOperationId: string;
  operationType: 'LESSON_PROGRESS' | 'QUIZ_ATTEMPT';
  entityType: 'Lesson' | 'Quiz';
  entityId: number;
  payloadJson: string;
  createdAt: string;
  retryCount: number;
  lastError?: string;
  status: 'PENDING' | 'SENDING' | 'FAILED';
}

export interface SyncPushBatchRequest {
  deviceId: string;
  operations: SyncOutboxItem[];
}

export interface SyncPushBatchResponse {
  acceptedOperationIds: string[];
  failedOperations?: { clientOperationId: string; reason: string }[];
}

export interface SyncPullResponse {
  serverSequence: number;
  newCheckpointSequence?: number;
  currentCheckpointSequence?: number;
  hasMoreChanges?: boolean;
  changes: {
    entityType: string;
    entityId: number;
    action: 'CREATE' | 'UPDATE' | 'DELETE' | string;
    dataJson: string;
  }[];
}

export interface DownloadedMediaItem {
  mediaId: number;
  lessonId: number;
  fileName: string;
  localPath: string;
  fileSizeBytes: number;
  checksum: string;
  downloadedAt: string;
  lastPlayedAt: string;
  isPinned: number; // 0 | 1
  status: 'PENDING' | 'DOWNLOADING' | 'DOWNLOADED' | 'FAILED';
}
