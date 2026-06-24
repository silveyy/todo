import { beforeEach, describe, expect, it, jest } from '@jest/globals';

import { SyncEngine } from '@/sync/SyncEngine';
import { realtimeSubscriber } from '@/sync/realtimeSubscriber';
import type { TodoItem } from '@/types';
import type { Database } from '@/types/database';

type ListRow = Database['public']['Tables']['lists']['Row'];

type QueueOperation = {
  id: number;
  entity_type: 'todo' | 'list' | 'list_member';
  entity_id: string;
  operation: 'insert' | 'update' | 'delete';
  payload: Record<string, unknown>;
  created_at: string;
  retry_count: number;
};

const mockQueue: QueueOperation[] = [];
const mockTodos: Record<string, TodoItem & { synced_at: string | null }> = {};
const mockLists: Record<string, ListRow & { synced_at: string | null }> = {};
const mockAddEventListener = jest.fn((_listener: unknown) => jest.fn());
const mockCreateTodo = jest.fn();
const mockUpdateTodo = jest.fn();
const mockDeleteTodo = jest.fn();
const mockCreateList = jest.fn();
const mockUpdateList = jest.fn();
const mockDeleteList = jest.fn();

function resetState(): void {
  mockQueue.splice(0, mockQueue.length);

  for (const key of Object.keys(mockTodos)) {
    delete mockTodos[key];
  }

  for (const key of Object.keys(mockLists)) {
    delete mockLists[key];
  }
}

jest.mock('@/db/syncQueueRepository', () => ({
  getNextBatch: jest.fn((limit: number) => mockQueue.slice(0, limit)),
  markProcessed: jest.fn((ids: number[]) => {
    ids.forEach((id) => {
      const index = mockQueue.findIndex((operation) => operation.id === id);
      if (index >= 0) {
        mockQueue.splice(index, 1);
      }
    });
  }),
  incrementRetry: jest.fn((id: number) => {
    const operation = mockQueue.find((item) => item.id === id);
    if (operation) {
      operation.retry_count += 1;
    }
  }),
  clearFailedOperations: jest.fn((maxRetries: number) => {
    for (let index = mockQueue.length - 1; index >= 0; index -= 1) {
      if (mockQueue[index].retry_count >= maxRetries) {
        mockQueue.splice(index, 1);
      }
    }
  }),
  getPendingCount: jest.fn(() => mockQueue.length),
}));

jest.mock('@/db/todoRepository', () => ({
  upsertTodo: jest.fn((todo: TodoItem) => {
    const existing = mockTodos[todo.id];
    mockTodos[todo.id] = {
      ...todo,
      synced_at: existing?.synced_at ?? null,
    };
  }),
  getTodo: jest.fn((id: string) => {
    const todo = mockTodos[id];
    if (!todo || todo.deleted_at) {
      return null;
    }

    const { synced_at: _syncedAt, ...row } = todo;
    return row;
  }),
  softDeleteTodo: jest.fn((id: string) => {
    if (mockTodos[id]) {
      mockTodos[id] = {
        ...mockTodos[id],
        deleted_at: new Date().toISOString(),
      };
    }
  }),
  markTodoSynced: jest.fn((id: string, syncedAt: string) => {
    if (mockTodos[id]) {
      mockTodos[id] = {
        ...mockTodos[id],
        synced_at: syncedAt,
      };
    }
  }),
}));

jest.mock('@/db/listRepository', () => ({
  upsertList: jest.fn((list: ListRow) => {
    const existing = mockLists[list.id];
    mockLists[list.id] = {
      ...list,
      synced_at: existing?.synced_at ?? null,
    };
  }),
  getList: jest.fn((id: string) => {
    const list = mockLists[id];
    if (!list || list.deleted_at) {
      return null;
    }

    const { synced_at: _syncedAt, ...row } = list;
    return row;
  }),
  softDeleteList: jest.fn((id: string) => {
    if (mockLists[id]) {
      mockLists[id] = {
        ...mockLists[id],
        deleted_at: new Date().toISOString(),
      };
    }
  }),
  markListSynced: jest.fn((id: string, syncedAt: string) => {
    if (mockLists[id]) {
      mockLists[id] = {
        ...mockLists[id],
        synced_at: syncedAt,
      };
    }
  }),
}));

jest.mock('@/api/todosApi', () => ({
  createTodo: (listId: string, payload: Record<string, unknown>) => mockCreateTodo(listId, payload),
  updateTodo: (id: string, payload: Record<string, unknown>) => mockUpdateTodo(id, payload),
  deleteTodo: (id: string) => mockDeleteTodo(id),
}));

