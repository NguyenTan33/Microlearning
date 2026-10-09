import { apiClient } from './apiClient';
import type { SyncPushRequest, SyncPushResponse, SyncPullResponse } from '../types/offline.types';

export const syncApi = {
  /**
   * Đẩy lô hàng đợi Outbox lên Server (ACID Transaction)
   */
  async pushBatch(request: SyncPushRequest): Promise<SyncPushResponse> {
    const response = await apiClient.post<SyncPushResponse>('/sync/push', request);
    return response.data;
  },

  /**
   * Kéo các thay đổi vi sai từ máy chủ về máy (Delta Sync Pull)
   */
  async pullDelta(afterSequence: number, limit = 50): Promise<SyncPullResponse> {
    const response = await apiClient.get<SyncPullResponse>(
      `/sync/pull?afterSequence=${afterSequence}&limit=${limit}`
    );
    return response.data;
  },

  /**
   * Kiểm tra máy chủ có đang phản hồi tốt hay không
   */
  async checkHealth(): Promise<boolean> {
    try {
      const response = await apiClient.get('/health', { timeout: 4000 });
      return response.status === 200;
    } catch {
      return false;
    }
  },
};
