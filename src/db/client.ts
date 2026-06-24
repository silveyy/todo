import * as SQLite from 'expo-sqlite';

let _db: SQLite.SQLiteDatabase | null = null;

export function getDb(): SQLite.SQLiteDatabase {
  if (!_db) {
    _db = SQLite.openDatabaseSync('todo.db');
  }

  return _db;
}

// For testing: allow injecting a mock db
export function setDb(db: SQLite.SQLiteDatabase): void {
  _db = db;
}
