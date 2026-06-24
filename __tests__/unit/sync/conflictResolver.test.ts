import { describe, expect, it } from '@jest/globals';

import { resolve } from '@/sync/conflictResolver';
import type { TodoItem } from '@/types';
import type { Database } from '@/types/database';

type ListRow = Database['public']['Tables']['lists']['Row'];

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

describe('conflictResolver', () => {
  it('returns the local value when local is newer', () => {
    const local = createTodo({ updated_at: '2024-01-02T00:00:00.000Z' });
    const remote = createTodo({ updated_at: '2024-01-01T00:00:00.000Z', title: 'Remote' });

    expect(resolve(local, remote)).toEqual({
      resolved: local,
      winner: 'local',
      reason: 'local updated_at is newer',
    });
  });

  it('returns the remote value when remote is newer', () => {
    const local = createTodo({ updated_at: '2024-01-01T00:00:00.000Z' });
    const remote = createTodo({ updated_at: '2024-01-02T00:00:00.000Z', title: 'Remote' });

    expect(resolve(local, remote)).toEqual({
      resolved: remote,
      winner: 'remote',
      reason: 'remote updated_at is newer',
    });
  });

  it('uses remote as the tiebreaker for equal timestamps', () => {
    const local = createTodo({ title: 'Local' });
    const remote = createTodo({ title: 'Remote' });

    expect(resolve(local, remote)).toEqual({
      resolved: remote,
      winner: 'remote',
      reason: 'equal timestamps, remote wins as tiebreaker',
    });
  });

  it('works with TodoItem shapes', () => {
    const local = createTodo({ updated_at: '2024-01-03T00:00:00.000Z', completed: true });
    const remote = createTodo({ updated_at: '2024-01-02T00:00:00.000Z', completed: false });

    expect(resolve(local, remote).resolved.completed).toBe(true);
  });

  it('works with TodoList shapes', () => {
    const local = createList({ updated_at: '2024-01-01T00:00:00.000Z', title: 'Local list' });
    const remote = createList({ updated_at: '2024-01-02T00:00:00.000Z', title: 'Remote list' });

    expect(resolve(local, remote)).toEqual({
      resolved: remote,
      winner: 'remote',
      reason: 'remote updated_at is newer',
    });
  });
});
