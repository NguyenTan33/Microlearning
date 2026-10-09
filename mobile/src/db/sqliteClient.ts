import * as SQLite from 'expo-sqlite';
import { CREATE_TABLES_DDL } from './schema';

let dbInstance: SQLite.SQLiteDatabase | null = null;

export async function getSQLiteDatabase(): Promise<SQLite.SQLiteDatabase> {
  if (dbInstance) {
    return dbInstance;
  }

  dbInstance = await SQLite.openDatabaseAsync('Microlearning_Local.db');
  
  // Create tables if they do not exist
  await dbInstance.execAsync(CREATE_TABLES_DDL);
  return dbInstance;
}
