import { getSQLiteDatabase } from '../sqliteClient';
import type { SyncOutboxItem } from '../../types/sync.types';

export const outboxRepository = {
  async addOutboxItem(item: Omit<SyncOutboxItem, 'retryCount' | 'status'>): Promise<void> {
    const db = await getSQLiteDatabase();
    await db.runAsync(
      `INSERT OR REPLACE INTO SyncOutbox (clientOperationId, operationType, entityType, entityId, payloadJson, createdAt, retryCount, status)
       VALUES (?, ?, ?, ?, ?, ?, 0, 'PENDING')`,
      [
        item.clientOperationId,
        item.operationType,
        item.entityType,
        item.entityId,
        item.payloadJson,
        item.createdAt,
      ]
    );
  },

  async addItem(item: Omit<SyncOutboxItem, 'retryCount' | 'status'>): Promise<void> {
    await this.addOutboxItem(item);
  },

  async getPendingItems(): Promise<SyncOutboxItem[]> {
    const db = await getSQLiteDatabase();
    const rows = await db.getAllAsync<SyncOutboxItem>(
      `SELECT * FROM SyncOutbox WHERE status = 'PENDING' ORDER BY createdAt ASC LIMIT 50`
    );
    return rows;
  },

  async removeItems(operationIds: string[]): Promise<void> {
    if (operationIds.length === 0) return;
    const db = await getSQLiteDatabase();
    const placeholders = operationIds.map(() => '?').join(',');
    await db.runAsync(`DELETE FROM SyncOutbox WHERE clientOperationId IN (${placeholders})`, operationIds);
  },

  async updateItemStatus(operationId: string, status: 'FAILED', errorMsg: string): Promise<void> {
    const db = await getSQLiteDatabase();
    await db.runAsync(
      `UPDATE SyncOutbox SET status = ?, retryCount = retryCount + 1, lastError = ? WHERE clientOperationId = ?`,
      [status, errorMsg, operationId]
    );
  },

  async getPendingCount(): Promise<number> {
    const db = await getSQLiteDatabase();
    const result = await db.getFirstAsync<{ count: number }>(
      `SELECT COUNT(*) as count FROM SyncOutbox WHERE status = 'PENDING'`
    );
    return result?.count || 0;
  },
};
