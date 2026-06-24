import type { TodoItem } from '@/types';
import {
  getTodo,
  getTodos,
  softDeleteTodo,
  updateTodoPositions,
  upsertTodo,
} from '@/db/todoRepository';

type MockTodoRow = Omit<TodoItem, 'completed'> & {
  completed: number;
  synced_at: string | null;
};

type MockDb = {
  execSync: (sql: string) => void;
  runSync: (sql: string, params?: unknown[]) => void;
  getAllSync: <T>(sql: string, params?: unknown[]) => T[];
  getFirstSync: <T>(sql: string, params?: unknown[]) => T | null;
  withTransactionSync: (callback: () => void) => void;
};

const mockTodos: Record<string, MockTodoRow> = {};
let mockTransactionCalls = 0;

function resetMockState(): void {
  for (const key of Object.keys(mockTodos)) {
    delete mockTodos[key];
  }

  mockTransactionCalls = 0;
}

function mockGetParams(params?: unknown[]): unknown[] {
  if (!params) {
    throw new Error('Expected SQLite params.');
  }

  return params;
}

jest.mock('@/db/client', () => {
  const mockDb: MockDb = {
    execSync: () => undefined,
    runSync: (sql, params) => {
      const trimmedSql = sql.trim();
      const values = mockGetParams(params);

      if (trimmedSql.includes('INSERT OR REPLACE INTO local_todos')) {
        const [
          id,
          listId,
          title,
          notes,
          completed,
          completedAt,
          completedBy,
          dueDate,
          priority,
          position,
          createdBy,
          createdAt,
          updatedAt,
          deletedAt,
          syncedAt,
        ] = values as [
          string,
          string,
          string,
          string | null,
          number,
          string | null,
          string | null,
          string | null,
          TodoItem['priority'],
          number,
          string,
          string,
          string,
          string | null,
          string | null,
        ];

        mockTodos[id] = {
          id,
          list_id: listId,
          title,
          notes,
          completed,
          completed_at: completedAt,
          completed_by: completedBy,
          due_date: dueDate,
          priority,
          position,
          created_by: createdBy,
          created_at: createdAt,
          updated_at: updatedAt,
          deleted_at: deletedAt,
          synced_at: syncedAt,
        };
        return;
      }

      if (trimmedSql === 'UPDATE local_todos SET deleted_at = ? WHERE id = ?') {
        const [deletedAt, id] = values as [string, string];

        if (mockTodos[id]) {
          mockTodos[id] = {
            ...mockTodos[id],
            deleted_at: deletedAt,
          };
        }
        return;
      }

      if (trimmedSql === 'UPDATE local_todos SET synced_at = ? WHERE id = ?') {
        const [syncedAt, id] = values as [string, string];

        if (mockTodos[id]) {
          mockTodos[id] = {
            ...mockTodos[id],
            synced_at: syncedAt,
          };
        }
        return;
      }

      if (trimmedSql === 'UPDATE local_todos SET position = ? WHERE id = ?') {
        const [position, id] = values as [number, string];

        if (mockTodos[id]) {
          mockTodos[id] = {
            ...mockTodos[id],
            position,
          };
        }
        return;
      }

      throw new Error(`Unhandled SQL in test mock: ${trimmedSql}`);
    },
    getAllSync: <T,>(sql: string, params?: unknown[]) => {
      const trimmedSql = sql.trim();
      const values = mockGetParams(params);

      if (trimmedSql.includes('FROM local_todos') && trimmedSql.includes('ORDER BY position ASC')) {
        const [listId] = values as [string];
        const rows = Object.values(mockTodos)
          .filter((todo) => todo.list_id === listId && !todo.deleted_at)
          .sort((left, right) => left.position - right.position)
          .map(({ synced_at: _syncedAt, ...todo }) => ({ ...todo }));

        return rows as T[];
      }

      throw new Error(`Unhandled SQL in test mock: ${trimmedSql}`);
    },
    getFirstSync: <T,>(sql: string, params?: unknown[]) => {
      const trimmedSql = sql.trim();
      const values = mockGetParams(params);
      const [id] = values as [string];

      if (trimmedSql === 'SELECT synced_at FROM local_todos WHERE id = ?') {
        const row = mockTodos[id];
        return (row ? { synced_at: row.synced_at } : null) as T | null;
      }

      if (trimmedSql.includes('FROM local_todos') && trimmedSql.includes('deleted_at IS NULL')) {
        const row = mockTodos[id];

        if (!row || row.deleted_at) {
          return null;
        }

        const { synced_at: _syncedAt, ...todo } = row;
        return { ...todo } as T;
      }

      throw new Error(`Unhandled SQL in test mock: ${trimmedSql}`);
    },
    withTransactionSync: (callback) => {
      mockTransactionCalls += 1;
      callback();
    },
  };

  return {
    getDb: () => mockDb,
  };
});

