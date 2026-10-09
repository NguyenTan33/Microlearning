import { getSQLiteDatabase } from '../sqliteClient';
import type { DownloadedMediaItem } from '../../types/sync.types';

export const downloadRepository = {
  async saveDownloadedMedia(item: Omit<DownloadedMediaItem, 'mediaId'>): Promise<void> {
    const db = await getSQLiteDatabase();
    await db.runAsync(
      `INSERT OR REPLACE INTO DownloadedMedia (lessonId, fileName, localPath, fileSizeBytes, checksum, downloadedAt, lastPlayedAt, isPinned, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        item.lessonId,
        item.fileName,
        item.localPath,
        item.fileSizeBytes,
        item.checksum,
        item.downloadedAt,
        item.lastPlayedAt,
        item.isPinned ? 1 : 0,
        item.status,
      ]
    );
  },

  async getAllDownloads(): Promise<DownloadedMediaItem[]> {
    const db = await getSQLiteDatabase();
    const rows = await db.getAllAsync<DownloadedMediaItem>(
      `SELECT * FROM DownloadedMedia WHERE status = 'DOWNLOADED' ORDER BY downloadedAt DESC`
    );
    return rows;
  },

  async getDownloadedLessonIds(): Promise<number[]> {
    const db = await getSQLiteDatabase();
    const rows = await db.getAllAsync<{ lessonId: number }>(
      `SELECT lessonId FROM DownloadedMedia WHERE status = 'DOWNLOADED'`
    );
    return rows.map((r) => r.lessonId);
  },

  async deleteDownloadByLessonId(lessonId: number): Promise<void> {
    const db = await getSQLiteDatabase();
    await db.runAsync(`DELETE FROM DownloadedMedia WHERE lessonId = ?`, [lessonId]);
  },

  async togglePin(lessonId: number, isPinned: boolean): Promise<void> {
    const db = await getSQLiteDatabase();
    await db.runAsync(`UPDATE DownloadedMedia SET isPinned = ? WHERE lessonId = ?`, [isPinned ? 1 : 0, lessonId]);
  },
};
