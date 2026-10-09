import { create } from 'zustand';

interface SyncState {
  pendingCount: number;
  outboxCount: number;
  isOnline: boolean;
  isSyncing: boolean;
  lastSyncTime: string | null;
  setPendingCount: (count: number) => void;
  setOnline: (online: boolean) => void;
  setSyncing: (syncing: boolean) => void;
  setLastSyncTime: (time: string) => void;
}

export const useSyncStore = create<SyncState>((set, get) => ({
  pendingCount: 0,
  get outboxCount() {
    return get().pendingCount;
  },
  isOnline: true,
  isSyncing: false,
  lastSyncTime: null,
  setPendingCount: (pendingCount) => set({ pendingCount, outboxCount: pendingCount }),
  setOnline: (isOnline) => set({ isOnline }),
  setSyncing: (isSyncing) => set({ isSyncing }),
  setLastSyncTime: (lastSyncTime) => set({ lastSyncTime }),
}));
