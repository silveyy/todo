import type { ListMember, TodoList } from '@/types';
import {
  getList,
  getListMembers,
  getLists,
  markListSynced,
  removeListMember,
  softDeleteList,
  upsertList,
  upsertListMember,
} from '@/db/listRepository';

type MockListRow = TodoList & {
  synced_at: string | null;
};

type MockListMemberRow = ListMember;

type MockDb = {
  execSync: (sql: string) => void;
  runSync: (sql: string, params?: unknown[]) => void;
  getAllSync: <T>(sql: string, params?: unknown[]) => T[];
  getFirstSync: <T>(sql: string, params?: unknown[]) => T | null;
  withTransactionSync: (callback: () => void) => void;
};

const mockLists: Record<string, MockListRow> = {};
const mockListMembers: Record<string, MockListMemberRow> = {};

function resetMockState(): void {
  for (const key of Object.keys(mockLists)) {
    delete mockLists[key];
  }

  for (const key of Object.keys(mockListMembers)) {
    delete mockListMembers[key];
  }
}

function mockGetParams(params?: unknown[]): unknown[] {
  if (!params) {
    throw new Error('Expected SQLite params.');
  }

  return params;
}

function mockListMemberKey(listId: string, userId: string): string {
  return `${listId}:${userId}`;
}

jest.mock('@/db/client', () => {
  const mockDb: MockDb = {
    execSync: () => undefined,
    runSync: (sql, params) => {
      const trimmedSql = sql.trim();
      const values = mockGetParams(params);

      if (trimmedSql.includes('INSERT OR REPLACE INTO local_lists')) {
        const [id, title, ownerId, createdAt, updatedAt, deletedAt, syncedAt] = values as [
          string,
          string,
          string,
          string,
          string,
          string | null,
          string | null,
        ];

        mockLists[id] = {
          id,
          title,
          owner_id: ownerId,
          created_at: createdAt,
          updated_at: updatedAt,
          deleted_at: deletedAt,
          synced_at: syncedAt,
        };
        return;
      }

      if (trimmedSql === 'UPDATE local_lists SET deleted_at = ? WHERE id = ?') {
        const [deletedAt, id] = values as [string, string];

        if (mockLists[id]) {
          mockLists[id] = {
            ...mockLists[id],
            deleted_at: deletedAt,
          };
        }
        return;
      }

      if (trimmedSql === 'UPDATE local_lists SET synced_at = ? WHERE id = ?') {
        const [syncedAt, id] = values as [string, string];

        if (mockLists[id]) {
          mockLists[id] = {
            ...mockLists[id],
            synced_at: syncedAt,
          };
        }
        return;
      }

      if (trimmedSql.includes('INSERT OR REPLACE INTO local_list_members')) {
        const [listId, userId, role, invitedBy, joinedAt] = values as [
          string,
          string,
          ListMember['role'],
          string | null,
          string,
        ];

        mockListMembers[mockListMemberKey(listId, userId)] = {
          list_id: listId,
          user_id: userId,
          role,
          invited_by: invitedBy,
          joined_at: joinedAt,
        };
        return;
      }

      if (trimmedSql === 'DELETE FROM local_list_members WHERE list_id = ? AND user_id = ?') {
        const [listId, userId] = values as [string, string];

        delete mockListMembers[mockListMemberKey(listId, userId)];
        return;
      }

      throw new Error(`Unhandled SQL in test mock: ${trimmedSql}`);
    },
    getAllSync: <T,>(sql: string, params?: unknown[]) => {
      const trimmedSql = sql.trim();
      const values = mockGetParams(params);

      if (trimmedSql.includes('FROM local_lists AS l')) {
        const [userId] = values as [string, string];
        const rows = Object.values(mockLists)
          .filter((list) => {
            if (list.deleted_at) {
              return false;
            }

            if (list.owner_id === userId) {
              return true;
            }

            return Object.values(mockListMembers).some(
              (member) => member.list_id === list.id && member.user_id === userId,
            );
          })
          .sort((left, right) => right.updated_at.localeCompare(left.updated_at))
          .map(({ synced_at: _syncedAt, ...list }) => ({ ...list }));

        return rows as T[];
      }

      if (trimmedSql.includes('FROM local_list_members')) {
        const [listId] = values as [string];
        const rows = Object.values(mockListMembers)
          .filter((member) => member.list_id === listId)
          .sort((left, right) => left.joined_at.localeCompare(right.joined_at))
          .map((member) => ({ ...member }));

        return rows as T[];
      }

      throw new Error(`Unhandled SQL in test mock: ${trimmedSql}`);
    },
    getFirstSync: <T,>(sql: string, params?: unknown[]) => {
      const trimmedSql = sql.trim();
      const values = mockGetParams(params);
      const [id] = values as [string];

      if (trimmedSql === 'SELECT synced_at FROM local_lists WHERE id = ?') {
        const row = mockLists[id];
        return (row ? { synced_at: row.synced_at } : null) as T | null;
      }

      if (trimmedSql.includes('FROM local_lists') && trimmedSql.includes('deleted_at IS NULL')) {
        const row = mockLists[id];

        if (!row || row.deleted_at) {
          return null;
        }

        const { synced_at: _syncedAt, ...list } = row;
        return { ...list } as T;
      }

      throw new Error(`Unhandled SQL in test mock: ${trimmedSql}`);
    },
    withTransactionSync: (callback) => {
      callback();
    },
  };

  return {
    getDb: () => mockDb,
  };
});

