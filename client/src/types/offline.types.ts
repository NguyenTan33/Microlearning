// Định nghĩa kiểu dữ liệu cho kiến trúc Offline-First (Khớp 100% với Backend trong Report)

export type DevicePlatform = 1 | 2; // 1 = Android, 2 = iOS (Web tạm gửi 1 theo hướng dẫn)

export interface RegisterDeviceRequest {
  deviceId: string;
  platform: DevicePlatform;
  deviceModel: string;
  osVersion: string;
}

export interface DeviceResponse {
  id: number;
  deviceId: string;
  platform: string;
  deviceModel: string;
  osVersion: string;
  lastSyncAt: string | null;
  createdAt: string;
}

// Media & Download Manager DTOs
export interface MediaDownloadInfoResponse {
  mediaId: number;
  fileName: string;
  contentType: string;
  fileSizeBytes: number;
  checksum: string;
  downloadUrl: string;
}

export interface OfflineVideoRecord {
  mediaId: number;
  fileName: string;
  contentType: string;
  fileSizeBytes: number;
  checksum: string;
  downloadedAt: string;
  blob: Blob;
}

// Sync Engine DTOs
export type SyncOperationType = 'LESSON_PROGRESS' | 'QUIZ_ATTEMPT';

export interface SyncOperationItem {
  clientOperationId: string; // GUID
  operationType: SyncOperationType;
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

// Delta Sync Pull DTOs
export interface ContentChangePayloadLesson {
  lessonId: number;
  title: string;
  durationSeconds: number;
  isPublished: boolean;
  version: number;
}

export interface ContentChangePayloadCourse {
  courseId: number;
  title: string;
  description: string;
  isPublished: boolean;
  version: number;
}

export interface ContentChangeItemDto {
  sequence: number;
  entityType: 'Lesson' | 'Course' | string;
  entityId: number;
  changeType: 'Created' | 'Updated' | 'Deleted' | string;
  version: number;
  changedAt: string;
  payload: ContentChangePayloadLesson | ContentChangePayloadCourse | null;
}

export interface SyncPullResponse {
  currentCheckpointSequence: number;
  newCheckpointSequence: number;
  hasMoreChanges: boolean;
  changes: ContentChangeItemDto[];
}

// Health Check DTO
export interface HealthCheckResponse {
  status: 'Healthy' | 'Unhealthy' | string;
  database: boolean;
  mediaStorage: boolean;
  serverTime: string;
}
