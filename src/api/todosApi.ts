import { supabase } from '@/api/supabaseClient';
import type { CreateTodoInput, TodoItem, UpdateTodoInput } from '@/types';
import type { Database } from '@/types/database';

type TodoInsertPayload = Database['public']['Tables']['todos']['Insert'];
type TodoUpdatePayload = Database['public']['Tables']['todos']['Update'];
type SyncCreateTodoInput = CreateTodoInput &
  Partial<
    Pick<
      TodoItem,
      'id' | 'completed' | 'completed_at' | 'completed_by' | 'created_by' | 'created_at' | 'updated_at'
    >
  >;

async function requireCurrentUser() {
  const { data, error } = await supabase.auth.getUser();

  if (error) {
    throw new Error(`Failed to get current user: ${error.message}`);
  }

  if (!data.user) {
    throw new Error('No authenticated user found.');
  }

  return data.user;
}

export async function getTodos(listId: string): Promise<TodoItem[]> {
  const { data, error } = await supabase
    .from('todos')
    .select('*')
    .eq('list_id', listId)
    .is('deleted_at', null)
    .order('position', { ascending: true })
    .order('completed', { ascending: true });

  if (error) {
    throw new Error(`Failed to fetch todos: ${error.message}`);
  }

  return data ?? [];
}

export async function createTodo(listId: string, data: SyncCreateTodoInput): Promise<TodoItem> {
  const user = await requireCurrentUser();
  const insertPayload: TodoInsertPayload = {
    ...(data.id ? { id: data.id } : {}),
    list_id: listId,
    title: data.title,
    notes: data.notes ?? null,
    due_date: data.due_date ?? null,
    priority: data.priority ?? 'medium',
    position: data.position ?? Date.now(),
    completed: data.completed ?? false,
    completed_at: data.completed_at ?? null,
    completed_by: data.completed_by ?? null,
    created_by: data.created_by ?? user.id,
    created_at: data.created_at,
    updated_at: data.updated_at,
  };

  const { data: todo, error } = await supabase
    .from('todos')
    .insert(insertPayload)
    .select()
    .single();

  if (error || !todo) {
    throw new Error(`Failed to create todo: ${error?.message ?? 'Unknown error.'}`);
  }

  return todo;
}

export async function updateTodo(id: string, patch: UpdateTodoInput): Promise<TodoItem> {
  const user = await requireCurrentUser();
  const updatePayload: TodoUpdatePayload = {
    ...patch,
  };

  if (patch.completed === true) {
    updatePayload.completed_at = patch.completed_at ?? new Date().toISOString();
    updatePayload.completed_by = patch.completed_by ?? user.id;
  }

  if (patch.completed === false) {
    updatePayload.completed_at = null;
    updatePayload.completed_by = null;
  }

  const { data, error } = await supabase
    .from('todos')
    .update(updatePayload)
    .eq('id', id)
    .select()
    .single();

  if (error || !data) {
    throw new Error(`Failed to update todo: ${error?.message ?? 'Unknown error.'}`);
  }

  return data;
}

export async function deleteTodo(id: string): Promise<void> {
  const { error } = await supabase
    .from('todos')
    .update({
      deleted_at: new Date().toISOString(),
    })
    .eq('id', id);

  if (error) {
    throw new Error(`Failed to delete todo: ${error.message}`);
  }
}

export async function reorderTodos(
  updates: Array<{ id: string; position: number }>,
): Promise<void> {
  await Promise.all(
    updates.map(async ({ id, position }) => {
      const { error } = await supabase
        .from('todos')
        .update({ position })
        .eq('id', id);

      if (error) {
        throw new Error(`Failed to reorder todo ${id}: ${error.message}`);
      }
    }),
  );
}
