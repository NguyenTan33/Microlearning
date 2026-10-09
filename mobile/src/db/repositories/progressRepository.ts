import { getDatabase } from '../sqliteClient';
import type { LocalLessonProgressRecord } from '../../types/offline.types';

export const progressRepository = {
  /**
   * Lưu hoặc cập nhật tiến độ học bài với thuật toán Monotonic Merge:
   * Math.Max(tiến độ hiện tại, tiến độ mới) để chống bị tụt lùi.
   */
  async upsertProgress(
    lessonId: number,
    watchedSeconds: number,
    percent: number
  ): Promise<LocalLessonProgressRecord> {
    const db = await getDatabase();
    const existing = await this.getProgress(lessonId);

    const safeWatched = existing
      ? Math.max(existing.watchedSeconds, Math.round(watchedSeconds))
      : Math.round(watchedSeconds);

    const safePercent = existing
      ? Math.max(existing.percent, Number(percent.toFixed(1)))
      : Number(percent.toFixed(1));

    const isCompleted = safePercent >= 90 ? 1 : existing?.isCompleted ? 1 : 0;
    const now = new Date().toISOString();
    const completedAt = isCompleted && !existing?.completedAt ? now : existing?.completedAt || null;

    await db.runAsync(
      `INSERT OR REPLACE INTO LocalLessonProgress 
       (lessonId, watchedSeconds, percent, isCompleted, completedAt, lastPlayedAt, isDirty)
       VALUES (?, ?, ?, ?, ?, ?, 1);`,
      [lessonId, safeWatched, safePercent, isCompleted, completedAt, now]
    );

    return {
      lessonId,
      watchedSeconds: safeWatched,
      percent: safePercent,
      isCompleted,
      completedAt,
      lastPlayedAt: now,
      isDirty: 1,
    };
  },

  /**
   * Lấy tiến độ học của một bài học từ SQLite
   */
  async getProgress(lessonId: number): Promise<LocalLessonProgressRecord | null> {
    const db = await getDatabase();
    const row = await db.getFirstAsync<LocalLessonProgressRecord>(
      `SELECT * FROM LocalLessonProgress WHERE lessonId = ?;`,
      [lessonId]
    );
    return row || null;
  },

  /**
   * Lấy danh sách ID của tất cả các bài học đã hoàn thành
   */
  async getCompletedLessonIds(): Promise<number[]> {
    const db = await getDatabase();
    const rows = await db.getAllAsync<{ lessonId: number }>(
      `SELECT lessonId FROM LocalLessonProgress WHERE isCompleted = 1;`
    );
    return rows.map((r) => r.lessonId);
  },

  /**
   * Đánh dấu tiến độ đã được đẩy thành công lên server (isDirty = 0)
   */
  async markClean(lessonId: number): Promise<void> {
    const db = await getDatabase();
    await db.runAsync(`UPDATE LocalLessonProgress SET isDirty = 0 WHERE lessonId = ?;`, [lessonId]);
  },
};
