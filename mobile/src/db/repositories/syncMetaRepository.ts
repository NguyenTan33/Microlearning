import { getSQLiteDatabase } from '../sqliteClient';

export const syncMetaRepository = {
  async getMeta(key: string): Promise<string | null> {
    const db = await getSQLiteDatabase();
    const row = await db.getFirstAsync<{ value: string }>(
      `SELECT value FROM SyncMeta WHERE key = ?;`,
      [key]
    );
    return row?.value || null;
  },

  async saveMeta(key: string, value: string): Promise<void> {
    const db = await getSQLiteDatabase();
    const now = new Date().toISOString();
    await db.runAsync(
      `INSERT OR REPLACE INTO SyncMeta (key, value, updatedAt) VALUES (?, ?, ?);`,
      [key, value, now]
    );
  },

  async getCheckpointSequence(): Promise<number> {
    const val = await this.getMeta('checkpointSequence');
    if (!val) return 0;
    const num = parseInt(val, 10);
    return isNaN(num) ? 0 : num;
  },

  async setCheckpointSequence(sequence: number): Promise<void> {
    await this.saveMeta('checkpointSequence', sequence.toString());
  },

  async setLastSyncTime(isoDate: string): Promise<void> {
    await this.saveMeta('lastSyncTime', isoDate);
  },

  async getLastSyncTime(): Promise<string | null> {
    return await this.getMeta('lastSyncTime');
  },
};