function createTodo(overrides: Partial<TodoItem> = {}): TodoItem {
  return {
    id: overrides.id ?? 'todo-1',
    list_id: overrides.list_id ?? 'list-1',
    title: overrides.title ?? 'Buy milk',
    notes: overrides.notes ?? null,
    completed: overrides.completed ?? false,
    completed_at: overrides.completed_at ?? null,
    completed_by: overrides.completed_by ?? null,
    due_date: overrides.due_date ?? null,
    priority: overrides.priority ?? 'medium',
    position: overrides.position ?? 1,
    created_by: overrides.created_by ?? 'user-1',
    created_at: overrides.created_at ?? '2024-01-01T00:00:00.000Z',
    updated_at: overrides.updated_at ?? '2024-01-01T00:00:00.000Z',
    deleted_at: overrides.deleted_at ?? null,
  };
}

describe('todoRepository', () => {
  beforeEach(() => {
    resetMockState();
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2024-04-01T09:30:00.000Z'));
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('upsertTodo inserts a new todo with correct boolean conversion', () => {
    const todo = createTodo({ completed: false });

    upsertTodo(todo);

    expect(mockTodos[todo.id]?.completed).toBe(0);
  });

  it('getTodo converts SQLite integer back to boolean', () => {
    mockTodos['todo-1'] = {
      ...createTodo(),
      completed: 1,
      synced_at: null,
    };

    expect(getTodo('todo-1')).toEqual({
      ...createTodo(),
      completed: true,
    });
  });

  it('getTodos returns todos ordered by position and excludes deleted', () => {
    upsertTodo(createTodo({ id: 'todo-1', position: 3, title: 'Third' }));
    upsertTodo(createTodo({ id: 'todo-2', position: 1, title: 'First' }));
    upsertTodo(
      createTodo({
        id: 'todo-3',
        position: 2,
        title: 'Deleted',
        deleted_at: '2024-02-01T00:00:00.000Z',
      }),
    );

    expect(getTodos('list-1')).toEqual([
      createTodo({ id: 'todo-2', position: 1, title: 'First' }),
      createTodo({ id: 'todo-1', position: 3, title: 'Third' }),
    ]);
  });

  it('softDeleteTodo sets deleted_at without deleting the row', () => {
    const todo = createTodo();

    upsertTodo(todo);
    softDeleteTodo(todo.id);

    expect(mockTodos[todo.id]).toBeDefined();
    expect(mockTodos[todo.id]?.deleted_at).toBe('2024-04-01T09:30:00.000Z');
  });

  it('updateTodoPositions updates multiple rows in a transaction', () => {
    upsertTodo(createTodo({ id: 'todo-1', position: 1 }));
    upsertTodo(createTodo({ id: 'todo-2', position: 2 }));

    updateTodoPositions([
      { id: 'todo-1', position: 10 },
      { id: 'todo-2', position: 20 },
    ]);

    expect(mockTransactionCalls).toBe(1);
    expect(mockTodos['todo-1']?.position).toBe(10);
    expect(mockTodos['todo-2']?.position).toBe(20);
  });
});
