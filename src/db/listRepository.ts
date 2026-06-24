import { getDb } from '@/db/client';
import type { ListMember, TodoList } from '@/types';

type LocalListRow = TodoList;

type LocalListSyncRow = {
  synced_at: string | null;
};

type LocalListMemberRow = ListMember;

function getExistingListSyncedAt(id: string): string | null {
  const db = getDb();
  const row = db.getFirstSync<LocalListSyncRow>(
    'SELECT synced_at FROM local_lists WHERE id = ?',
    [id],
  );

  return row?.synced_at ?? null;
}

function mapListRow(row: LocalListRow): TodoList {
  return row;
}

function mapListMemberRow(row: LocalListMemberRow): ListMember {
  return row;
}

export function upsertList(list: TodoList): void {
  const db = getDb();
  const syncedAt = getExistingListSyncedAt(list.id);

  db.runSync(
    `
      INSERT OR REPLACE INTO local_lists (
        id,
        title,
        owner_id,
        created_at,
        updated_at,
        deleted_at,
        synced_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?)
    `,
    [
      list.id,
      list.title,
      list.owner_id,
      list.created_at,
      list.updated_at,
      list.deleted_at,
      syncedAt,
    ],
  );
}

export function getList(id: string): TodoList | null {
  const db = getDb();
  const row = db.getFirstSync<LocalListRow>(
    `
      SELECT id, title, owner_id, created_at, updated_at, deleted_at
      FROM local_lists
      WHERE id = ? AND deleted_at IS NULL
    `,
    [id],
  );

  return row ? mapListRow(row) : null;
}

export function getLists(userId: string): TodoList[] {
  const db = getDb();
  const rows = db.getAllSync<LocalListRow>(
    `
      SELECT DISTINCT l.id, l.title, l.owner_id, l.created_at, l.updated_at, l.deleted_at
      FROM local_lists AS l
      LEFT JOIN local_list_members AS m ON m.list_id = l.id
      WHERE l.deleted_at IS NULL AND (l.owner_id = ? OR m.user_id = ?)
      ORDER BY l.updated_at DESC
    `,
    [userId, userId],
  );

  return rows.map(mapListRow);
}

export function softDeleteList(id: string): void {
  const db = getDb();

  db.runSync('UPDATE local_lists SET deleted_at = ? WHERE id = ?', [
    new Date().toISOString(),
    id,
  ]);
}

export function markListSynced(id: string, syncedAt: string): void {
  const db = getDb();

  db.runSync('UPDATE local_lists SET synced_at = ? WHERE id = ?', [syncedAt, id]);
}

export function upsertListMember(member: ListMember): void {
  const db = getDb();

  db.runSync(
    `
      INSERT OR REPLACE INTO local_list_members (
        list_id,
        user_id,
        role,
        invited_by,
        joined_at
      ) VALUES (?, ?, ?, ?, ?)
    `,
    [
      member.list_id,
      member.user_id,
      member.role,
      member.invited_by,
      member.joined_at,
    ],
  );
}

export function getListMembers(listId: string): ListMember[] {
  const db = getDb();
  const rows = db.getAllSync<LocalListMemberRow>(
    `
      SELECT list_id, user_id, role, invited_by, joined_at
      FROM local_list_members
      WHERE list_id = ?
      ORDER BY joined_at ASC
    `,
    [listId],
  );

  return rows.map(mapListMemberRow);
}

export function removeListMember(listId: string, userId: string): void {
  const db = getDb();

  db.runSync('DELETE FROM local_list_members WHERE list_id = ? AND user_id = ?', [
    listId,
    userId,
  ]);
}
