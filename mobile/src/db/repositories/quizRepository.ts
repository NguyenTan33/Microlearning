import { getDatabase } from '../sqliteClient';
import type { QuizPackage } from '../../types/catalog.types';
import type { LocalQuizAttemptRecord } from '../../types/offline.types';

export const quizRepository = {
  /**
   * Lưu hoặc cập nhật gói đề thi trắc nghiệm (ẩn IsCorrect) vào SQLite
   */
  async saveQuizPackage(quiz: QuizPackage, lessonId: number): Promise<void> {
    const db = await getDatabase();
    const now = new Date().toISOString();

    await db.runAsync(
      `INSERT OR REPLACE INTO LocalQuizzes 
       (quizId, lessonId, title, passScore, version, questionsJson, updatedAt)
       VALUES (?, ?, ?, ?, ?, ?, ?);`,
      [
        quiz.id,
        lessonId,
        quiz.title,
        quiz.passScore,
        quiz.version,
        JSON.stringify(quiz.questions),
        now,
      ]
    );
  },

  /**
   * Lấy gói đề thi trắc nghiệm từ SQLite theo lessonId
   */
  async getQuizByLessonId(lessonId: number): Promise<QuizPackage | null> {
    const db = await getDatabase();
    const row = await db.getFirstAsync<{
      quizId: number;
      lessonId: number;
      title: string;
      passScore: number;
      version: number;
      questionsJson: string;
    }>(`SELECT * FROM LocalQuizzes WHERE lessonId = ?;`, [lessonId]);

    if (!row) return null;

    try {
      const questions = JSON.parse(row.questionsJson);
      return {
        id: row.quizId,
        title: row.title,
        passScore: row.passScore,
        version: row.version,
        questions,
      };
    } catch {
      return null;
    }
  },

  /**
   * Lưu kết quả làm bài thi trắc nghiệm cục bộ
   */
  async saveAttempt(record: LocalQuizAttemptRecord): Promise<void> {
    const db = await getDatabase();
    await db.runAsync(
      `INSERT OR REPLACE INTO LocalQuizAttempts 
       (clientAttemptId, quizId, lessonId, score, isPassed, submittedAt, answersJson, syncStatus)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?);`,
      [
        record.clientAttemptId,
        record.quizId,
        record.lessonId,
        record.score,
        record.isPassed,
        record.submittedAt,
        record.answersJson,
        record.syncStatus,
      ]
    );
  },

  /**
   * Lấy lịch sử lần thi gần nhất của bài học từ SQLite
   */
  async getLatestAttempt(lessonId: number): Promise<LocalQuizAttemptRecord | null> {
    const db = await getDatabase();
    const row = await db.getFirstAsync<LocalQuizAttemptRecord>(
      `SELECT * FROM LocalQuizAttempts WHERE lessonId = ? ORDER BY submittedAt DESC LIMIT 1;`,
      [lessonId]
    );
    return row || null;
  },

  /**
   * Đánh dấu bài nộp đã được đồng bộ thành công lên server
   */
  async markAttemptSynced(clientAttemptId: string): Promise<void> {
    const db = await getDatabase();
    await db.runAsync(
      `UPDATE LocalQuizAttempts SET syncStatus = 'SYNCED' WHERE clientAttemptId = ?;`,
      [clientAttemptId]
    );
  },
};
