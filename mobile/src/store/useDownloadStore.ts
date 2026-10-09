import { create } from 'zustand';
import { downloadRepository } from '../db/repositories/downloadRepository';

interface DownloadState {
  downloadedLessonIds: Set<number>;
  activeDownloads: Record<number, number>; // lessonId -> percentage
  refreshDownloads: () => Promise<void>;
  setDownloadProgress: (lessonId: number, progress: number) => void;
  removeDownloadProgress: (lessonId: number) => void;
}

export const useDownloadStore = create<DownloadState>((set) => ({
  downloadedLessonIds: new Set<number>(),
  activeDownloads: {},

  refreshDownloads: async () => {
    const ids = await downloadRepository.getDownloadedLessonIds();
    set({ downloadedLessonIds: new Set(ids) });
  },

  setDownloadProgress: (lessonId, progress) => {
    set((state) => ({
      activeDownloads: { ...state.activeDownloads, [lessonId]: progress },
    }));
  },

  removeDownloadProgress: (lessonId) => {
    set((state) => {
      const next = { ...state.activeDownloads };
      delete next[lessonId];
      return { activeDownloads: next };
    });
  },
}));
