import { getDb } from '@/db/client';
import type { TodoItem } from '@/types';

type LocalTodoRow = Omit<TodoItem, 'completed'> & {
  completed: number;
};

type LocalTodoSyncRow = {
  synced_at: string | null;
};

function getExistingTodoSyncedAt(id: string): string | null {
  const db = getDb();
  const row = db.getFirstSync<LocalTodoSyncRow>(
    'SELECT synced_at FROM local_todos WHERE id = ?',
    [id],
  );

  return row?.synced_at ?? null;
}

function mapTodoRow(row: LocalTodoRow): TodoItem {
  return {
    ...row,
    completed: row.completed === 1,
  };
}

export function upsertTodo(todo: TodoItem): void {
  const db = getDb();
  const syncedAt = getExistingTodoSyncedAt(todo.id);

  db.runSync(
    `
      INSERT OR REPLACE INTO local_todos (
        id,
        list_id,
        title,
        notes,
        completed,
        completed_at,
        completed_by,
        due_date,
        priority,
        position,
        created_by,
        created_at,
        updated_at,
        deleted_at,
        synced_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `,
    [
      todo.id,
      todo.list_id,
      todo.title,
      todo.notes,
      todo.completed ? 1 : 0,
      todo.completed_at,
      todo.completed_by,
      todo.due_date,
      todo.priority,
      todo.position,
      todo.created_by,
      todo.created_at,
      todo.updated_at,
      todo.deleted_at,
      syncedAt,
    ],
  );
}

export function getTodo(id: string): TodoItem | null {
  const db = getDb();
  const row = db.getFirstSync<LocalTodoRow>(
    `
      SELECT
        id,
        list_id,
        title,
        notes,
        completed,
        completed_at,
        completed_by,
        due_date,
        priority,
        position,
        created_by,
        created_at,
        updated_at,
        deleted_at
      FROM local_todos
      WHERE id = ? AND deleted_at IS NULL
    `,
    [id],
  );

  return row ? mapTodoRow(row) : null;
}

export function getTodos(listId: string): TodoItem[] {
  const db = getDb();
  const rows = db.getAllSync<LocalTodoRow>(
    `
      SELECT
        id,
        list_id,
        title,
        notes,
        completed,
        completed_at,
        completed_by,
        due_date,
        priority,
        position,
        created_by,
        created_at,
        updated_at,
        deleted_at
      FROM local_todos
      WHERE list_id = ? AND deleted_at IS NULL
      ORDER BY position ASC
    `,
    [listId],
  );

  return rows.map(mapTodoRow);
}

export function softDeleteTodo(id: string): void {
  const db = getDb();

  db.runSync('UPDATE local_todos SET deleted_at = ? WHERE id = ?', [
    new Date().toISOString(),
    id,
  ]);
}

export function markTodoSynced(id: string, syncedAt: string): void {
  const db = getDb();

  db.runSync('UPDATE local_todos SET synced_at = ? WHERE id = ?', [syncedAt, id]);
}

export function updateTodoPositions(updates: Array<{ id: string; position: number }>): void {
  if (updates.length === 0) {
    return;
  }

  const db = getDb();

  db.withTransactionSync(() => {
    for (const update of updates) {
      db.runSync('UPDATE local_todos SET position = ? WHERE id = ?', [
        update.position,
        update.id,
      ]);
    }
  });
}
