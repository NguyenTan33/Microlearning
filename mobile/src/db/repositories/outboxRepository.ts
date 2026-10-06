import { getDatabase } from '../sqliteClient';
import type { SyncOperationItem } from '../../types/offline.types';

export const outboxRepository = {
  /**
   * Thêm một thao tác mới vào hàng đợi Outbox (PENDING)
   */
  async addOperation(item: SyncOperationItem): Promise<void> {
    const db = await getDatabase();
    await db.runAsync(
      `INSERT OR REPLACE INTO SyncOutbox 
       (clientOperationId, operationType, entityType, entityId, payloadJson, createdAt, status, retryCount)
       VALUES (?, ?, ?, ?, ?, ?, 'PENDING', 0);`,
      [
        item.clientOperationId,
        item.operationType,
        item.entityType || 'Lesson',
        item.entityId || 0,
        item.payloadJson,
        item.createdAt,
      ]
    );
  },

  /**
   * Lấy danh sách các thao tác đang chờ gửi (FIFO, giới hạn batch size)
   */
  async getPendingOperations(limit = 50): Promise<SyncOperationItem[]> {
    const db = await getDatabase();
    const rows = await db.getAllAsync<{
      clientOperationId: string;
      operationType: 'LESSON_PROGRESS' | 'QUIZ_ATTEMPT';
      entityType: 'Lesson' | 'Quiz';
      entityId: number;
      payloadJson: string;
      createdAt: string;
    }>(
      `SELECT clientOperationId, operationType, entityType, entityId, payloadJson, createdAt 
       FROM SyncOutbox 
       WHERE status = 'PENDING' 
       ORDER BY createdAt ASC 
       LIMIT ?;`,
      [limit]
    );

    return rows.map((row) => ({
      clientOperationId: row.clientOperationId,
      operationType: row.operationType,
      entityType: row.entityType,
      entityId: row.entityId,
      payloadJson: row.payloadJson,
      createdAt: row.createdAt,
    }));
  },

  /**
   * Xóa sạch các thao tác đã được Server tiếp nhận và xác thực thành công (ACID ACK)
   */
  async removeAcceptedOperations(acceptedIds: string[]): Promise<void> {
    if (acceptedIds.length === 0) return;
    const db = await getDatabase();
    const placeholders = acceptedIds.map(() => '?').join(',');
    await db.runAsync(
      `DELETE FROM SyncOutbox WHERE clientOperationId IN (${placeholders});`,
      acceptedIds
    );
  },

  /**
   * Cập nhật lỗi và tăng số lần thử lại nếu gửi thất bại
   */
  async recordFailure(clientOperationId: string, errorMessage: string): Promise<void> {
    const db = await getDatabase();
    await db.runAsync(
      `UPDATE SyncOutbox 
       SET retryCount = retryCount + 1, lastError = ?, status = 'PENDING' 
       WHERE clientOperationId = ?;`,
      [errorMessage, clientOperationId]
    );
  },

  /**
   * Đếm số lượng thao tác đang tồn đọng trong Outbox
   */
  async countPending(): Promise<number> {
    const db = await getDatabase();
    const result = await db.getFirstAsync<{ count: number }>(
      `SELECT COUNT(*) as count FROM SyncOutbox WHERE status = 'PENDING';`
    );
    return result?.count || 0;
  },
};
