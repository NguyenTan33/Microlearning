import { getSQLiteDatabase } from '../sqliteClient';
import type { Course, CourseDetail, Subject, Lesson } from '../../types/catalog.types';

const DUMMY_KEYWORDS = ['excel', 'word', 'react', 'sql server', '.net 8', 'offline-first', 'test', 'test1', 'dummy'];

function isDummyTitle(title: string): boolean {
  const lower = (title || '').toLowerCase();
  return DUMMY_KEYWORDS.some((kw) => lower.includes(kw));
}

export const catalogRepository = {
  async saveCourses(courses: Course[]): Promise<void> {
    try {
      const db = await getSQLiteDatabase();
      const now = new Date().toISOString();
      const realCourses = courses.filter((c) => !isDummyTitle(c.title));

      const persist = async () => {
        // Đồng bộ chuẩn xác theo server: nếu danh sách rỗng, xóa sạch bảng
        if (realCourses.length === 0) {
          await db.runAsync(`DELETE FROM LocalCourses;`);
          await db.runAsync(`DELETE FROM LocalSubjects;`);
          await db.runAsync(`DELETE FROM LocalLessons;`);
        } else {
          const ids = realCourses.map((c) => c.id).join(',');
          await db.runAsync(`DELETE FROM LocalCourses WHERE id NOT IN (${ids});`);
          await db.runAsync(`
            DELETE FROM LocalCourses 
            WHERE LOWER(title) LIKE '%excel%' 
               OR LOWER(title) LIKE '%word%' 
               OR LOWER(title) LIKE '%react%' 
               OR LOWER(title) LIKE '%sql server%' 
               OR LOWER(title) LIKE '%.net 8%' 
               OR LOWER(title) LIKE '%test%'
               OR LOWER(title) LIKE '%dummy%'
               OR LOWER(title) LIKE '%offline-first%';
          `);
        }

        for (const c of realCourses) {
          await db.runAsync(
            `INSERT OR REPLACE INTO LocalCourses (id, title, description, thumbnailUrl, isPublished, totalSubjects, updatedAt)
             VALUES (?, ?, ?, ?, ?, ?, ?)`,
            [
              c.id,
              c.title,
              c.description || '',
              c.thumbnailUrl || '',
              c.isPublished ? 1 : 0,
              c.totalSubjects || 0,
              now,
            ]
          );
        }
      };

      try {
        await db.withTransactionAsync(persist);
      } catch {
        await persist();
      }
    } catch (err) {
      console.warn('[catalogRepository] saveCourses error:', err);
    }
  },

  async getAllCourses(): Promise<Course[]> {
    const db = await getSQLiteDatabase();
    try {
      await db.runAsync(`
        DELETE FROM LocalCourses 
        WHERE LOWER(title) LIKE '%excel%' 
           OR LOWER(title) LIKE '%word%' 
           OR LOWER(title) LIKE '%react%' 
           OR LOWER(title) LIKE '%sql server%' 
           OR LOWER(title) LIKE '%.net 8%' 
           OR LOWER(title) LIKE '%test%'
           OR LOWER(title) LIKE '%dummy%'
           OR LOWER(title) LIKE '%offline-first%';
      `);
    } catch {}

    const rows = await db.getAllAsync<any>(`SELECT * FROM LocalCourses ORDER BY id ASC`);
    return rows
      .filter((r) => !isDummyTitle(r.title || ''))
      .map((r) => ({
        ...r,
        isPublished: r.isPublished === 1 || r.isPublished === true,
      }));
  },

  async deleteCourse(courseId: number): Promise<void> {
    try {
      const db = await getSQLiteDatabase();
      await db.runAsync(`DELETE FROM LocalCourses WHERE id = ?;`, [courseId]);
    } catch (err) {
      console.warn('[catalogRepository] deleteCourse error:', err);
    }
  },

  async saveCourseDetail(detail: CourseDetail): Promise<void> {
    try {
      const db = await getSQLiteDatabase();
      const now = new Date().toISOString();

      const persistOperations = async () => {
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
      };

      try {
        await db.withTransactionAsync(persistOperations);
      } catch {
        // Fallback to sequential execution if a transaction is already active
        await persistOperations();
      }
    } catch (saveErr) {
      console.warn('[catalogRepository] saveCourseDetail error (safe ignored):', saveErr);
    }
  },

  async getCourseDetailById(courseId: number): Promise<CourseDetail | null> {
    const db = await getSQLiteDatabase();
    const course = await db.getFirstAsync<Course>(`SELECT * FROM LocalCourses WHERE id = ?`, [courseId]);
    if (!course) return null;

    const subjects = await db.getAllAsync<Subject>(`SELECT * FROM LocalSubjects WHERE courseId = ? ORDER BY sortOrder ASC`, [courseId]);
    for (const sub of subjects) {
      const rawLessons = await db.getAllAsync<any>(`SELECT * FROM LocalLessons WHERE subjectId = ? ORDER BY sortOrder ASC`, [sub.id]);
      sub.lessons = rawLessons.map((l) => ({
        ...l,
        videoUrl: l.videoUrl || l.videoRemoteUrl || undefined,
        hasQuiz: Boolean(l.hasQuiz),
        isPublished: Boolean(l.isPublished),
      }));
      sub.totalLessons = sub.lessons.length;
    }

    return {
      ...course,
      subjects,
    };
  },

  async getLessonById(lessonId: number): Promise<Lesson | null> {
    const db = await getSQLiteDatabase();
    const lesson = await db.getFirstAsync<any>(`SELECT * FROM LocalLessons WHERE id = ?`, [lessonId]);
    if (!lesson) return null;
    return {
      ...lesson,
      hasQuiz: Boolean(lesson.hasQuiz),
      isPublished: Boolean(lesson.isPublished),
    };
  },

  async updateLessonQuizStatus(lessonId: number, hasQuiz: boolean): Promise<void> {
    try {
      const db = await getSQLiteDatabase();
      await db.runAsync(`UPDATE LocalLessons SET hasQuiz = ? WHERE id = ?`, [hasQuiz ? 1 : 0, lessonId]);
    } catch {}
  },
};
