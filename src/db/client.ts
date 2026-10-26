import { Platform } from 'react-native';
import { drizzle, type ExpoSQLiteDatabase } from 'drizzle-orm/expo-sqlite';
import { openDatabaseAsync, type SQLiteDatabase } from 'expo-sqlite';
import * as schema from './schema';

/**
 * Tek SQLite bağlantısı.
 *
 * Açılış async, sorgular senkron:
 * - Web'de wa-sqlite worker'ı ilk senkron çağrıda doğar. Ana thread
 *   `Atomics.wait` ile beklerken worker bundle'ı yüklenemediği için ilk
 *   senkron açılış zaman aşımına düşer. Async açılış worker'ı ve wasm'ı
 *   hazırlar; sonrasında Drizzle'ın senkron API'si güvenle kullanılır.
 * - Native'de de tek kapı olması için aynı sıra izlenir.
 */
export const DATABASE_NAME = 'plot.db';

export type AppDatabase = ExpoSQLiteDatabase<typeof schema>;

let connection: SQLiteDatabase | null = null;
let database: AppDatabase | null = null;
let pending: Promise<AppDatabase> | null = null;

export function initDatabase(): Promise<AppDatabase> {
  if (database) return Promise.resolve(database);
  if (pending) return pending;

  pending = (async () => {
    const opened = await openDatabaseAsync(DATABASE_NAME);
    // WAL yalnızca native: web VFS'te her ortamda desteklenmiyor.
    if (Platform.OS !== 'web') {
      opened.execSync('PRAGMA journal_mode = WAL;');
    }
    opened.execSync('PRAGMA foreign_keys = ON;');

    connection = opened;
    database = drizzle(opened, { schema });
    return database;
  })().catch((error) => {
    pending = null;
    throw error;
  });

  return pending;
}

export function getDb(): AppDatabase {
  if (!database) {
    throw new Error('Veritabanı henüz hazır değil.');
  }
  return database;
}

/** Test ve yedekleme için ham bağlantı (Hafta 5). */
export function getSqlite(): SQLiteDatabase {
  if (!connection) throw new Error('Veritabanı henüz hazır değil.');
  return connection;
}
