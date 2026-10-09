import { create } from 'zustand';
import * as FileSystem from 'expo-file-system';
import { downloadRepository } from '../db/repositories/downloadRepository';
import { downloadManager } from '../services/downloadManager';

interface DownloadState {
  downloadedLessonIds: Set<number>;
  activeDownloads: Record<number, number>; // lessonId -> percentage
  downloadingProgress: Record<number, number>; // alias
  totalStorageBytes: number;
  refreshDownloads: () => Promise<void>;
  refreshStorageAndDownloads: () => Promise<void>;
  setDownloadProgress: (lessonId: number, progress: number) => void;
  removeDownloadProgress: (lessonId: number) => void;
  deleteDownload: (lessonId: number) => Promise<void>;
  startDownload: (lessonId: number, videoUrl?: string, title?: string) => Promise<void>;
}

export const useDownloadStore = create<DownloadState>((set, get) => ({
  downloadedLessonIds: new Set<number>(),
  activeDownloads: {},
  get downloadingProgress() {
    return get().activeDownloads;
  },
  totalStorageBytes: 0,

  refreshDownloads: async () => {
    await get().refreshStorageAndDownloads();
  },

  refreshStorageAndDownloads: async () => {
    try {
      const records = await downloadRepository.getAllDownloaded();
      const ids = new Set<number>(records.map((r) => r.lessonId));
      const totalBytes = records.reduce((sum, r) => sum + (r.fileSizeBytes || 0), 0);

      set({ downloadedLessonIds: ids, totalStorageBytes: totalBytes });
    } catch {
      set({ downloadedLessonIds: new Set(), totalStorageBytes: 0 });
    }
  },

  setDownloadProgress: (lessonId, progress) => {
    set((state) => {
      const updated = { ...state.activeDownloads, [lessonId]: progress };
      return {
        activeDownloads: updated,
        downloadingProgress: updated,
      };
    });
  },

  removeDownloadProgress: (lessonId) => {
    set((state) => {
      const next = { ...state.activeDownloads };
      delete next[lessonId];
      return {
        activeDownloads: next,
        downloadingProgress: next,
      };
    });
  },

  startDownload: async (lessonId, videoUrl = '', title = '') => {
    const url = videoUrl || 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4';
    get().setDownloadProgress(lessonId, 0);

    const uri = await downloadManager.downloadLessonVideo(
      lessonId,
      url,
      title || `Bài học #${lessonId}`,
      (percent) => {
        get().setDownloadProgress(lessonId, percent);
      }
    );

    get().removeDownloadProgress(lessonId);
    if (uri) {
      await get().refreshStorageAndDownloads();
    }
  },

  deleteDownload: async (lessonId) => {
    try {
      const rec = await downloadRepository.getByLessonId(lessonId);
      if (rec && rec.localPath) {
        await FileSystem.deleteAsync(rec.localPath, { idempotent: true });
      }
      await downloadRepository.deleteRecord(lessonId);
      await get().refreshStorageAndDownloads();
    } catch (err) {
      console.warn('[DownloadStore] Lỗi xóa bài học:', err);
    }
  },
}));
