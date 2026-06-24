import type { RealtimeChannel, RealtimePostgresChangesPayload } from '@supabase/supabase-js';

import { supabase } from '@/api/supabaseClient';
import { getList, markListSynced, softDeleteList, upsertList } from '@/db/listRepository';
import { getTodo, markTodoSynced, softDeleteTodo, upsertTodo } from '@/db/todoRepository';
import type { TodoItem } from '@/types';
import type { Database } from '@/types/database';

import { resolve } from './conflictResolver';

type TodoRow = Database['public']['Tables']['todos']['Row'];
type ListRow = Database['public']['Tables']['lists']['Row'];
type TodoChangePayload = RealtimePostgresChangesPayload<TodoRow>;
type ListChangePayload = RealtimePostgresChangesPayload<ListRow>;

function syncTodoToLocal(todo: TodoItem): void {
  const syncedAt = new Date().toISOString();
  upsertTodo(todo);
  markTodoSynced(todo.id, syncedAt);
}

function syncListToLocal(list: ListRow): void {
  const syncedAt = new Date().toISOString();
  upsertList(list);
  markListSynced(list.id, syncedAt);
}

function getRowId(row: { id?: string } | null | undefined): string | null {
  return typeof row?.id === 'string' ? row.id : null;
}

export class RealtimeSubscriber {
  private channels: RealtimeChannel[] = [];

  subscribe(userId: string): void {
    this.unsubscribe();

    const todosChannel = supabase
      .channel(`todos-changes:${userId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'todos' }, (payload) => {
        this.handleTodoChange(payload as TodoChangePayload);
      })
      .subscribe();

    const listsChannel = supabase
      .channel(`lists-changes:${userId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'lists' }, (payload) => {
        this.handleListChange(payload as ListChangePayload);
      })
      .subscribe();

    this.channels = [todosChannel, listsChannel];
  }

  unsubscribe(): void {
    this.channels.forEach((channel) => {
      void supabase.removeChannel(channel);
    });
    this.channels = [];
  }

  private handleTodoChange(payload: TodoChangePayload): void {
    const { eventType, new: newRow, old: oldRow } = payload;

    if (eventType === 'DELETE') {
      const id = getRowId(oldRow);
      if (id) {
        softDeleteTodo(id);
      }
      return;
    }

    const remote: TodoItem = newRow;
    if (remote.deleted_at) {
      softDeleteTodo(remote.id);
      return;
    }

    if (eventType === 'INSERT') {
      syncTodoToLocal(remote);
      return;
    }

    if (eventType === 'UPDATE') {
      const local = getTodo(remote.id);
      if (!local) {
        syncTodoToLocal(remote);
        return;
      }

      const result = resolve<TodoItem>(local, remote);
      if (result.winner === 'remote') {
        syncTodoToLocal(result.resolved);
      }
    }
  }

  private handleListChange(payload: ListChangePayload): void {
    const { eventType, new: newRow, old: oldRow } = payload;

    if (eventType === 'DELETE') {
      const id = getRowId(oldRow);
      if (id) {
        softDeleteList(id);
      }
      return;
    }

    const remote = newRow;
    if (remote.deleted_at) {
      softDeleteList(remote.id);
      return;
    }

    if (eventType === 'INSERT') {
      syncListToLocal(remote);
      return;
    }

    if (eventType === 'UPDATE') {
      const local = getList(remote.id);
      if (!local) {
        syncListToLocal(remote);
        return;
      }

      const result = resolve<ListRow>(local as ListRow, remote);
      if (result.winner === 'remote') {
        syncListToLocal(result.resolved);
      }
    }
  }
}

export const realtimeSubscriber = new RealtimeSubscriber();
