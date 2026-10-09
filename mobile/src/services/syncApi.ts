import { apiClient } from './apiClient';
import type { SyncPushBatchRequest, SyncPushBatchResponse, SyncPullResponse } from '../types/sync.types';

export const syncApi = {
  async pushBatch(data: SyncPushBatchRequest): Promise<SyncPushBatchResponse> {
    const res = await apiClient.post<SyncPushBatchResponse>('/api/sync/push', data);
    return res.data;
  },

  async pullDelta(afterSequence: number): Promise<SyncPullResponse> {
    const res = await apiClient.get<SyncPullResponse>(`/api/sync/pull?afterSequence=${afterSequence}`);
    return res.data;
  },

  async healthCheck(): Promise<boolean> {
    try {
      const res = await apiClient.get<{ status: string }>('/api/sync/health');
      return res.data.status === 'healthy' || res.status === 200;
    } catch {
      return false;
    }
  },
};
