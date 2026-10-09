import { getSQLiteDatabase } from '../sqliteClient';

export interface LessonProgressRecord {
  lessonId: number;
  watchedSeconds: number;
  percent: number;
  isCompleted: number;
  completedAt?: string;
  lastPlayedAt: string;
  isDirty: number;
}

export const progressRepository = {
  async saveProgress(lessonId: number, watchedSeconds: number, percent: number, isCompleted: boolean): Promise<void> {
    const db = await getSQLiteDatabase();
    const now = new Date().toISOString();
    const doneInt = isCompleted ? 1 : 0;

    await db.runAsync(
      `INSERT INTO LocalLessonProgress (lessonId, watchedSeconds, percent, isCompleted, completedAt, lastPlayedAt, isDirty)
       VALUES (?, ?, ?, ?, ?, ?, 1)
       ON CONFLICT(lessonId) DO UPDATE SET
         watchedSeconds = MAX(watchedSeconds, excluded.watchedSeconds),
         percent = MAX(percent, excluded.percent),
         isCompleted = MAX(isCompleted, excluded.isCompleted),
         completedAt = CASE WHEN excluded.isCompleted = 1 AND completedAt IS NULL THEN excluded.completedAt ELSE completedAt END,
         lastPlayedAt = excluded.lastPlayedAt,
         isDirty = 1`,
      [lessonId, watchedSeconds, percent, doneInt, isCompleted ? now : null, now]
    );
  },

  async getCompletedLessonIds(): Promise<number[]> {
    const db = await getSQLiteDatabase();
    const rows = await db.getAllAsync<{ lessonId: number }>(
      `SELECT lessonId FROM LocalLessonProgress WHERE isCompleted = 1`
    );
    return rows.map((r) => r.lessonId);
  },

  async getProgressByLessonId(lessonId: number): Promise<LessonProgressRecord | null> {
    const db = await getSQLiteDatabase();
    const record = await db.getFirstAsync<LessonProgressRecord>(
      `SELECT * FROM LocalLessonProgress WHERE lessonId = ?`,
      [lessonId]
    );
    return record || null;
  },
};
