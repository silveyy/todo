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
import { markListSynced, upsertList } from '@/db/listRepository';
import { markTodoSynced, upsertTodo } from '@/db/todoRepository';
import { useSyncStore } from '@/store/syncStore';
import type {
  CreateListInput,
  CreateTodoInput,
  SyncOperation,
  UpdateListInput,
  UpdateTodoInput,
} from '@/types';
import type { Database } from '@/types/database';

import { realtimeSubscriber } from './realtimeSubscriber';

const BATCH_SIZE = 20;
const MAX_RETRIES = 5;

type QueuePayload = Record<string, unknown>;
type TodoInsertPayload = CreateTodoInput & {
  id?: string;
  list_id: string;
  completed?: boolean;
  completed_at?: string | null;
  completed_by?: string | null;
  created_by?: string;
  created_at?: string;
  updated_at?: string;
};
type ListInsertPayload = CreateListInput;
type ListRow = Database['public']['Tables']['lists']['Row'];

function asOptionalNullableString(value: unknown, fieldName: string): string | null | undefined {
  if (value === undefined) {
    return undefined;
  }

  if (value === null) {
    return null;
  }

  if (typeof value !== 'string') {
    throw new Error(`Invalid ${fieldName} payload.`);
  }

  return value;
}

function isPriority(value: unknown): value is CreateTodoInput['priority'] {
  return value === 'low' || value === 'medium' || value === 'high';
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function asOptionalString(value: unknown, fieldName: string): string | undefined {
  if (value === undefined || value === null) {
    return undefined;
  }

  if (typeof value !== 'string') {
    throw new Error(`Invalid ${fieldName} payload.`);
  }

  return value;
}

function asOptionalBoolean(value: unknown, fieldName: string): boolean | undefined {
  if (value === undefined || value === null) {
    return undefined;
  }

  if (typeof value !== 'boolean') {
    throw new Error(`Invalid ${fieldName} payload.`);
  }

  return value;
}

function asOptionalNumber(value: unknown, fieldName: string): number | undefined {
  if (value === undefined || value === null) {
    return undefined;
  }

  if (typeof value !== 'number') {
    throw new Error(`Invalid ${fieldName} payload.`);
  }

  return value;
}

function asOptionalNullablePriority(
  value: unknown,
): CreateTodoInput['priority'] | null | undefined {
  if (value === undefined) {
    return undefined;
  }

  if (value === null) {
    return null;
  }

  if (!isPriority(value)) {
    throw new Error('Invalid priority payload.');
  }

  return value;
}

function toTodoInsertPayload(payload: QueuePayload): TodoInsertPayload {
  const listId = payload.list_id;
  const title = payload.title;

  if (typeof listId !== 'string') {
    throw new Error('Invalid todo insert payload: missing list_id.');
  }

  if (typeof title !== 'string') {
    throw new Error('Invalid todo insert payload: missing title.');
  }

  return {
    ...(asOptionalString(payload.id, 'todo id') !== undefined
      ? { id: asOptionalString(payload.id, 'todo id') }
      : {}),
    list_id: listId,
    title,
    ...(asOptionalNullableString(payload.notes, 'todo notes') !== undefined
      ? { notes: asOptionalNullableString(payload.notes, 'todo notes') }
      : {}),
    ...(asOptionalNullableString(payload.due_date, 'todo due_date') !== undefined
      ? { due_date: asOptionalNullableString(payload.due_date, 'todo due_date') }
      : {}),
    ...(asOptionalNullablePriority(payload.priority) !== undefined
      ? { priority: asOptionalNullablePriority(payload.priority) }
      : {}),
    ...(asOptionalNumber(payload.position, 'todo position') !== undefined
      ? { position: asOptionalNumber(payload.position, 'todo position') }
      : {}),
    ...(asOptionalBoolean(payload.completed, 'todo completed') !== undefined
      ? { completed: asOptionalBoolean(payload.completed, 'todo completed') }
      : {}),
    ...(asOptionalNullableString(payload.completed_at, 'todo completed_at') !== undefined
      ? { completed_at: asOptionalNullableString(payload.completed_at, 'todo completed_at') }
      : {}),
    ...(asOptionalNullableString(payload.completed_by, 'todo completed_by') !== undefined
      ? { completed_by: asOptionalNullableString(payload.completed_by, 'todo completed_by') }
      : {}),
    ...(asOptionalString(payload.created_by, 'todo created_by') !== undefined
      ? { created_by: asOptionalString(payload.created_by, 'todo created_by') }
      : {}),
    ...(asOptionalString(payload.created_at, 'todo created_at') !== undefined
      ? { created_at: asOptionalString(payload.created_at, 'todo created_at') }
      : {}),
    ...(asOptionalString(payload.updated_at, 'todo updated_at') !== undefined
      ? { updated_at: asOptionalString(payload.updated_at, 'todo updated_at') }
      : {}),
  };
}

function toUpdateTodoInput(payload: QueuePayload): UpdateTodoInput {
  const update: UpdateTodoInput = {};
  const title = asOptionalString(payload.title, 'todo title');
  const notes = asOptionalNullableString(payload.notes, 'todo notes');
  const dueDate = asOptionalNullableString(payload.due_date, 'todo due_date');
  const priority = asOptionalNullablePriority(payload.priority);
  const position = asOptionalNumber(payload.position, 'todo position');
  const completed = asOptionalBoolean(payload.completed, 'todo completed');
  const completedAt = asOptionalNullableString(payload.completed_at, 'todo completed_at');
  const completedBy = asOptionalNullableString(payload.completed_by, 'todo completed_by');

  if (title !== undefined) {
    update.title = title;
  }
  if (notes !== undefined) {
    update.notes = notes;
  }
  if (dueDate !== undefined) {
    update.due_date = dueDate;
  }
  if (priority !== undefined) {
    update.priority = priority;
  }
  if (position !== undefined) {
    update.position = position;
  }
  if (completed !== undefined) {
    update.completed = completed;
  }
  if (completedAt !== undefined) {
    update.completed_at = completedAt;
  }
  if (completedBy !== undefined) {
    update.completed_by = completedBy;
  }

  return update;
}

function toListInsertPayload(payload: QueuePayload): ListInsertPayload {
  const title = payload.title;

  if (typeof title !== 'string') {
    throw new Error('Invalid list insert payload: missing title.');
  }

  const id = asOptionalString(payload.id, 'list id');
  const ownerId = asOptionalString(payload.owner_id, 'list owner_id');
  const createdAt = asOptionalString(payload.created_at, 'list created_at');
  const updatedAt = asOptionalString(payload.updated_at, 'list updated_at');
  const deletedAt = asOptionalNullableString(payload.deleted_at, 'list deleted_at');

  return {
    title,
    ...(id !== undefined ? { id } : {}),
    ...(ownerId !== undefined ? { owner_id: ownerId } : {}),
    ...(createdAt !== undefined ? { created_at: createdAt } : {}),
    ...(updatedAt !== undefined ? { updated_at: updatedAt } : {}),
    ...(deletedAt !== undefined ? { deleted_at: deletedAt } : {}),
  };
}

function toUpdateListInput(payload: QueuePayload): UpdateListInput {
  const update: UpdateListInput = {};
  const title = asOptionalString(payload.title, 'list title');

  if (title !== undefined) {
    update.title = title;
  }

  return update;
}

export class SyncEngine {
  private unsubscribeNetInfo: (() => void) | null = null;
  private isSyncing = false;

  start(userId: string): void {
    this.stop();
    realtimeSubscriber.subscribe(userId);

    this.unsubscribeNetInfo = NetInfo.addEventListener((state) => {
      if (state.isConnected && state.isInternetReachable) {
        void this.syncNow();
      }
    });

    useSyncStore.getState().setPendingCount(getPendingCount());
    void this.syncNow();
  }

  stop(): void {
    realtimeSubscriber.unsubscribe();
    this.unsubscribeNetInfo?.();
    this.unsubscribeNetInfo = null;
  }

  async syncNow(): Promise<void> {
    if (this.isSyncing) {
      return;
    }

    this.isSyncing = true;

    const { setError, setIdle, setLastSyncedAt, setPendingCount, setSyncing } =
      useSyncStore.getState();
    setSyncing();

    try {
      clearFailedOperations(MAX_RETRIES);

      const attemptedOperationIds = new Set<number>();
      let batch = this.getNextUnattemptedBatch(attemptedOperationIds);
      while (batch.length > 0) {
        batch.forEach((operation) => attemptedOperationIds.add(operation.id));

        const results = await Promise.allSettled(batch.map(async (operation) => this.processOperation(operation)));
        const successIds: number[] = [];

        results.forEach((result, index) => {
          const operation = batch[index];

          if (result.status === 'fulfilled') {
            successIds.push(operation.id);
            return;
          }

          const error = result.reason instanceof Error ? result.reason : new Error('Sync failed');
          if (this.isClientError(error)) {
            successIds.push(operation.id);
            return;
          }

          incrementRetry(operation.id);
        });

        if (successIds.length > 0) {
          markProcessed(successIds);
        }

        batch = this.getNextUnattemptedBatch(attemptedOperationIds);
      }

      setLastSyncedAt(new Date().toISOString());
      setPendingCount(getPendingCount());
      setIdle();
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Sync failed';
      setError(message);
      setPendingCount(getPendingCount());
    } finally {
      this.isSyncing = false;
    }
  }

  private getNextUnattemptedBatch(attemptedOperationIds: Set<number>): SyncOperation[] {
    const pendingCount = getPendingCount();
    let limit = BATCH_SIZE;

    while (limit <= pendingCount + BATCH_SIZE) {
      const candidates = getNextBatch(limit).filter((operation) => !attemptedOperationIds.has(operation.id));

      if (candidates.length > 0) {
        return candidates.slice(0, BATCH_SIZE);
      }

      limit += BATCH_SIZE;
    }

    return [];
  }

  private async processOperation(operation: SyncOperation): Promise<void> {
    if (!isRecord(operation.payload)) {
      throw new Error(`Invalid payload for sync operation ${operation.id}.`);
    }

    switch (operation.entity_type) {
      case 'todo':
        await this.processTodoOp(operation.operation, operation.entity_id, operation.payload);
        return;
      case 'list':
        await this.processListOp(operation.operation, operation.entity_id, operation.payload);
        return;
      default:
        return;
    }
  }

  private async processTodoOp(
    operation: SyncOperation['operation'],
    entityId: string,
    payload: QueuePayload,
  ): Promise<void> {
    const syncedAt = new Date().toISOString();

    switch (operation) {
      case 'insert': {
        const insertPayload = toTodoInsertPayload(payload);
        const createdTodo = await todosApi.createTodo(insertPayload.list_id, insertPayload);
        upsertTodo(createdTodo);
        markTodoSynced(createdTodo.id, syncedAt);
        return;
      }
      case 'update': {
        const updatePayload = toUpdateTodoInput(payload);
        const updatedTodo = await todosApi.updateTodo(entityId, updatePayload);
        upsertTodo(updatedTodo);
        markTodoSynced(updatedTodo.id, syncedAt);
        return;
      }
      case 'delete': {
        await todosApi.deleteTodo(entityId);
        markTodoSynced(entityId, syncedAt);
        return;
      }
    }
  }

  private async processListOp(
    operation: SyncOperation['operation'],
    entityId: string,
    payload: QueuePayload,
  ): Promise<void> {
    const syncedAt = new Date().toISOString();

    switch (operation) {
      case 'insert': {
        const insertPayload = toListInsertPayload(payload);
        const createdList = (await listsApi.createList(insertPayload)) as ListRow;
        upsertList(createdList);
        markListSynced(createdList.id, syncedAt);
        return;
      }
      case 'update': {
        const updatePayload = toUpdateListInput(payload);
        const updatedList = (await listsApi.updateList(entityId, updatePayload)) as ListRow;
        upsertList(updatedList);
        markListSynced(updatedList.id, syncedAt);
        return;
      }
      case 'delete': {
        await listsApi.deleteList(entityId);
        markListSynced(entityId, syncedAt);
        return;
      }
    }
  }

  private isClientError(error: Error): boolean {
    const message = error.message.toLowerCase();
    return (
      message.includes('400') ||
      message.includes('403') ||
      message.includes('404') ||
      message.includes('not found') ||
      message.includes('permission denied') ||
      message.includes('unauthorized')
    );
  }
}

export const syncEngine = new SyncEngine();
