import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import NetInfo from '@react-native-community/netinfo';

import * as listsApi from '@/api/listsApi';
import * as todosApi from '@/api/todosApi';
import {
  clearFailedOperations,
  getNextBatch,
  getPendingCount,
  incrementRetry,
  markProcessed,
} from '@/db/syncQueueRepository';
import { useSyncStore } from '@/store/syncStore';
import { SyncEngine } from '@/sync/SyncEngine';
import { realtimeSubscriber } from '@/sync/realtimeSubscriber';
import type { SyncOperation, TodoItem } from '@/types';
import type { Database } from '@/types/database';

jest.mock('@/db/syncQueueRepository');
jest.mock('@/api/todosApi', () => ({
  createTodo: jest.fn(),
  updateTodo: jest.fn(),
  deleteTodo: jest.fn(),
}));
jest.mock('@/api/listsApi', () => ({
  createList: jest.fn(),
  updateList: jest.fn(),
  deleteList: jest.fn(),
}));
jest.mock('@/db/todoRepository', () => ({
  upsertTodo: jest.fn(),
  markTodoSynced: jest.fn(),
}));
jest.mock('@/db/listRepository', () => ({
  upsertList: jest.fn(),
  markListSynced: jest.fn(),
}));
jest.mock('@/sync/realtimeSubscriber', () => ({
  realtimeSubscriber: { subscribe: jest.fn(), unsubscribe: jest.fn() },
}));
jest.mock('@react-native-community/netinfo', () => ({
  __esModule: true,
  default: {
    addEventListener: jest.fn(() => jest.fn()),
    fetch: jest.fn(async () => ({ isConnected: true, isInternetReachable: true })),
  },
}));

type ListRow = Database['public']['Tables']['lists']['Row'];

const mockedNetInfo = NetInfo as jest.Mocked<typeof NetInfo>;
const mockedTodosApi = jest.mocked(todosApi);
const mockedListsApi = jest.mocked(listsApi);
const mockedGetNextBatch = jest.mocked(getNextBatch);
const mockedMarkProcessed = jest.mocked(markProcessed);
const mockedIncrementRetry = jest.mocked(incrementRetry);
const mockedClearFailedOperations = jest.mocked(clearFailedOperations);
const mockedGetPendingCount = jest.mocked(getPendingCount);
const mockedRealtimeSubscriber = realtimeSubscriber as jest.Mocked<typeof realtimeSubscriber>;

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

function createList(overrides: Partial<ListRow> = {}): ListRow {
  return {
    id: overrides.id ?? 'list-1',
    title: overrides.title ?? 'Groceries',
    owner_id: overrides.owner_id ?? 'user-1',
    created_at: overrides.created_at ?? '2024-01-01T00:00:00.000Z',
    updated_at: overrides.updated_at ?? '2024-01-01T00:00:00.000Z',
    deleted_at: overrides.deleted_at ?? null,
  };
}

function createOperation(overrides: Partial<SyncOperation> = {}): SyncOperation {
  return {
    id: overrides.id ?? 1,
    entity_type: overrides.entity_type ?? 'todo',
    entity_id: overrides.entity_id ?? 'todo-1',
    operation: overrides.operation ?? 'insert',
    payload: overrides.payload ?? { list_id: 'list-1', title: 'Buy milk' },
    created_at: overrides.created_at ?? '2024-01-01T00:00:00.000Z',
    retry_count: overrides.retry_count ?? 0,
  };
}

describe('SyncEngine', () => {
  let syncEngine: SyncEngine;
  let mockUnsubscribe: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    syncEngine = new SyncEngine();
    mockUnsubscribe = jest.fn();
    mockedNetInfo.addEventListener.mockReturnValue(mockUnsubscribe);
    mockedGetPendingCount.mockReturnValue(0);
    mockedGetNextBatch.mockReturnValue([]);
    useSyncStore.setState({
      status: 'idle',
      pendingCount: 0,
      lastSyncedAt: null,
      error: null,
    });
  });

  it('syncNow processes insert operations and marks them processed', async () => {
    mockedGetNextBatch
      .mockReturnValueOnce([
        createOperation({ id: 1, payload: { list_id: 'list-1', title: 'Buy milk' } }),
        createOperation({ id: 2, entity_id: 'list-1', entity_type: 'list', payload: { title: 'Groceries' } }),
      ])
      .mockReturnValueOnce([]);
    mockedTodosApi.createTodo.mockResolvedValue(createTodo());
    mockedListsApi.createList.mockResolvedValue(createList());

    await syncEngine.syncNow();

    expect(mockedTodosApi.createTodo).toHaveBeenCalledWith('list-1', {
      list_id: 'list-1',
      title: 'Buy milk',
    });
    expect(mockedListsApi.createList).toHaveBeenCalledWith('Groceries');
    expect(mockedMarkProcessed).toHaveBeenCalledWith([1, 2]);
  });

  it('syncNow drops client errors by marking them processed', async () => {
    mockedGetNextBatch.mockReturnValueOnce([createOperation()]).mockReturnValueOnce([]);
    mockedTodosApi.createTodo.mockRejectedValue(new Error('404 Not Found'));

    await syncEngine.syncNow();

    expect(mockedIncrementRetry).not.toHaveBeenCalled();
    expect(mockedMarkProcessed).toHaveBeenCalledWith([1]);
  });

  it('syncNow increments retry for server errors without marking the operation processed', async () => {
    mockedGetNextBatch.mockReturnValueOnce([createOperation()]).mockReturnValueOnce([]);
    mockedTodosApi.createTodo.mockRejectedValue(new Error('500 Internal Server Error'));

    await syncEngine.syncNow();

    expect(mockedIncrementRetry).toHaveBeenCalledWith(1);
    expect(mockedMarkProcessed).not.toHaveBeenCalled();
  });

  it('syncNow clears operations above the retry limit before processing', async () => {
    mockedGetNextBatch.mockReturnValue([]);

    await syncEngine.syncNow();

    expect(mockedClearFailedOperations).toHaveBeenCalledWith(5);
    expect(mockedClearFailedOperations.mock.invocationCallOrder[0]).toBeLessThan(
      mockedGetNextBatch.mock.invocationCallOrder[0],
    );
  });

  it('syncNow updates the sync store pending count after processing', async () => {
    useSyncStore.setState({ pendingCount: 4 });
    mockedGetPendingCount.mockReturnValue(0);
    mockedGetNextBatch.mockReturnValueOnce([createOperation()]).mockReturnValueOnce([]);
    mockedTodosApi.createTodo.mockResolvedValue(createTodo());

    await syncEngine.syncNow();

    expect(useSyncStore.getState().pendingCount).toBe(0);
    expect(useSyncStore.getState().status).toBe('idle');
    expect(useSyncStore.getState().lastSyncedAt).not.toBeNull();
  });

  it('start subscribes to realtime and netinfo', () => {
    syncEngine.start('user-1');

    expect(mockedRealtimeSubscriber.unsubscribe).toHaveBeenCalled();
    expect(mockedRealtimeSubscriber.subscribe).toHaveBeenCalledWith('user-1');
    expect(mockedNetInfo.addEventListener).toHaveBeenCalled();
    expect(useSyncStore.getState().pendingCount).toBe(0);
  });

  it('stop unsubscribes from realtime and netinfo', () => {
    syncEngine.start('user-1');
    mockedRealtimeSubscriber.unsubscribe.mockClear();

    syncEngine.stop();

    expect(mockedRealtimeSubscriber.unsubscribe).toHaveBeenCalledTimes(1);
    expect(mockUnsubscribe).toHaveBeenCalledTimes(1);
  });
});
