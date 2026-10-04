import type { OfflineVideoRecord, SyncOperationItem } from '../types/offline.types';

const DB_NAME = 'MicroLearn_OfflineDB';
const DB_VERSION = 1;

const STORES = {
  OUTBOX: 'sync_outbox',
  VIDEOS: 'offline_videos',
  CONTENT: 'offline_content',
  META: 'sync_meta',
} as const;

let dbInstance: IDBDatabase | null = null;

export async function getDb(): Promise<IDBDatabase> {
  if (dbInstance) return dbInstance;

  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;

      // 1. Store hàng đợi Outbox (Lưu thao tác tiến độ học, nộp bài quiz khi offline)
      if (!db.objectStoreNames.contains(STORES.OUTBOX)) {
        const outboxStore = db.createObjectStore(STORES.OUTBOX, { keyPath: 'clientOperationId' });
        outboxStore.createIndex('createdAt', 'createdAt', { unique: false });
        outboxStore.createIndex('operationType', 'operationType', { unique: false });
      }

      // 2. Store lưu tệp video Blob đã tải về và kiểm tra SHA-256
      if (!db.objectStoreNames.contains(STORES.VIDEOS)) {
        db.createObjectStore(STORES.VIDEOS, { keyPath: 'mediaId' });
      }

      // 3. Store lưu danh mục bài học/khóa học được kéo về từ Delta Sync Pull
      if (!db.objectStoreNames.contains(STORES.CONTENT)) {
        db.createObjectStore(STORES.CONTENT, { keyPath: 'id' });
      }

      // 4. Store lưu thông tin mốc checkpointSequence và metadata
      if (!db.objectStoreNames.contains(STORES.META)) {
        db.createObjectStore(STORES.META, { keyPath: 'key' });
      }
    };

    request.onsuccess = () => {
      dbInstance = request.result;
      resolve(request.result);
    };

    request.onerror = () => {
      reject(new Error(`Không thể mở IndexedDB: ${request.error?.message}`));
    };
  });
}

// ==========================================
// 1. OUTBOX QUEUE OPERATIONS
// ==========================================

export async function addOutboxItem(item: SyncOperationItem): Promise<void> {
  const db = await getDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORES.OUTBOX, 'readwrite');
    const store = tx.objectStore(STORES.OUTBOX);
    const req = store.put(item);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

export async function getAllOutboxItems(): Promise<SyncOperationItem[]> {
  const db = await getDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORES.OUTBOX, 'readonly');
    const store = tx.objectStore(STORES.OUTBOX);
    const req = store.getAll();
    req.onsuccess = () => resolve(req.result || []);
    req.onerror = () => reject(req.error);
  });
}

export async function removeOutboxItems(operationIds: string[]): Promise<void> {
  const db = await getDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORES.OUTBOX, 'readwrite');
    const store = tx.objectStore(STORES.OUTBOX);

    for (const id of operationIds) {
      store.delete(id);
    }

    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function getOutboxCount(): Promise<number> {
  const db = await getDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORES.OUTBOX, 'readonly');
    const store = tx.objectStore(STORES.OUTBOX);
    const req = store.count();
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

// ==========================================
// 2. OFFLINE VIDEO STORAGE OPERATIONS
// ==========================================

export async function saveOfflineVideo(record: OfflineVideoRecord): Promise<void> {
  const db = await getDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORES.VIDEOS, 'readwrite');
    const store = tx.objectStore(STORES.VIDEOS);
    const req = store.put(record);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

export async function getOfflineVideo(mediaId: number): Promise<OfflineVideoRecord | null> {
  const db = await getDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORES.VIDEOS, 'readonly');
    const store = tx.objectStore(STORES.VIDEOS);
    const req = store.get(mediaId);
    req.onsuccess = () => resolve(req.result || null);
    req.onerror = () => reject(req.error);
  });
}

export async function deleteOfflineVideo(mediaId: number): Promise<void> {
  const db = await getDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORES.VIDEOS, 'readwrite');
    const store = tx.objectStore(STORES.VIDEOS);
    const req = store.delete(mediaId);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

export async function getAllOfflineVideos(): Promise<OfflineVideoRecord[]> {
  const db = await getDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORES.VIDEOS, 'readonly');
    const store = tx.objectStore(STORES.VIDEOS);
    const req = store.getAll();
    req.onsuccess = () => resolve(req.result || []);
    req.onerror = () => reject(req.error);
  });
}

// ==========================================
// 3. OFFLINE CONTENT CACHE (DELTA SYNC)
// ==========================================

export interface CachedContentItem {
  id: string; // e.g. "Lesson_1" or "Course_1"
  entityType: string;
  entityId: number;
  payload: unknown;
  version: number;
  updatedAt: string;
}

export async function saveOfflineContent(item: CachedContentItem): Promise<void> {
  const db = await getDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORES.CONTENT, 'readwrite');
    const store = tx.objectStore(STORES.CONTENT);
    const req = store.put(item);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

export async function getAllOfflineContent(): Promise<CachedContentItem[]> {
  const db = await getDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORES.CONTENT, 'readonly');
    const store = tx.objectStore(STORES.CONTENT);
    const req = store.getAll();
    req.onsuccess = () => resolve(req.result || []);
    req.onerror = () => reject(req.error);
  });
}

export async function saveOfflineLessonPackage(lessonId: number, pkg: unknown): Promise<void> {
  await saveOfflineContent({
    id: `LessonPackage_${lessonId}`,
    entityType: 'LessonPackage',
    entityId: lessonId,
    payload: pkg,
    version: 1,
    updatedAt: new Date().toISOString(),
  });
}

export async function getOfflineLessonPackage(lessonId: number): Promise<unknown | null> {
  const db = await getDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORES.CONTENT, 'readonly');
    const store = tx.objectStore(STORES.CONTENT);
    const req = store.get(`LessonPackage_${lessonId}`);
    req.onsuccess = () => resolve(req.result?.payload || null);
    req.onerror = () => reject(req.error);
  });
}

// ==========================================
// 4. METADATA (SEQUENCE CHECKPOINT)
// ==========================================

export async function getCheckpointSequence(): Promise<number> {
  const db = await getDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORES.META, 'readonly');
    const store = tx.objectStore(STORES.META);
    const req = store.get('checkpointSequence');
    req.onsuccess = () => resolve(req.result ? req.result.value : 0);
    req.onerror = () => reject(req.error);
  });
}

export async function setCheckpointSequence(seq: number): Promise<void> {
  const db = await getDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORES.META, 'readwrite');
    const store = tx.objectStore(STORES.META);
    const req = store.put({ key: 'checkpointSequence', value: seq, updatedAt: new Date().toISOString() });
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}
