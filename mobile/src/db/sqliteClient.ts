import * as SQLite from 'expo-sqlite';
import { CREATE_TABLES_SQL } from './schema';

const DB_NAME = 'Microlearning_Local.db';

let databaseInstance: SQLite.SQLiteDatabase | null = null;
let initPromise: Promise<SQLite.SQLiteDatabase> | null = null;

/**
 * Mở và khởi tạo cơ sở dữ liệu SQLite cục bộ cho ứng dụng Mobile.
 * Đảm bảo cơ chế Singleton và bọc thực thi trong Promise an toàn.
 */
export async function getDatabase(): Promise<SQLite.SQLiteDatabase> {
  if (databaseInstance) {
    return databaseInstance;
  }

  if (initPromise) {
    return initPromise;
  }

  initPromise = (async () => {
    try {
      const db = await SQLite.openDatabaseAsync(DB_NAME);
      
      // Bật ràng buộc khóa ngoại (Foreign Keys)
      await db.execAsync('PRAGMA foreign_keys = ON;');
      
      // Thực thi tạo 9 bảng CSDL & các Indexes
      await db.execAsync(CREATE_TABLES_SQL);
      
      databaseInstance = db;
      return db;
    } catch (error) {
      console.error('[SQLite] Lỗi khởi tạo cơ sở dữ liệu cục bộ:', error);
      throw error;
    } finally {
      initPromise = null;
    }
  })();

  return initPromise;
}
