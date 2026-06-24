import { useCallback, useEffect, useState } from 'react';
import NetInfo from '@react-native-community/netinfo';

import * as todosApi from '@/api/todosApi';
import { IS_SUPABASE_CONFIGURED } from '@/api/supabaseClient';
import * as syncQueueRepository from '@/db/syncQueueRepository';
import * as todoRepository from '@/db/todoRepository';
import { useAuthStore } from '@/store/authStore';
import { useSyncStore } from '@/store/syncStore';
import { syncEngine } from '@/sync/SyncEngine';
import type { CreateTodoInput, TodoItem, UpdateTodoInput } from '@/types';

function generateUUID(): string {
  return crypto.randomUUID();
}

function nowIsoString(): string {
  return new Date().toISOString();
}

function getOptionalStringField(
  patch: UpdateTodoInput,
  field: 'notes' | 'due_date',
  currentValue: string | null,
): string | null {
  if (!Object.prototype.hasOwnProperty.call(patch, field)) {
    return currentValue;
  }

  const nextValue = patch[field];
  return typeof nextValue === 'string' && nextValue.length > 0 ? nextValue : null;
}

function getOptionalPriorityField(
  patch: UpdateTodoInput,
  currentValue: TodoItem['priority'],
): TodoItem['priority'] {
  if (!Object.prototype.hasOwnProperty.call(patch, 'priority')) {
    return currentValue;
  }

  return patch.priority ?? null;
}

