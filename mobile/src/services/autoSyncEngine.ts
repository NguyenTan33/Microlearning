import NetInfo, { NetInfoState } from '@react-native-community/netinfo';
import { AppState, AppStateStatus } from 'react-native';
import { outboxRepository } from '../db/repositories/outboxRepository';
import { syncMetaRepository } from '../db/repositories/syncMetaRepository';
import { catalogRepository } from '../db/repositories/catalogRepository';
import { progressRepository } from '../db/repositories/progressRepository';
import { quizRepository } from '../db/repositories/quizRepository';
import { syncApi } from './syncApi';
import { catalogApi } from './catalogApi';
import { getOrCreateDeviceId } from '../utils/deviceHelper';
import { generateGuid } from '../utils/guidHelper';
import { downloadManager } from './downloadManager';
import { mediaCleanupService } from './mediaCleanupService';
import type { SyncOperationItem } from '../types/offline.types';

export interface SyncStatusListener {
  (status: { isSyncing: boolean; outboxCount: number; lastSyncTime: string | null }): void;
}

class AutoSyncEngine {
  private isSyncing = false;
  private debounceTimer: ReturnType<typeof setTimeout> | null = null;
  private heartbeatInterval: ReturnType<typeof setInterval> | null = null;
  private listeners: Set<SyncStatusListener> = new Set();
  private isOnline = true;

  /**
   * Đăng ký nhận thông báo thay đổi trạng thái đồng bộ
   */
  public subscribe(listener: SyncStatusListener): () => void {
    this.listeners.add(listener);
    this.notifyStatus();
    return () => this.listeners.delete(listener);
  }

  private async notifyStatus(): Promise<void> {
    const outboxCount = await outboxRepository.countPending();
    const lastSyncTime = await syncMetaRepository.getLastSyncTime();
    this.listeners.forEach((listener) => {
      listener({
        isSyncing: this.isSyncing,
        outboxCount,
        lastSyncTime,
      });
    });
  }

  /**
   * Khởi tạo các trình lắng nghe tự động (NetInfo, AppState, Heartbeat)
   */
  public initAutoSyncListeners(): void {
    // 1. Trigger 1: Lắng nghe phục hồi kết nối mạng (Wi-Fi / 4G)
    NetInfo.addEventListener((state: NetInfoState) => {
      const reachable = Boolean(state.isConnected && state.isInternetReachable !== false);
      this.isOnline = reachable;
      if (reachable) {
        // Đợi 2 giây để mạng ổn định rồi tự động đồng bộ ngầm
        this.triggerSyncWithDebounce(2000);
      }
    });

    // 2. Trigger 2: Lắng nghe vòng đời App Resume
    AppState.addEventListener('change', (nextAppState: AppStateStatus) => {
      if (nextAppState === 'active') {
        this.triggerSyncWithDebounce(500);
        // Chạy kèm dịch vụ dọn dẹp video 7 ngày
        mediaCleanupService.runCleanupIfNeeded();
      }
    });

    // 3. Trigger 4: Heartbeat định kỳ mỗi 3 phút khi online
    if (this.heartbeatInterval) clearInterval(this.heartbeatInterval);
    this.heartbeatInterval = setInterval(() => {
      if (this.isOnline) {
        this.executeSyncPipeline().catch(() => {});
      }
    }, 3 * 60 * 1000);
  }

