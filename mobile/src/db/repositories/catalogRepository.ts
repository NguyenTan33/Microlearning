import { getSQLiteDatabase } from '../sqliteClient';
import type { Course, CourseDetail, Subject, Lesson } from '../../types/catalog.types';

export const catalogRepository = {
  async saveCourses(courses: Course[]): Promise<void> {
    const db = await getSQLiteDatabase();
    const now = new Date().toISOString();
    await db.withTransactionAsync(async () => {
      for (const c of courses) {
        await db.runAsync(
          `INSERT OR REPLACE INTO LocalCourses (id, title, description, thumbnailUrl, totalSubjects, updatedAt)
           VALUES (?, ?, ?, ?, ?, ?)`,
          [c.id, c.title, c.description || '', c.thumbnailUrl || '', c.totalSubjects || 0, now]
        );
      }
    });
  },

  async getAllCourses(): Promise<Course[]> {
    const db = await getSQLiteDatabase();
    const rows = await db.getAllAsync<Course>(`SELECT * FROM LocalCourses ORDER BY id ASC`);
    return rows;
  },

  async saveCourseDetail(detail: CourseDetail): Promise<void> {
    const db = await getSQLiteDatabase();
    const now = new Date().toISOString();
    await db.withTransactionAsync(async () => {
      await db.runAsync(
        `INSERT OR REPLACE INTO LocalCourses (id, title, description, thumbnailUrl, totalSubjects, updatedAt)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [detail.id, detail.title, detail.description || '', detail.thumbnailUrl || '', detail.subjects?.length || 0, now]
      );

      if (detail.subjects) {
        for (const s of detail.subjects) {
          await db.runAsync(
            `INSERT OR REPLACE INTO LocalSubjects (id, courseId, title, description, sortOrder, totalLessons)
             VALUES (?, ?, ?, ?, ?, ?)`,
            [s.id, detail.id, s.title, s.description || '', s.sortOrder || 1, s.lessons?.length || 0]
          );

          if (s.lessons) {
            for (const l of s.lessons) {
              await db.runAsync(
                `INSERT OR REPLACE INTO LocalLessons (id, subjectId, title, description, durationSeconds, sortOrder, hasQuiz, videoRemoteUrl, audioTtsUrl)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                [
                  l.id,
                  s.id,
                  l.title,
                  l.description || '',
                  l.durationSeconds || 0,
                  l.sortOrder || 1,
                  l.hasQuiz ? 1 : 0,
                  l.videoUrl || '',
                  l.audioTtsUrl || '',
                ]
              );
            }
          }
        }
      }
    });
  },

  async getCourseDetailById(courseId: number): Promise<CourseDetail | null> {
    const db = await getSQLiteDatabase();
    const course = await db.getFirstAsync<Course>(`SELECT * FROM LocalCourses WHERE id = ?`, [courseId]);
    if (!course) return null;

    const subjects = await db.getAllAsync<Subject>(`SELECT * FROM LocalSubjects WHERE courseId = ? ORDER BY sortOrder ASC`, [courseId]);
    for (const sub of subjects) {
      const lessons = await db.getAllAsync<Lesson>(`SELECT * FROM LocalLessons WHERE subjectId = ? ORDER BY sortOrder ASC`, [sub.id]);
      sub.lessons = lessons;
    }

    return {
      ...course,
      subjects,
    };
  },

  async getLessonById(lessonId: number): Promise<Lesson | null> {
    const db = await getSQLiteDatabase();
    const lesson = await db.getFirstAsync<Lesson>(`SELECT * FROM LocalLessons WHERE id = ?`, [lessonId]);
    return lesson || null;
  },
};
