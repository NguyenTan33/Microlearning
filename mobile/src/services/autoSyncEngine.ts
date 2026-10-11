import NetInfo from '@react-native-community/netinfo';
import { AppState, AppStateStatus } from 'react-native';
import { outboxRepository } from '../db/repositories/outboxRepository';
import { progressRepository } from '../db/repositories/progressRepository';
import { syncMetaRepository } from '../db/repositories/syncMetaRepository';
import { catalogRepository } from '../db/repositories/catalogRepository';
import { syncApi } from './syncApi';
import { catalogApi } from './catalogApi';
import { progressApi } from './progressApi';
import { streakApi } from './streakApi';
import { guidHelper } from '../utils/guidHelper';
import { secureStorage } from '../utils/secureStorage';
import { STORAGE_KEYS } from '../utils/constants';

let isSyncing = false;
let syncTimer: ReturnType<typeof setTimeout> | null = null;
let isInitialized = false;

export const autoSyncEngine = {
  /**
   * Khởi động AutoSyncEngine lắng nghe sự kiện mạng (NetInfo) & App State (Foreground)
   */
  initListeners(): void {
    if (isInitialized) return;
    isInitialized = true;

    // 1. Lắng nghe sự kiện khôi phục kết nối mạng (Network Recovery Trigger)
    NetInfo.addEventListener((state) => {
      if (state.isConnected && state.isInternetReachable) {
        this.triggerSyncWithDebounce(1000);
      }
    });

    // 2. Lắng nghe vòng đời ứng dụng (App Resume Foreground Trigger)
    AppState.addEventListener('change', (nextState: AppStateStatus) => {
      if (nextState === 'active') {
        this.triggerSyncWithDebounce(1500);
      }
    });

    // 3. Heartbeat timer 30 giây (Nâng cấp từ 3 phút - đồng bộ dữ liệu ngoại tuyến tức thời)
    setInterval(() => {
      this.triggerSyncWithDebounce(0);
    }, 30 * 1000);
  },

  /**
   * Kích hoạt tiến trình đồng bộ ngầm với khoảng hoãn Debounce (chống giật chập chờn mạng)
   */
  triggerSyncWithDebounce(delayMs: number = 2000): void {
    if (syncTimer) {
      clearTimeout(syncTimer);
    }
    syncTimer = setTimeout(() => {
      this.runSyncProcess();
    }, delayMs);
  },

  /**
   * Chạy tiến trình đồng bộ 2 chiều (Push Outbox Batch + Pull Sequence Delta)
   */
  async runSyncProcess(): Promise<void> {
    if (isSyncing) return;

    try {
      const netState = await NetInfo.fetch();
      if (!netState.isConnected || !netState.isInternetReachable) {
        return;
      }

      // Chỉ đồng bộ khi người dùng đã đăng nhập và có token
      const token = await secureStorage.getItem(STORAGE_KEYS.ACCESS_TOKEN);
      if (!token) {
        return;
      }

      isSyncing = true;
      const deviceId = await guidHelper.getOrCreateDeviceId();

      // BƯỚC 1: PUSH BATCH HÀNG ĐỢI OUTBOX LÊN SERVER
      const pendingOps = await outboxRepository.getPendingItems();
      if (pendingOps.length > 0) {
        try {
          const pushResponse = await syncApi.pushBatch({
            deviceId,
            operations: pendingOps,
          });

          if (pushResponse?.acceptedOperationIds?.length > 0) {
            await outboxRepository.removeItems(pushResponse.acceptedOperationIds);
          }
        } catch (pushErr) {
          console.warn('[AutoSyncEngine] Lỗi push batch:', pushErr);
        }
      }

      // BƯỚC 2: PULL DELTA SYNC KÉO NỘI DUNG MỚI TỪ SERVER THEO CHECKPOINT
      try {
        const lastSeqStr = await syncMetaRepository.getMeta('LAST_SEQUENCE');
        const lastSeq = lastSeqStr ? parseInt(lastSeqStr, 10) : 0;

        const pullResponse = await syncApi.pullDelta(lastSeq);
        const targetSeq = pullResponse?.newCheckpointSequence ?? pullResponse?.serverSequence ?? 0;
        if (pullResponse && targetSeq > lastSeq) {
          await syncMetaRepository.saveMeta('LAST_SEQUENCE', targetSeq.toString());

          // Nếu có thay đổi danh mục khóa học -> Kéo lại catalog nạp vào SQLite
          if (pullResponse.changes && pullResponse.changes.length > 0) {
            const apiCourses = await catalogApi.getAllCourses();
            if (apiCourses.length > 0) {
              await catalogRepository.saveCourses(apiCourses);
            }
          }
        }

        // BƯỚC 3: ĐỒNG BỘ TIẾN ĐỘ TỪ WEB/SERVER VỀ SQLITE (Chống lệch tiến độ Web & Mobile)
        try {
          const completedIds = await progressApi.getCompletedLessonIds();
          if (Array.isArray(completedIds) && completedIds.length > 0) {
            for (const cId of completedIds) {
              await progressRepository.saveProgress(cId, 180, 100, true);
              await progressRepository.markClean(cId);
            }
          }
        } catch {
          // ignore progress pull error
        }
      } catch (pullErr) {
        console.warn('[AutoSyncEngine] Lỗi pull delta:', pullErr);
      }
    } catch (err) {
      console.warn('[AutoSyncEngine] Lỗi tiến trình đồng bộ:', err);
    } finally {
      isSyncing = false;
    }
  },

  /**
   * Ghi nhận tiến độ xem video bài học (Local First -> SQLite -> Push API / Outbox)
   */
  async recordLessonProgress(
    lessonId: number,
    watchedSeconds: number,
    totalDurationSeconds: number
  ): Promise<void> {
    const percent =
      totalDurationSeconds > 0 ? Math.min(100, (watchedSeconds / totalDurationSeconds) * 100) : 0;
    const isCompleted = percent >= 95 || (totalDurationSeconds > 0 && watchedSeconds >= totalDurationSeconds);

    // 1. Lưu lập tức vào SQLite LocalLessonProgress (0ms - Local First)
    await progressRepository.saveProgress(
      lessonId,
      watchedSeconds,
      percent,
      isCompleted
    );

    // Kích hoạt đồng bộ streak toàn cục nếu bài học hoàn thành
    if (isCompleted) {
      streakApi.pingStreak().catch(() => {});
    }

    // 2. Gửi API trực tiếp hoặc thêm vào Outbox nếu offline
    try {
      const netState = await NetInfo.fetch();
      if (netState.isConnected && netState.isInternetReachable) {
        await catalogApi.sendProgressEvent(lessonId, watchedSeconds, totalDurationSeconds);
        await progressRepository.markClean(lessonId);
      } else {
        await outboxRepository.addItem({
          clientOperationId: guidHelper.generateGuid(),
          operationType: 'LESSON_PROGRESS',
          entityType: 'Lesson',
          entityId: lessonId,
          payloadJson: JSON.stringify({
            lessonId,
            watchedSeconds,
            totalDurationSeconds,
            percent,
            isCompleted,
          }),
          createdAt: new Date().toISOString(),
        });
      }
    } catch {
      // Fallback thêm vào Outbox khi gọi API lỗi
      await outboxRepository.addItem({
        clientOperationId: guidHelper.generateGuid(),
        operationType: 'LESSON_PROGRESS',
        entityType: 'Lesson',
        entityId: lessonId,
        payloadJson: JSON.stringify({
          lessonId,
          watchedSeconds,
          totalDurationSeconds,
          percent,
          isCompleted,
        }),
        createdAt: new Date().toISOString(),
      });
    }

    // Kích hoạt đồng bộ ngầm
    this.triggerSyncWithDebounce(2000);
  },
};
