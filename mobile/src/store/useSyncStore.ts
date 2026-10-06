import { create } from 'zustand';
import { autoSyncEngine } from '../services/autoSyncEngine';

interface SyncState {
  isSyncing: boolean;
  outboxCount: number;
  lastSyncTime: string | null;
  isOnline: boolean;
  initSyncStore: () => () => void;
  triggerManualSync: () => void;
}

export const useSyncStore = create<SyncState>((set) => ({
  isSyncing: false,
  outboxCount: 0,
  lastSyncTime: null,
  isOnline: true,

  initSyncStore: () => {
    // Đăng ký nhận cập nhật từ autoSyncEngine
    const unsubscribe = autoSyncEngine.subscribe((status) => {
      set({
        isSyncing: status.isSyncing,
        outboxCount: status.outboxCount,
        lastSyncTime: status.lastSyncTime,
      });
    });

    return unsubscribe;
  },

  triggerManualSync: () => {
    autoSyncEngine.triggerSyncWithDebounce(0);
  },
}));
