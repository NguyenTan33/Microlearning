import { getDatabase } from '../sqliteClient';
import type { Course, Subject, Lesson, CourseDetail } from '../../types/catalog.types';

export const catalogRepository = {
  /**
   * Lưu hoặc cập nhật danh sách Khóa học vào SQLite
   */
  async saveCourses(courses: Course[]): Promise<void> {
    const db = await getDatabase();
    const now = new Date().toISOString();

    for (const c of courses) {
      await db.runAsync(
        `INSERT OR REPLACE INTO LocalCourses 
         (id, title, description, thumbnailUrl, version, isPublished, totalSubjects, updatedAt)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?);`,
        [
          c.id,
          c.title,
          c.description || '',
          c.thumbnailUrl || '',
          c.version,
          c.isPublished ? 1 : 0,
          c.totalSubjects,
          now,
        ]
      );
    }
  },

  /**
   * Lấy danh sách tất cả các khóa học đã cache trong máy
   */
  async getAllCourses(): Promise<Course[]> {
    const db = await getDatabase();
    const rows = await db.getAllAsync<{
      id: number;
      title: string;
      description: string;
      thumbnailUrl: string;
      version: number;
      isPublished: number;
      totalSubjects: number;
    }>(`SELECT * FROM LocalCourses ORDER BY id ASC;`);

    return rows.map((r) => ({
      id: r.id,
      title: r.title,
      description: r.description,
      thumbnailUrl: r.thumbnailUrl,
      version: r.version,
      isPublished: Boolean(r.isPublished),
      totalSubjects: r.totalSubjects,
    }));
  },

  /**
   * Lưu cây cấu trúc Khóa học -> Môn học -> Bài học
   */
  async saveCourseDetail(courseDetail: CourseDetail): Promise<void> {
    const db = await getDatabase();
    const now = new Date().toISOString();

    // 1. Lưu Course
    await db.runAsync(
      `INSERT OR REPLACE INTO LocalCourses 
       (id, title, description, thumbnailUrl, version, isPublished, totalSubjects, updatedAt)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?);`,
      [
        courseDetail.id,
        courseDetail.title,
        courseDetail.description || '',
        courseDetail.thumbnailUrl || '',
        courseDetail.version,
        courseDetail.isPublished ? 1 : 0,
        courseDetail.totalSubjects,
        now,
      ]
    );

    // 2. Lưu Subjects & Lessons
    for (const s of courseDetail.subjects) {
      await db.runAsync(
        `INSERT OR REPLACE INTO LocalSubjects 
         (id, courseId, title, description, sortOrder, totalLessons)
         VALUES (?, ?, ?, ?, ?, ?);`,
        [s.id, s.courseId, s.title, s.description || '', s.sortOrder, s.totalLessons]
      );

      if (s.lessons && s.lessons.length > 0) {
        for (const l of s.lessons) {
          await db.runAsync(
            `INSERT OR REPLACE INTO LocalLessons 
             (id, subjectId, title, description, durationSeconds, sortOrder, version, isPublished, hasQuiz, mediaAssetCount)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?);`,
            [
              l.id,
              l.subjectId,
              l.title,
              l.description || '',
              l.durationSeconds,
              l.sortOrder,
              l.version,
              l.isPublished ? 1 : 0,
              l.hasQuiz ? 1 : 0,
              l.mediaAssetCount,
            ]
          );
        }
      }
    }
  },

  /**
   * Lấy chi tiết Khóa học kèm danh sách Môn học và Bài học từ SQLite
   */
  async getCourseDetailById(courseId: number): Promise<CourseDetail | null> {
    const db = await getDatabase();

    const courseRow = await db.getFirstAsync<{
      id: number;
      title: string;
      description: string;
      thumbnailUrl: string;
      version: number;
      isPublished: number;
      totalSubjects: number;
    }>(`SELECT * FROM LocalCourses WHERE id = ?;`, [courseId]);

    if (!courseRow) return null;

    const subjectRows = await db.getAllAsync<{
      id: number;
      courseId: number;
      title: string;
      description: string;
      sortOrder: number;
      totalLessons: number;
    }>(`SELECT * FROM LocalSubjects WHERE courseId = ? ORDER BY sortOrder ASC;`, [courseId]);

    const subjects: Subject[] = [];

    for (const s of subjectRows) {
      const lessonRows = await db.getAllAsync<{
        id: number;
        subjectId: number;
        title: string;
        description: string;
        durationSeconds: number;
        sortOrder: number;
        version: number;
        isPublished: number;
        hasQuiz: number;
        mediaAssetCount: number;
      }>(`SELECT * FROM LocalLessons WHERE subjectId = ? ORDER BY sortOrder ASC;`, [s.id]);

      const lessons: Lesson[] = lessonRows.map((l) => ({
        id: l.id,
        subjectId: l.subjectId,
        title: l.title,
        description: l.description,
        durationSeconds: l.durationSeconds,
        sortOrder: l.sortOrder,
        version: l.version,
        isPublished: Boolean(l.isPublished),
        hasQuiz: Boolean(l.hasQuiz),
        mediaAssetCount: l.mediaAssetCount,
      }));

      subjects.push({
        id: s.id,
        courseId: s.courseId,
        title: s.title,
        description: s.description,
        sortOrder: s.sortOrder,
        totalLessons: s.totalLessons,
        lessons,
      });
    }

    return {
      id: courseRow.id,
      title: courseRow.title,
      description: courseRow.description,
      thumbnailUrl: courseRow.thumbnailUrl,
      version: courseRow.version,
      isPublished: Boolean(courseRow.isPublished),
      totalSubjects: courseRow.totalSubjects,
      subjects,
    };
  },

  /**
   * Lấy chi tiết một bài học từ SQLite
   */
  async getLessonById(lessonId: number): Promise<Lesson | null> {
    const db = await getDatabase();
    const row = await db.getFirstAsync<{
      id: number;
      subjectId: number;
      title: string;
      description: string;
      durationSeconds: number;
      sortOrder: number;
      version: number;
      isPublished: number;
      hasQuiz: number;
      mediaAssetCount: number;
    }>(`SELECT * FROM LocalLessons WHERE id = ?;`, [lessonId]);

    if (!row) return null;

    return {
      id: row.id,
      subjectId: row.subjectId,
      title: row.title,
      description: row.description,
      durationSeconds: row.durationSeconds,
      sortOrder: row.sortOrder,
      version: row.version,
      isPublished: Boolean(row.isPublished),
      hasQuiz: Boolean(row.hasQuiz),
      mediaAssetCount: row.mediaAssetCount,
    };
  },

  /**
   * Xử lý Tombstone Soft-Delete khi Delta Sync Pull báo bài học bị xóa khỏi hệ thống
   */
  async deleteLesson(lessonId: number): Promise<void> {
    const db = await getDatabase();
    await db.runAsync(`DELETE FROM LocalLessons WHERE id = ?;`, [lessonId]);
  },
};
