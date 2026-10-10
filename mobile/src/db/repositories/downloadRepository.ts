import { getSQLiteDatabase } from '../sqliteClient';
import type { DownloadedMediaRecord, DownloadStatus } from '../../types/offline.types';

export const downloadRepository = {
  async saveDownloadedMedia(record: {
    mediaId?: number;
    lessonId: number;
    fileName: string;
    localPath: string;
    fileSizeBytes: number;
    checksum: string;
    status: DownloadStatus;
    isPinned?: number;
  }): Promise<void> {
    const db = await getSQLiteDatabase();
    const now = new Date().toISOString();

    await db.runAsync(
      `INSERT OR REPLACE INTO DownloadedMedia 
       (lessonId, fileName, localPath, fileSizeBytes, checksum, downloadedAt, lastPlayedAt, isPinned, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?);`,
      [
        record.lessonId,
        record.fileName,
        record.localPath,
        record.fileSizeBytes,
        record.checksum,
        now,
        now,
        record.isPinned ?? 0,
        record.status,
      ]
    );
  },

  async getByLessonId(lessonId: number): Promise<DownloadedMediaRecord | null> {
    const db = await getSQLiteDatabase();
    const row = await db.getFirstAsync<DownloadedMediaRecord>(
      `SELECT * FROM DownloadedMedia WHERE lessonId = ?;`,
      [lessonId]
    );
    return row || null;
  },

  async getAllDownloaded(): Promise<DownloadedMediaRecord[]> {
    const db = await getSQLiteDatabase();
    return await db.getAllAsync<DownloadedMediaRecord>(
      `SELECT * FROM DownloadedMedia WHERE status = 'DOWNLOADED' ORDER BY downloadedAt DESC;`
    );
  },

  async getAllDownloads(): Promise<DownloadedMediaRecord[]> {
    return await this.getAllDownloaded();
  },

  async getDownloadedLessonIds(): Promise<number[]> {
    const db = await getSQLiteDatabase();
    const rows = await db.getAllAsync<{ lessonId: number }>(
      `SELECT DISTINCT lessonId FROM DownloadedMedia WHERE status = 'DOWNLOADED';`
    );
    return rows.map((r) => r.lessonId);
  },

  async deleteRecord(lessonId: number): Promise<void> {
    const db = await getSQLiteDatabase();
    await db.runAsync(`DELETE FROM DownloadedMedia WHERE lessonId = ?;`, [lessonId]);
  },

  async deleteDownloadByLessonId(lessonId: number): Promise<void> {
    await this.deleteRecord(lessonId);
  },

  async updateLocalPath(lessonId: number, newPath: string): Promise<void> {
    const db = await getSQLiteDatabase();
    await db.runAsync(`UPDATE DownloadedMedia SET localPath = ? WHERE lessonId = ?;`, [newPath, lessonId]);
  },

  async togglePinned(lessonId: number, isPinned: boolean): Promise<void> {
    const db = await getSQLiteDatabase();
    await db.runAsync(`UPDATE DownloadedMedia SET isPinned = ? WHERE lessonId = ?;`, [
      isPinned ? 1 : 0,
      lessonId,
    ]);
  },

  async togglePin(lessonId: number, isPinned: boolean): Promise<void> {
    await this.togglePinned(lessonId, isPinned);
  },

  async getExpiredVideos(sevenDaysAgoIso: string): Promise<DownloadedMediaRecord[]> {
    const db = await getSQLiteDatabase();
    return await db.getAllAsync<DownloadedMediaRecord>(
      `SELECT dm.* FROM DownloadedMedia dm
       JOIN LocalLessonProgress lp ON dm.lessonId = lp.lessonId
       WHERE dm.status = 'DOWNLOADED' 
         AND dm.isPinned = 0 
         AND lp.isCompleted = 1 
         AND dm.lastPlayedAt <= ?;`,
      [sevenDaysAgoIso]
    );
  },
};
