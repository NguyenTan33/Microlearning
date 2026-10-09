import { getSQLiteDatabase } from '../sqliteClient';
import type { MediaBookmark } from '../../types/mediaBookmark.types';

export const bookmarkRepository = {
  async getAll(): Promise<MediaBookmark[]> {
    try {
      const db = await getSQLiteDatabase();
      const rows = await db.getAllAsync<MediaBookmark>(
        `SELECT id, lessonId, mediaId, courseId, courseTitle, lessonTitle, timestamp, formattedTime, title, note, createdAt 
         FROM LocalMediaBookmarks 
         ORDER BY createdAt DESC;`
      );
      return rows || [];
    } catch (err) {
      console.warn('[bookmarkRepository] getAll error:', err);
      return [];
    }
  },

  async getByLessonId(lessonId: number): Promise<MediaBookmark[]> {
    try {
      const db = await getSQLiteDatabase();
      const rows = await db.getAllAsync<MediaBookmark>(
        `SELECT id, lessonId, mediaId, courseId, courseTitle, lessonTitle, timestamp, formattedTime, title, note, createdAt 
         FROM LocalMediaBookmarks 
         WHERE lessonId = ? 
         ORDER BY timestamp ASC;`
      , [lessonId]);
      return rows || [];
    } catch (err) {
      console.warn('[bookmarkRepository] getByLessonId error:', err);
      return [];
    }
  },

  async save(bookmark: MediaBookmark): Promise<void> {
    try {
      const db = await getSQLiteDatabase();
      await db.runAsync(
        `INSERT OR REPLACE INTO LocalMediaBookmarks 
         (id, lessonId, mediaId, courseId, courseTitle, lessonTitle, timestamp, formattedTime, title, note, createdAt, syncStatus)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'SYNCED');`,
        [
          bookmark.id,
          bookmark.lessonId,
          bookmark.mediaId || null,
          bookmark.courseId,
          bookmark.courseTitle || '',
          bookmark.lessonTitle || '',
          bookmark.timestamp,
          bookmark.formattedTime,
          bookmark.title,
          bookmark.note || null,
          bookmark.createdAt,
        ]
      );
    } catch (err) {
      console.warn('[bookmarkRepository] save error:', err);
    }
  },

  async saveBatch(bookmarks: MediaBookmark[]): Promise<void> {
    if (!bookmarks || bookmarks.length === 0) return;
    try {
      const db = await getSQLiteDatabase();
      for (const bm of bookmarks) {
        await db.runAsync(
          `INSERT OR REPLACE INTO LocalMediaBookmarks 
           (id, lessonId, mediaId, courseId, courseTitle, lessonTitle, timestamp, formattedTime, title, note, createdAt, syncStatus)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'SYNCED');`,
          [
            bm.id,
            bm.lessonId,
            bm.mediaId || null,
            bm.courseId,
            bm.courseTitle || '',
            bm.lessonTitle || '',
            bm.timestamp,
            bm.formattedTime,
            bm.title,
            bm.note || null,
            bm.createdAt,
          ]
        );
      }
    } catch (err) {
      console.warn('[bookmarkRepository] saveBatch error:', err);
    }
  },

  async delete(id: string): Promise<void> {
    try {
      const db = await getSQLiteDatabase();
      await db.runAsync(`DELETE FROM LocalMediaBookmarks WHERE id = ?;`, [id]);
    } catch (err) {
      console.warn('[bookmarkRepository] delete error:', err);
    }
  },
};
