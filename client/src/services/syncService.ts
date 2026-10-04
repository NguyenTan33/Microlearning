import type {
  SyncOperationItem,
  SyncPushRequest,
  SyncPushResponse,
  SyncPullResponse,
  HealthCheckResponse,
} from '../types/offline.types';
import { getOrCreateDeviceId } from './deviceService';
import {
  addOutboxItem,
  getAllOutboxItems,
  removeOutboxItems,
  getOutboxCount,
  getCheckpointSequence,
  setCheckpointSequence,
  saveOfflineContent,
} from './indexedDbService';

function generateGuid(): string {
  if (typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

/**
 * Ghi nhận tiến độ xem video vào Outbox (kể cả khi mất mạng).
 */
export async function queueLessonProgress(
  lessonId: number,
  watchedSeconds: number,
  percent: number
): Promise<string> {
  const clientOperationId = generateGuid();
  const payload = {
    lessonId,
    watchedSeconds: Math.round(watchedSeconds),
    percent: Number(percent.toFixed(1)),
  };

  const item: SyncOperationItem = {
    clientOperationId,
    operationType: 'LESSON_PROGRESS',
    payloadJson: JSON.stringify(payload),
    createdAt: new Date().toISOString(),
  };

  await addOutboxItem(item);
  return clientOperationId;
}

/**
 * Ghi nhận bài nộp Quiz vào Outbox (kể cả khi mất mạng).
 */
export async function queueQuizAttempt(
  quizId: number,
  answers: Array<{ questionId: number; selectedOptionId: number }>
): Promise<string> {
  const clientAttemptId = generateGuid();
  const payload = {
    clientAttemptId,
    quizId,
    answers,
  };

  const item: SyncOperationItem = {
    clientOperationId: clientAttemptId,
    operationType: 'QUIZ_ATTEMPT',
    payloadJson: JSON.stringify(payload),
    createdAt: new Date().toISOString(),
  };

  await addOutboxItem(item);
  return clientAttemptId;
}

/**
 * Đẩy các tác vụ đang chờ trong Outbox lên Server (Sync Push).
 */
export async function pushSyncBatch(): Promise<SyncPushResponse | null> {
  const token = localStorage.getItem('accessToken');
  if (!token) return null;

  const pendingItems = await getAllOutboxItems();
  if (pendingItems.length === 0) {
    return null;
  }

  const deviceId = getOrCreateDeviceId();
  const payload: SyncPushRequest = {
    deviceId,
    operations: pendingItems,
  };

  const response = await fetch('/api/sync/push', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const errorMsg = await response.text();
    throw new Error(`Đồng bộ Push thất bại (${response.status}): ${errorMsg}`);
  }

  const result: SyncPushResponse = await response.json();

  // Giải phóng bộ nhớ: Xóa các thao tác đã được Server tiếp nhận thành công khỏi Outbox
  if (result.acceptedOperationIds && result.acceptedOperationIds.length > 0) {
    await removeOutboxItems(result.acceptedOperationIds);
  }

  return result;
}

/**
 * Kéo các thay đổi vi sai mới nhất từ Server về máy (Delta Sync Pull).
 */
export async function pullDeltaSync(limit = 50): Promise<SyncPullResponse | null> {
  const token = localStorage.getItem('accessToken');
  if (!token) return null;

  const currentSeq = await getCheckpointSequence();

  const response = await fetch(`/api/sync/pull?afterSequence=${currentSeq}&limit=${limit}`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    const errorMsg = await response.text();
    throw new Error(`Đồng bộ Pull thất bại (${response.status}): ${errorMsg}`);
  }

  const result: SyncPullResponse = await response.json();

  // Lưu các nội dung thay đổi vào IndexedDB
  if (result.changes && result.changes.length > 0) {
    for (const change of result.changes) {
      await saveOfflineContent({
        id: `${change.entityType}_${change.entityId}`,
        entityType: change.entityType,
        entityId: change.entityId,
        payload: change.payload,
        version: change.version,
        updatedAt: change.changedAt,
      });
    }

    // Cập nhật mốc Sequence Checkpoint mới
    await setCheckpointSequence(result.newCheckpointSequence);
  }

  return result;
}

/**
 * Kiểm tra trạng thái sức khỏe của Server Backend (Health Check API).
 */
export async function checkServerHealth(): Promise<HealthCheckResponse | null> {
  try {
    const res = await fetch('/api/health');
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

/**
 * Lấy số lượng tác vụ đang còn tồn đọng trong Outbox.
 */
export async function getPendingOutboxCount(): Promise<number> {
  return await getOutboxCount();
}
