import { getDatabase } from '../sqliteClient';
import type { DownloadedMediaRecord, DownloadStatus } from '../../types/offline.types';

export const downloadRepository = {
  /**
   * Lưu hoặc cập nhật trạng thái tệp Media tải về
   */
  async saveDownloadedMedia(record: {
    mediaId: number;
    lessonId: number;
    fileName: string;
    localPath: string;
    fileSizeBytes: number;
    checksum: string;
    status: DownloadStatus;
    isPinned?: number;
  }): Promise<void> {
    const db = await getDatabase();
    const now = new Date().toISOString();

    await db.runAsync(
      `INSERT OR REPLACE INTO DownloadedMedia 
       (mediaId, lessonId, fileName, localPath, fileSizeBytes, checksum, downloadedAt, lastPlayedAt, isPinned, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?);`,
      [
        record.mediaId,
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

  /**
   * Cập nhật thời điểm phát gần nhất (LastPlayedAt) phục vụ chính sách dọn dẹp 7 ngày
   */
  async updateLastPlayed(lessonId: number): Promise<void> {
    const db = await getDatabase();
    const now = new Date().toISOString();
    await db.runAsync(
      `UPDATE DownloadedMedia SET lastPlayedAt = ? WHERE lessonId = ?;`,
      [now, lessonId]
    );
  },

  /**
   * Đổi trạng thái Ghim / Bỏ ghim bài học không bị tự xóa
   */
  async togglePinned(lessonId: number, isPinned: boolean): Promise<void> {
    const db = await getDatabase();
    await db.runAsync(
      `UPDATE DownloadedMedia SET isPinned = ? WHERE lessonId = ?;`,
      [isPinned ? 1 : 0, lessonId]
    );
  },

  /**
   * Lấy thông tin video tải về theo lessonId
   */
  async getByLessonId(lessonId: number): Promise<DownloadedMediaRecord | null> {
    const db = await getDatabase();
    const row = await db.getFirstAsync<DownloadedMediaRecord>(
      `SELECT * FROM DownloadedMedia WHERE lessonId = ?;`,
      [lessonId]
    );
    return row || null;
  },

  /**
   * Lấy toàn bộ danh sách video đã tải về máy (Kho ngoại tuyến)
   */
  async getAllDownloaded(): Promise<DownloadedMediaRecord[]> {
    const db = await getDatabase();
    return await db.getAllAsync<DownloadedMediaRecord>(
      `SELECT * FROM DownloadedMedia WHERE status = 'DOWNLOADED' ORDER BY downloadedAt DESC;`
    );
  },

  /**
   * Lấy các bài học cũ thỏa mãn chính sách dọn dẹp sau 7 ngày
   * Điều kiện: isPinned = 0 AND lastPlayedAt <= (Hiện tại - 7 ngày)
   */
  async getExpiredVideos(sevenDaysAgoIso: string): Promise<DownloadedMediaRecord[]> {
    const db = await getDatabase();
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

  /**
   * Xóa bản ghi tệp media khỏi SQLite
   */
  async deleteRecord(lessonId: number): Promise<void> {
    const db = await getDatabase();
    await db.runAsync(`DELETE FROM DownloadedMedia WHERE lessonId = ?;`, [lessonId]);
  },

  /**
   * Tính tổng dung lượng các tệp video đang lưu trên máy (Bytes)
   */
  async getTotalStorageUsedBytes(): Promise<number> {
    const db = await getDatabase();
    const result = await db.getFirstAsync<{ totalBytes: number }>(
      `SELECT SUM(fileSizeBytes) as totalBytes FROM DownloadedMedia WHERE status = 'DOWNLOADED';`
    );
    return result?.totalBytes || 0;
  },
};