jest.mock('@/api/listsApi', () => ({
  createList: (title: string) => mockCreateList(title),
  updateList: (id: string, payload: Record<string, unknown>) => mockUpdateList(id, payload),
  deleteList: (id: string) => mockDeleteList(id),
}));

jest.mock('@react-native-community/netinfo', () => ({
  __esModule: true,
  default: {
    addEventListener: mockAddEventListener,
    fetch: jest.fn(async () => ({ isConnected: true, isInternetReachable: true })),
  },
}));

jest.mock('@/api/supabaseClient', () => {
  const mockChannel = {
    on: jest.fn().mockReturnThis(),
    subscribe: jest.fn().mockReturnThis(),
  };

  return {
    supabase: {
      channel: jest.fn(() => ({ ...mockChannel })),
      removeChannel: jest.fn(),
    },
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

type TodoRealtimeTestHandle = {
  handleTodoChange: (payload: {
    eventType: 'INSERT' | 'UPDATE' | 'DELETE';
    new: TodoItem;
    old: TodoItem;
  }) => void;
};

describe('sync flow integration', () => {
  let syncEngine: SyncEngine;
  let subscriber: TodoRealtimeTestHandle;

  beforeEach(() => {
    jest.clearAllMocks();
    resetState();
    syncEngine = new SyncEngine();
    subscriber = realtimeSubscriber as unknown as TodoRealtimeTestHandle;
  });

  it('syncs an offline todo insert when back online', async () => {
    const remoteTodo = createTodo({ id: 'remote-todo-1' });
    mockQueue.push({
      id: 1,
      entity_type: 'todo',
      entity_id: 'local-todo-1',
      operation: 'insert',
      payload: { list_id: 'list-1', title: 'Buy milk', priority: 'medium', position: 1 },
      created_at: '2024-01-01T00:00:00.000Z',
      retry_count: 0,
    });
    mockCreateTodo.mockImplementation(async () => remoteTodo);

    await syncEngine.syncNow();

    expect(mockCreateTodo).toHaveBeenCalledWith('list-1', {
      list_id: 'list-1',
      title: 'Buy milk',
      priority: 'medium',
      position: 1,
    });
    expect(mockQueue).toHaveLength(0);
    expect(mockTodos[remoteTodo.id]?.title).toBe(remoteTodo.title);
    expect(mockTodos[remoteTodo.id]?.updated_at).toBe(remoteTodo.updated_at);
    expect(mockTodos[remoteTodo.id]?.synced_at).not.toBeNull();
  });

  it('applies a newer remote update to the local database', () => {
    mockTodos['todo-1'] = {
      ...createTodo({ updated_at: '2024-01-01T00:00:00.000Z', title: 'Local todo' }),
      synced_at: null,
    };
    const remoteTodo = createTodo({ updated_at: '2024-01-02T00:00:00.000Z', title: 'Remote todo' });

    subscriber.handleTodoChange({
      eventType: 'UPDATE',
      new: remoteTodo,
      old: mockTodos['todo-1'],
    });

    expect(mockTodos['todo-1']?.title).toBe(remoteTodo.title);
    expect(mockTodos['todo-1']?.updated_at).toBe(remoteTodo.updated_at);
    expect(mockTodos['todo-1']?.synced_at).not.toBeNull();
  });

  it('keeps the local database unchanged when the remote update is older', () => {
    const localTodo = createTodo({ updated_at: '2024-01-03T00:00:00.000Z', title: 'Local wins' });
    mockTodos['todo-1'] = { ...localTodo, synced_at: null };
    const remoteTodo = createTodo({ updated_at: '2024-01-02T00:00:00.000Z', title: 'Remote loses' });

    subscriber.handleTodoChange({
      eventType: 'UPDATE',
      new: remoteTodo,
      old: mockTodos['todo-1'],
    });

    expect(mockTodos['todo-1']).toEqual({ ...localTodo, synced_at: null });
  });

  it('keeps failed network operations queued and increments retry count', async () => {
    mockQueue.push({
      id: 1,
      entity_type: 'todo',
      entity_id: 'todo-1',
      operation: 'insert',
      payload: { list_id: 'list-1', title: 'Buy milk' },
      created_at: '2024-01-01T00:00:00.000Z',
      retry_count: 0,
    });
    mockCreateTodo.mockImplementation(async () => {
      throw new Error('Network error');
    });

    await syncEngine.syncNow();

    expect(mockQueue).toHaveLength(1);
    expect(mockQueue[0].retry_count).toBe(1);
  });
});
