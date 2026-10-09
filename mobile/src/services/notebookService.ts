import { getSQLiteDatabase } from '../db/sqliteClient';

export interface LessonNote {
  id: string;
  lessonId: number;
  content: string;
  timestampSeconds?: number;
  createdAt: string;
  updatedAt: string;
}

export const notebookService = {
  async getNotesForLesson(lessonId: number): Promise<LessonNote[]> {
    try {
      const db = await getSQLiteDatabase();
      const rows = await db.getAllAsync<LessonNote>(
        `SELECT * FROM LocalNotes WHERE lessonId = ? ORDER BY createdAt DESC;`,
        [lessonId]
      );
      return rows;
    } catch {
      return [];
    }
  },

  async saveNote(lessonId: number, content: string, timestampSeconds?: number): Promise<LessonNote> {
    const db = await getSQLiteDatabase();
    const id = `note-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;
    const now = new Date().toISOString();

    await db.runAsync(
      `CREATE TABLE IF NOT EXISTS LocalNotes (
        id TEXT PRIMARY KEY,
        lessonId INTEGER,
        content TEXT,
        timestampSeconds INTEGER,
        createdAt TEXT,
        updatedAt TEXT
      );`
    );

    await db.runAsync(
      `INSERT INTO LocalNotes (id, lessonId, content, timestampSeconds, createdAt, updatedAt)
       VALUES (?, ?, ?, ?, ?, ?);`,
      [id, lessonId, content, timestampSeconds || 0, now, now]
    );

    return {
      id,
      lessonId,
      content,
      timestampSeconds,
      createdAt: now,
      updatedAt: now,
    };
  },

  async deleteNote(noteId: string): Promise<void> {
    try {
      const db = await getSQLiteDatabase();
      await db.runAsync(`DELETE FROM LocalNotes WHERE id = ?;`, [noteId]);
    } catch (err) {
      console.warn('[NotebookService] Delete error:', err);
    }
  },
};
