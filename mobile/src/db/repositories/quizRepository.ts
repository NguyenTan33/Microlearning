import { getSQLiteDatabase } from '../sqliteClient';
import type { QuizPackage } from '../../types/quiz.types';

export const quizRepository = {
  async saveLocalQuiz(quizPkg: QuizPackage): Promise<void> {
    const db = await getSQLiteDatabase();
    const now = new Date().toISOString();
    await db.runAsync(
      `INSERT OR REPLACE INTO LocalQuizzes (quizId, lessonId, title, passScore, version, questionsJson, updatedAt)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        quizPkg.quizId,
        quizPkg.lessonId,
        quizPkg.title,
        quizPkg.passScore,
        quizPkg.version || 1,
        JSON.stringify(quizPkg.questions),
        now,
      ]
    );
  },

  async getLocalQuizByLessonId(lessonId: number): Promise<QuizPackage | null> {
    const db = await getSQLiteDatabase();
    const row = await db.getFirstAsync<{
      quizId: number;
      lessonId: number;
      title: string;
      passScore: number;
      version: number;
      questionsJson: string;
    }>(`SELECT * FROM LocalQuizzes WHERE lessonId = ?`, [lessonId]);

    if (!row) return null;

    return {
      quizId: row.quizId,
      lessonId: row.lessonId,
      title: row.title,
      passScore: row.passScore,
      version: row.version,
      questions: JSON.parse(row.questionsJson),
    };
  },

  async saveQuizAttempt(
    clientAttemptId: string,
    quizId: number,
    lessonId: number,
    score: number,
    isPassed: boolean,
    answersJson: string
  ): Promise<void> {
    const db = await getSQLiteDatabase();
    const now = new Date().toISOString();
    await db.runAsync(
      `INSERT OR REPLACE INTO LocalQuizAttempts (clientAttemptId, quizId, lessonId, score, isPassed, submittedAt, answersJson, syncStatus)
       VALUES (?, ?, ?, ?, ?, ?, ?, 'PENDING')`,
      [clientAttemptId, quizId, lessonId, score, isPassed ? 1 : 0, now, answersJson]
    );
  },
};