  /**
   * Kích hoạt đồng bộ có Debounce để chống giật mạng
   */
  public triggerSyncWithDebounce(delayMs = 1500): void {
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
    }
    this.debounceTimer = setTimeout(() => {
      this.executeSyncPipeline().catch((err) => {
        console.warn('[AutoSync] Lỗi tiến trình đồng bộ ngầm:', err);
      });
    }, delayMs);
  }

  /**
   * Tiến trình đồng bộ 2 chiều (ACID Batch Push & Delta Pull)
   */
  public async executeSyncPipeline(): Promise<void> {
    if (this.isSyncing) return;
    this.isSyncing = true;
    await this.notifyStatus();

    try {
      const net = await NetInfo.fetch();
      if (!net.isConnected) return;

      const deviceId = await getOrCreateDeviceId();

      // ==========================================
      // PHA 1: PUSH BATCH TỪ OUTBOX LÊN SERVER
      // ==========================================
      const pendingOps = await outboxRepository.getPendingOperations(50);
      if (pendingOps.length > 0) {
        try {
          const pushResponse = await syncApi.pushBatch({
            deviceId,
            operations: pendingOps,
          });

          if (pushResponse.acceptedOperationIds && pushResponse.acceptedOperationIds.length > 0) {
            await outboxRepository.removeAcceptedOperations(pushResponse.acceptedOperationIds);
          }
        } catch (pushError) {
          console.warn('[AutoSync] Lỗi Push Batch Outbox:', pushError);
        }
      }

      // ==========================================
      // PHA 2: PULL DELTA SYNC VI SAI TỪ SERVER
      // ==========================================
      const currentSeq = await syncMetaRepository.getCheckpointSequence();
      try {
        const pullResponse = await syncApi.pullDelta(currentSeq, 50);

        if (pullResponse.changes && pullResponse.changes.length > 0) {
          for (const change of pullResponse.changes) {
            if (change.changeType === 'Deleted') {
              // Xóa bài học trong SQLite và gỡ video vật lý nếu có
              if (change.entityType === 'Lesson') {
                await catalogRepository.deleteLesson(change.entityId);
                await downloadManager.deleteOfflineVideo(change.entityId);
              }
            }
          }

          await syncMetaRepository.setCheckpointSequence(pullResponse.newCheckpointSequence);
        }

        const now = new Date().toISOString();
        await syncMetaRepository.setLastSyncTime(now);
      } catch (pullError) {
        console.warn('[AutoSync] Lỗi Pull Delta Sync:', pullError);
      }
    } finally {
      this.isSyncing = false;
      await this.notifyStatus();
    }
  }

  /**
   * Ghi nhận tiến độ học bài thông minh:
   * Cập nhật tức thì vào SQLite; nếu có mạng gửi API; nếu mất mạng ghi vào Outbox.
   */
  public async recordLessonProgress(
    lessonId: number,
    watchedSeconds: number,
    totalDurationSeconds: number
  ): Promise<void> {
    const percent =
      totalDurationSeconds > 0
        ? Math.min(100, (watchedSeconds / totalDurationSeconds) * 100)
        : 0;

    // 1. Cập nhật tức thì vào SQLite với Monotonic Merge
    await progressRepository.upsertProgress(lessonId, watchedSeconds, percent);

    const clientOperationId = generateGuid();
    const payload = {
      lessonId,
      watchedSeconds: Math.round(watchedSeconds),
      totalDurationSeconds,
      percent: Number(percent.toFixed(1)),
    };

    // 2. Kiểm tra nếu có mạng -> Bắn API trực tiếp
    const net = await NetInfo.fetch();
    if (net.isConnected && net.isInternetReachable !== false) {
      try {
        await catalogApi.sendProgressEvent(lessonId, watchedSeconds, totalDurationSeconds);
        await progressRepository.markClean(lessonId);
        return;
      } catch {
        // Thất bại mạng -> Fallback ghi vào Outbox
      }
    }

    // 3. Fallback ghi vào Outbox để đồng bộ ngầm khi có mạng lại
    const outboxItem: SyncOperationItem = {
      clientOperationId,
      operationType: 'LESSON_PROGRESS',
      entityType: 'Lesson',
      entityId: lessonId,
      payloadJson: JSON.stringify(payload),
      createdAt: new Date().toISOString(),
    };
    await outboxRepository.addOperation(outboxItem);
    await this.notifyStatus();
  }

  /**
   * Nộp bài thi trắc nghiệm thông minh:
   * Lưu cục bộ, nếu có mạng gửi API; nếu mất mạng ghi vào Outbox kèm clientAttemptId (GUID).
   */
  public async submitQuizAttempt(
    quizId: number,
    lessonId: number,
    score: number,
    isPassed: boolean,
    answers: Array<{ questionId: number; selectedOptionIds: number[] }>
  ): Promise<{ clientAttemptId: string; isSyncedOnline: boolean }> {
    const clientAttemptId = generateGuid();
    const now = new Date().toISOString();

    // 1. Lưu kết quả thi vào SQLite
    await quizRepository.saveAttempt({
      clientAttemptId,
      quizId,
      lessonId,
      score,
      isPassed: isPassed ? 1 : 0,
      submittedAt: now,
      answersJson: JSON.stringify(answers),
      syncStatus: 'PENDING',
    });

    const net = await NetInfo.fetch();
    let isSyncedOnline = false;

    // 2. Thử nộp trực tuyến nếu đang có mạng
    if (net.isConnected && net.isInternetReachable !== false) {
      try {
        await catalogApi.submitQuizAttempt({
          quizId,
          clientAttemptId,
          startedAt: now,
          answers,
        });
        await quizRepository.markAttemptSynced(clientAttemptId);
        isSyncedOnline = true;
      } catch {
        isSyncedOnline = false;
      }
    }

    // 3. Nếu chưa sync được trực tuyến, đưa vào Outbox
    if (!isSyncedOnline) {
      const outboxItem: SyncOperationItem = {
        clientOperationId: clientAttemptId,
        operationType: 'QUIZ_ATTEMPT',
        entityType: 'Quiz',
        entityId: quizId,
        payloadJson: JSON.stringify({
          clientAttemptId,
          quizId,
          lessonId,
          startedAt: now,
          answers,
        }),
        createdAt: now,
      };
      await outboxRepository.addOperation(outboxItem);
    }

    await this.notifyStatus();
    return { clientAttemptId, isSyncedOnline };
  }
}

export const autoSyncEngine = new AutoSyncEngine();
