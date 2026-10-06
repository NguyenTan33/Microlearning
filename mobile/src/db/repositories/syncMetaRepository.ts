import { getDatabase } from '../sqliteClient';

export const syncMetaRepository = {
  /**
   * Lấy số Sequence Checkpoint hiện tại của thiết bị (mặc định 0)
   */
  async getCheckpointSequence(): Promise<number> {
    const db = await getDatabase();
    const row = await db.getFirstAsync<{ value: string }>(
      `SELECT value FROM SyncMeta WHERE key = 'checkpointSequence';`
    );
    if (!row) return 0;
    const num = parseInt(row.value, 10);
    return isNaN(num) ? 0 : num;
  },

  /**
   * Cập nhật số Sequence Checkpoint mới sau khi Delta Sync Pull thành công
   */
  async setCheckpointSequence(sequence: number): Promise<void> {
    const db = await getDatabase();
    const now = new Date().toISOString();
    await db.runAsync(
      `INSERT OR REPLACE INTO SyncMeta (key, value, updatedAt) VALUES ('checkpointSequence', ?, ?);`,
      [sequence.toString(), now]
    );
  },

  /**
   * Lưu mốc thời gian lần đồng bộ thành công gần nhất
   */
  async setLastSyncTime(isoDate: string): Promise<void> {
    const db = await getDatabase();
    const now = new Date().toISOString();
    await db.runAsync(
      `INSERT OR REPLACE INTO SyncMeta (key, value, updatedAt) VALUES ('lastSyncTime', ?, ?);`,
      [isoDate, now]
    );
  },

  /**
   * Lấy mốc thời gian lần đồng bộ thành công gần nhất
   */
  async getLastSyncTime(): Promise<string | null> {
    const db = await getDatabase();
    const row = await db.getFirstAsync<{ value: string }>(
      `SELECT value FROM SyncMeta WHERE key = 'lastSyncTime';`
    );
    return row?.value || null;
  },
};
