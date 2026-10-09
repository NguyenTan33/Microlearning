import { create } from 'zustand';
import { downloadRepository } from '../db/repositories/downloadRepository';
import { downloadManager } from '../services/downloadManager';

interface DownloadState {
  downloadingProgress: Record<number, number>; // lessonId -> % (0 - 100)
  downloadedLessonIds: Set<number>;
  totalStorageBytes: number;
  refreshStorageAndDownloads: () => Promise<void>;
  startDownload: (lessonId: number) => Promise<boolean>;
  deleteDownload: (lessonId: number) => Promise<void>;
}

export const useDownloadStore = create<DownloadState>((set, get) => ({
  downloadingProgress: {},
  downloadedLessonIds: new Set(),
  totalStorageBytes: 0,

  refreshStorageAndDownloads: async () => {
    try {
      const records = await downloadRepository.getAllDownloaded();
      const bytes = await downloadRepository.getTotalStorageUsedBytes();
      const ids = new Set(records.map((r) => r.lessonId));
      set({ downloadedLessonIds: ids, totalStorageBytes: bytes });
    } catch (e) {
      console.warn('[useDownloadStore] Lỗi đọc danh sách tải:', e);
    }
  },

  startDownload: async (lessonId: number) => {
    // Đánh dấu bắt đầu tải 0%
    set((state) => ({
      downloadingProgress: { ...state.downloadingProgress, [lessonId]: 0 },
    }));

    try {
      const success = await downloadManager.downloadLessonPackage(lessonId, (id, percent) => {
        set((state) => ({
          downloadingProgress: { ...state.downloadingProgress, [id]: percent },
        }));
      });

      // Xóa khỏi progress, thêm vào downloaded
      set((state) => {
        const nextProgress = { ...state.downloadingProgress };
        delete nextProgress[lessonId];
        const nextIds = new Set(state.downloadedLessonIds);
        nextIds.add(lessonId);
        return {
          downloadingProgress: nextProgress,
          downloadedLessonIds: nextIds,
        };
      });

      await get().refreshStorageAndDownloads();
      return success;
    } catch (error) {
      set((state) => {
        const nextProgress = { ...state.downloadingProgress };
        delete nextProgress[lessonId];
        return { downloadingProgress: nextProgress };
      });
      throw error;
    }
  },

  deleteDownload: async (lessonId: number) => {
    await downloadManager.deleteOfflineVideo(lessonId);
    await get().refreshStorageAndDownloads();
  },
}));