export function useTodos(listId: string) {
  const profile = useAuthStore((state) => state.profile);
  const incrementPendingCount = useSyncStore((state) => state.incrementPendingCount);
  const dataVersion = useSyncStore((state) => state.dataVersion);
  const [todos, setTodos] = useState<TodoItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadTodos = useCallback((showLoading: boolean) => {
    if (showLoading) {
      setLoading(true);
    }

    try {
      const nextTodos = todoRepository.getTodos(listId);
      setTodos(nextTodos);
      setError(null);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Failed to load todos.');
    } finally {
      if (showLoading) {
        setLoading(false);
      }
    }
  }, [listId]);

  const syncIfOnline = useCallback(() => {
    void NetInfo.fetch().then((state) => {
      if (state.isConnected && state.isInternetReachable !== false) {
        return syncEngine.syncNow();
      }

      return undefined;
    });
  }, []);

  const refresh = useCallback(async () => {
    setLoading(true);
    let localTodos: TodoItem[] = [];

    try {
      localTodos = todoRepository.getTodos(listId);
      setTodos(localTodos);
      setError(null);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Failed to load todos.');
      setLoading(false);
      return;
    }

    // In local mode there is no remote to sync from.
    if (!IS_SUPABASE_CONFIGURED) {
      setLoading(false);
      return;
    }

    try {
      const remoteTodos = await todosApi.getTodos(listId);
      remoteTodos.forEach((todo) => {
        todoRepository.upsertTodo(todo);
      });
      useSyncStore.getState().bumpDataVersion();
      loadTodos(false);
      setError(null);
    } catch (loadError) {
      if (localTodos.length === 0) {
        setError(loadError instanceof Error ? loadError.message : 'Failed to sync todos.');
      }
    } finally {
      setLoading(false);
    }
  }, [listId, loadTodos]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  useEffect(() => {
    loadTodos(false);
  }, [dataVersion, loadTodos]);

  const createTodo = useCallback((data: CreateTodoInput): TodoItem => {
    if (!profile) {
      throw new Error('You must be signed in to create a todo.');
    }

    const timestamp = nowIsoString();
    const existingTodos = todoRepository.getTodos(listId);
    const position =
      data.position ??
      (existingTodos.length > 0
        ? Math.max(...existingTodos.map((todo) => todo.position)) + 1
        : 0);
    const todo: TodoItem = {
      id: generateUUID(),
      list_id: listId,
      title: data.title,
      notes: data.notes ?? null,
      completed: false,
      completed_at: null,
      completed_by: null,
      due_date: data.due_date ?? null,
      priority: data.priority ?? 'medium',
      position,
      created_by: profile.id,
      created_at: timestamp,
      updated_at: timestamp,
      deleted_at: null,
    };

    try {
      todoRepository.upsertTodo(todo);
      if (IS_SUPABASE_CONFIGURED) {
        syncQueueRepository.enqueue('todo', todo.id, 'insert', {
          id: todo.id,
          list_id: todo.list_id,
          title: todo.title,
          notes: todo.notes,
          completed: todo.completed,
          completed_at: todo.completed_at,
          completed_by: todo.completed_by,
          due_date: todo.due_date,
          priority: todo.priority,
          position: todo.position,
          created_by: todo.created_by,
          created_at: todo.created_at,
          updated_at: todo.updated_at,
        });
        incrementPendingCount();
        syncIfOnline();
      }
      useSyncStore.getState().bumpDataVersion();
      syncIfOnline();
      loadTodos(false);
      return todo;
    } catch (createError) {
      const message = createError instanceof Error ? createError.message : 'Failed to create todo.';
      setError(message);
      throw createError;
    }
  }, [incrementPendingCount, listId, loadTodos, profile, syncIfOnline]);

  const updateTodo = useCallback((id: string, patch: UpdateTodoInput): void => {
    const existingTodo = todoRepository.getTodo(id);

    if (!existingTodo) {
      throw new Error('Todo not found.');
    }

    const updatedTodo: TodoItem = {
      ...existingTodo,
      ...(Object.prototype.hasOwnProperty.call(patch, 'title') ? { title: patch.title ?? existingTodo.title } : {}),
      notes: getOptionalStringField(patch, 'notes', existingTodo.notes),
      due_date: getOptionalStringField(patch, 'due_date', existingTodo.due_date),
      priority: getOptionalPriorityField(patch, existingTodo.priority),
      ...(Object.prototype.hasOwnProperty.call(patch, 'position') ? { position: patch.position ?? existingTodo.position } : {}),
      ...(Object.prototype.hasOwnProperty.call(patch, 'completed') ? { completed: patch.completed ?? existingTodo.completed } : {}),
      ...(Object.prototype.hasOwnProperty.call(patch, 'completed_at')
        ? { completed_at: patch.completed_at ?? null }
        : {}),
      ...(Object.prototype.hasOwnProperty.call(patch, 'completed_by')
        ? { completed_by: patch.completed_by ?? null }
        : {}),
      updated_at: nowIsoString(),
    };

    try {
      todoRepository.upsertTodo(updatedTodo);
      if (IS_SUPABASE_CONFIGURED) {
        syncQueueRepository.enqueue('todo', id, 'update', {
          ...(Object.prototype.hasOwnProperty.call(patch, 'title') ? { title: updatedTodo.title } : {}),
          ...(Object.prototype.hasOwnProperty.call(patch, 'notes') ? { notes: updatedTodo.notes } : {}),
          ...(Object.prototype.hasOwnProperty.call(patch, 'due_date') ? { due_date: updatedTodo.due_date } : {}),
          ...(Object.prototype.hasOwnProperty.call(patch, 'priority') ? { priority: updatedTodo.priority } : {}),
          ...(Object.prototype.hasOwnProperty.call(patch, 'position') ? { position: updatedTodo.position } : {}),
          ...(Object.prototype.hasOwnProperty.call(patch, 'completed') ? { completed: updatedTodo.completed } : {}),
          ...(Object.prototype.hasOwnProperty.call(patch, 'completed_at') ? { completed_at: updatedTodo.completed_at } : {}),
          ...(Object.prototype.hasOwnProperty.call(patch, 'completed_by') ? { completed_by: updatedTodo.completed_by } : {}),
          updated_at: updatedTodo.updated_at,
        });
        incrementPendingCount();
        syncIfOnline();
      }
      useSyncStore.getState().bumpDataVersion();
      syncIfOnline();
      loadTodos(false);
      setError(null);
    } catch (updateError) {
      const message = updateError instanceof Error ? updateError.message : 'Failed to update todo.';
      setError(message);
      throw updateError;
    }
  }, [incrementPendingCount, loadTodos, syncIfOnline]);

  const completeTodo = useCallback((id: string): void => {
    if (!profile) {
      throw new Error('You must be signed in to complete a todo.');
    }

    updateTodo(id, {
      completed: true,
      completed_at: nowIsoString(),
      completed_by: profile.id,
    });
  }, [profile, updateTodo]);

  const uncompleteTodo = useCallback((id: string): void => {
    updateTodo(id, {
      completed: false,
      completed_at: null,
      completed_by: null,
    });
  }, [updateTodo]);

  const deleteTodo = useCallback((id: string): void => {
    try {
      todoRepository.softDeleteTodo(id);
      if (IS_SUPABASE_CONFIGURED) {
        syncQueueRepository.enqueue('todo', id, 'delete', { id, deleted_at: nowIsoString() });
        incrementPendingCount();
        syncIfOnline();
      }
      useSyncStore.getState().bumpDataVersion();
      syncIfOnline();
      loadTodos(false);
      setError(null);
    } catch (deleteError) {
      const message = deleteError instanceof Error ? deleteError.message : 'Failed to delete todo.';
      setError(message);
      throw deleteError;
    }
  }, [incrementPendingCount, loadTodos, syncIfOnline]);

  const reorderTodos = useCallback((orderedIds: string[]): void => {
    const updates = orderedIds.map((id, index) => ({ id, position: index * 1000 }));

    try {
      todoRepository.updateTodoPositions(updates);
      if (IS_SUPABASE_CONFIGURED) {
        for (const update of updates) {
          syncQueueRepository.enqueue('todo', update.id, 'update', {
            position: update.position,
            updated_at: nowIsoString(),
          });
          incrementPendingCount();
        }
        syncIfOnline();
      }
      useSyncStore.getState().bumpDataVersion();
      syncIfOnline();
      loadTodos(false);
      setError(null);
    } catch (reorderError) {
      const message = reorderError instanceof Error ? reorderError.message : 'Failed to reorder todos.';
      setError(message);
      throw reorderError;
    }
  }, [incrementPendingCount, loadTodos, syncIfOnline]);

  return {
    todos,
    loading,
    error,
    refresh,
    createTodo,
    updateTodo,
    completeTodo,
    uncompleteTodo,
    deleteTodo,
    reorderTodos,
  };
}
