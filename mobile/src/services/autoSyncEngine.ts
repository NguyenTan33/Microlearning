import NetInfo from '@react-native-community/netinfo';
import { outboxRepository } from '../db/repositories/outboxRepository';
import { syncApi } from './syncApi';
import { STORAGE_KEYS } from '../utils/constants';
import { secureStorage } from '../utils/secureStorage';

let isSyncing = false;
let syncTimer: NodeJS.Timeout | null = null;

export const autoSyncEngine = {
  triggerSyncWithDebounce(delayMs: number = 2000): void {
    if (syncTimer) {
      clearTimeout(syncTimer);
    }
    syncTimer = setTimeout(() => {
      this.runSyncProcess();
    }, delayMs);
  },

  async runSyncProcess(): Promise<void> {
    if (isSyncing) return;

    try {
      const netState = await NetInfo.fetch();
      if (!netState.isConnected || !netState.isInternetReachable) {
        return;
      }

      isSyncing = true;
      const deviceId = (await secureStorage.getItem(STORAGE_KEYS.DEVICE_ID)) || 'mobile-device-default';

      // 1. Get pending outbox operations
      const pendingOps = await outboxRepository.getPendingItems();
      if (pendingOps.length > 0) {
        const response = await syncApi.pushBatch({
          deviceId,
          operations: pendingOps,
        });

        if (response.acceptedOperationIds && response.acceptedOperationIds.length > 0) {
          await outboxRepository.removeItems(response.acceptedOperationIds);
        }
      }
    } catch (err) {
      console.warn('[AutoSyncEngine] Sync error:', err);
    } finally {
      isSyncing = false;
    }
  },
};
