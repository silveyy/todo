import { getDb } from '@/db/client';
import type { SyncEntityType, SyncOperation, SyncOperationType } from '@/types';

type SyncOperationRow = Omit<SyncOperation, 'payload'> & {
  payload: string;
};

type PendingCountRow = {
  count: number;
};

function parsePayload(payload: string): Record<string, unknown> {
  const parsed: unknown = JSON.parse(payload);

  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    throw new Error('Invalid sync queue payload.');
  }

  return parsed as Record<string, unknown>;
}

function mapSyncOperationRow(row: SyncOperationRow): SyncOperation {
  return {
    ...row,
    payload: parsePayload(row.payload),
  };
}

export function enqueue(
  entityType: SyncEntityType,
  entityId: string,
  operation: SyncOperationType,
  payload: Record<string, unknown>,
): void {
  const db = getDb();

  db.runSync(
    `
      INSERT INTO sync_queue (
        entity_type,
        entity_id,
        operation,
        payload,
        created_at,
        retry_count
      ) VALUES (?, ?, ?, ?, ?, ?)
    `,
    [entityType, entityId, operation, JSON.stringify(payload), new Date().toISOString(), 0],
  );
}

export function getNextBatch(limit: number): SyncOperation[] {
  const db = getDb();
  const rows = db.getAllSync<SyncOperationRow>(
    `
      SELECT id, entity_type, entity_id, operation, payload, created_at, retry_count
      FROM sync_queue
      ORDER BY id ASC
      LIMIT ?
    `,
    [limit],
  );

  return rows.map(mapSyncOperationRow);
}

export function markProcessed(ids: number[]): void {
  if (ids.length === 0) {
    return;
  }

  const db = getDb();
  const placeholders = ids.map(() => '?').join(', ');

  db.runSync(`DELETE FROM sync_queue WHERE id IN (${placeholders})`, ids);
}

export function incrementRetry(id: number): void {
  const db = getDb();

  db.runSync('UPDATE sync_queue SET retry_count = retry_count + 1 WHERE id = ?', [id]);
}

export function getPendingCount(): number {
  const db = getDb();
  const row = db.getFirstSync<PendingCountRow>('SELECT COUNT(*) AS count FROM sync_queue');

  return row?.count ?? 0;
}

export function clearFailedOperations(maxRetries: number): void {
  const db = getDb();

  db.runSync('DELETE FROM sync_queue WHERE retry_count >= ?', [maxRetries]);
}