function createList(overrides: Partial<TodoList> = {}): TodoList {
  return {
    id: overrides.id ?? 'list-1',
    title: overrides.title ?? 'Groceries',
    owner_id: overrides.owner_id ?? 'user-1',
    created_at: overrides.created_at ?? '2024-01-01T00:00:00.000Z',
    updated_at: overrides.updated_at ?? '2024-01-01T00:00:00.000Z',
    deleted_at: overrides.deleted_at ?? null,
  };
}

describe('listRepository', () => {
  beforeEach(() => {
    resetMockState();
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2024-03-01T12:00:00.000Z'));
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('upsertList inserts a new list', () => {
    const list = createList();

    upsertList(list);

    expect(getList(list.id)).toEqual(list);
  });

  it('upsertList updates an existing list', () => {
    upsertList(createList());

    const updatedList = createList({
      title: 'Weekend errands',
      updated_at: '2024-01-02T00:00:00.000Z',
    });

    upsertList(updatedList);

    expect(getList(updatedList.id)).toEqual(updatedList);
  });

  it('getList returns null for non-existent id', () => {
    expect(getList('missing-list')).toBeNull();
  });

  it('getList returns null for soft-deleted list', () => {
    const list = createList({
      deleted_at: '2024-01-03T00:00:00.000Z',
    });

    upsertList(list);

    expect(getList(list.id)).toBeNull();
  });

  it('getLists excludes soft-deleted lists', () => {
    const activeList = createList({ id: 'active-list' });
    const deletedList = createList({
      id: 'deleted-list',
      deleted_at: '2024-01-04T00:00:00.000Z',
    });

    upsertList(activeList);
    upsertList(deletedList);

    expect(getLists('user-1')).toEqual([activeList]);
  });

  it('softDeleteList sets deleted_at', () => {
    const list = createList();

    upsertList(list);
    softDeleteList(list.id);

    expect(getList(list.id)).toBeNull();
    expect(mockLists[list.id]?.deleted_at).toBe('2024-03-01T12:00:00.000Z');
  });

  it('markListSynced updates synced_at', () => {
    const list = createList();
    const syncedAt = '2024-03-02T10:00:00.000Z';

    upsertList(list);
    markListSynced(list.id, syncedAt);

    expect(mockLists[list.id]?.synced_at).toBe(syncedAt);
  });

  it('stores and removes list members', () => {
    const member: ListMember = {
      list_id: 'list-1',
      user_id: 'user-2',
      role: 'editor',
      invited_by: 'user-1',
      joined_at: '2024-02-01T00:00:00.000Z',
    };

    upsertListMember(member);

    expect(getListMembers('list-1')).toEqual([member]);

    removeListMember('list-1', 'user-2');

    expect(getListMembers('list-1')).toEqual([]);
  });
});
