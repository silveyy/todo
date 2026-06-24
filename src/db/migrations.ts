import { getDb } from '@/db/client';

const MIGRATIONS: Array<{ version: number; sql: string }> = [
  {
    version: 1,
    sql: `
      CREATE TABLE IF NOT EXISTS schema_version (version INTEGER NOT NULL);

      CREATE TABLE IF NOT EXISTS local_lists (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        owner_id TEXT NOT NULL,
        created_at TEXT,
        updated_at TEXT,
        deleted_at TEXT,
        synced_at TEXT
      );

      CREATE TABLE IF NOT EXISTS local_list_members (
        list_id TEXT NOT NULL,
        user_id TEXT NOT NULL,
        role TEXT NOT NULL,
        invited_by TEXT,
        joined_at TEXT,
        PRIMARY KEY (list_id, user_id)
      );

      CREATE TABLE IF NOT EXISTS local_todos (
        id TEXT PRIMARY KEY,
        list_id TEXT NOT NULL,
        title TEXT NOT NULL,
        notes TEXT,
        completed INTEGER NOT NULL DEFAULT 0,
        completed_at TEXT,
        completed_by TEXT,
        due_date TEXT,
        priority TEXT,
        position REAL NOT NULL DEFAULT 0,
        created_by TEXT NOT NULL,
        created_at TEXT,
        updated_at TEXT,
        deleted_at TEXT,
        synced_at TEXT
      );

      CREATE INDEX IF NOT EXISTS idx_local_todos_list_id ON local_todos(list_id, deleted_at);
      CREATE INDEX IF NOT EXISTS idx_local_todos_updated_at ON local_todos(updated_at);
      CREATE INDEX IF NOT EXISTS idx_local_lists_owner ON local_lists(owner_id);

      CREATE TABLE IF NOT EXISTS sync_queue (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        entity_type TEXT NOT NULL,
        entity_id TEXT NOT NULL,
        operation TEXT NOT NULL,
        payload TEXT NOT NULL,
        created_at TEXT NOT NULL,
        retry_count INTEGER NOT NULL DEFAULT 0
      );
    `,
  },
];

type SchemaVersionRow = {
  version: number;
};

function getCurrentSchemaVersion(): number {
  const db = getDb();

  db.execSync('CREATE TABLE IF NOT EXISTS schema_version (version INTEGER NOT NULL);');

  const row = db.getFirstSync<SchemaVersionRow>(
    'SELECT version FROM schema_version ORDER BY version DESC LIMIT 1',
  );

  return row?.version ?? 0;
}

export function runMigrations(): void {
  const db = getDb();
  const currentVersion = getCurrentSchemaVersion();
  const pendingMigrations = [...MIGRATIONS]
    .sort((left, right) => left.version - right.version)
    .filter((migration) => migration.version > currentVersion);

  if (pendingMigrations.length === 0) {
    return;
  }

  try {
    db.withTransactionSync(() => {
      for (const migration of pendingMigrations) {
        db.execSync(migration.sql);
        db.runSync('INSERT INTO schema_version (version) VALUES (?)', [migration.version]);
      }
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown migration error';
    throw new Error(`Failed to run database migrations: ${message}`);
  }
}
