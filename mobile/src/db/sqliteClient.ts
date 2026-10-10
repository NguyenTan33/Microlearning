import * as SQLite from 'expo-sqlite';
import { CREATE_TABLES_DDL } from './schema';

let dbInstance: SQLite.SQLiteDatabase | null = null;

async function runSchemaMigrations(db: SQLite.SQLiteDatabase): Promise<void> {
  try {
    // 1. Kiểm tra và bổ sung cột còn thiếu cho bảng LocalLessons
    const lessonColumns = await db.getAllAsync<{ name: string }>('PRAGMA table_info(LocalLessons)');
    const columnNames = new Set(lessonColumns.map((c) => c.name));

    if (!columnNames.has('videoRemoteUrl')) {
      await db.execAsync('ALTER TABLE LocalLessons ADD COLUMN videoRemoteUrl TEXT;');
    }
    if (!columnNames.has('audioTtsUrl')) {
      await db.execAsync('ALTER TABLE LocalLessons ADD COLUMN audioTtsUrl TEXT;');
    }
    if (!columnNames.has('hasQuiz')) {
      await db.execAsync('ALTER TABLE LocalLessons ADD COLUMN hasQuiz INTEGER DEFAULT 0;');
    }
    if (!columnNames.has('durationSeconds')) {
      await db.execAsync('ALTER TABLE LocalLessons ADD COLUMN durationSeconds INTEGER DEFAULT 0;');
    }
    if (!columnNames.has('mediaAssetCount')) {
      await db.execAsync('ALTER TABLE LocalLessons ADD COLUMN mediaAssetCount INTEGER DEFAULT 0;');
    }

    // 2. Kiểm tra bảng LocalCourses
    const courseColumns = await db.getAllAsync<{ name: string }>('PRAGMA table_info(LocalCourses)');
    const courseColNames = new Set(courseColumns.map((c) => c.name));
    if (!courseColNames.has('totalSubjects')) {
      await db.execAsync('ALTER TABLE LocalCourses ADD COLUMN totalSubjects INTEGER DEFAULT 0;');
    }

    // 3. Di chuyển bảng DownloadedMedia nếu cần để tách rời hoàn toàn ràng buộc Foreign Key
    try {
      const fks = await db.getAllAsync<{ table: string }>('PRAGMA foreign_key_list(DownloadedMedia)');
      if (fks && fks.length > 0) {
        // Có ràng buộc foreign key cũ với LocalLessons, tiến hành recreate bảng an toàn giữ nguyên dữ liệu đã tải
        await db.execAsync(`
          CREATE TABLE IF NOT EXISTS DownloadedMedia_New (
            mediaId INTEGER PRIMARY KEY AUTOINCREMENT,
            lessonId INTEGER NOT NULL UNIQUE,
            fileName TEXT NOT NULL,
            localPath TEXT NOT NULL,
            fileSizeBytes INTEGER NOT NULL,
            checksum TEXT NOT NULL,
            downloadedAt TEXT NOT NULL,
            lastPlayedAt TEXT NOT NULL,
            isPinned INTEGER DEFAULT 0,
            status TEXT NOT NULL
          );
          INSERT OR IGNORE INTO DownloadedMedia_New 
            SELECT mediaId, lessonId, fileName, localPath, fileSizeBytes, checksum, downloadedAt, lastPlayedAt, isPinned, status 
            FROM DownloadedMedia;
          DROP TABLE DownloadedMedia;
          ALTER TABLE DownloadedMedia_New RENAME TO DownloadedMedia;
        `);
      }
    } catch (dmErr) {
      console.warn('[sqliteClient] DownloadedMedia FK migration notice:', dmErr);
    }
  } catch (err) {
    console.warn('[sqliteClient] Migration execution warning:', err);
  }
}

export async function getSQLiteDatabase(): Promise<SQLite.SQLiteDatabase> {
  if (dbInstance) {
    return dbInstance;
  }

  dbInstance = await SQLite.openDatabaseAsync('Microlearning_Local.db');

  // Create tables if they do not exist
  await dbInstance.execAsync(CREATE_TABLES_DDL);

  // Auto-migrate schema to ensure legacy local DB instances have all required columns
  await runSchemaMigrations(dbInstance);

  return dbInstance;
}
