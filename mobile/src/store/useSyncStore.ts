import { create } from 'zustand';

interface SyncState {
  pendingCount: number;
  isOnline: boolean;
  isSyncing: boolean;
  setPendingCount: (count: number) => void;
  setOnline: (online: boolean) => void;
  setSyncing: (syncing: boolean) => void;
}

export const useSyncStore = create<SyncState>((set) => ({
  pendingCount: 0,
  isOnline: true,
  isSyncing: false,
  setPendingCount: (pendingCount) => set({ pendingCount }),
  setOnline: (isOnline) => set({ isOnline }),
  setSyncing: (isSyncing) => set({ isSyncing }),
}));
