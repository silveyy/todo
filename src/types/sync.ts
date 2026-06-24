import type { SyncStatus } from './models';

export type SyncOperationType = 'insert' | 'update' | 'delete';
export type SyncEntityType = 'list' | 'todo' | 'list_member';

export interface SyncOperation {
  id: number;
  entity_type: SyncEntityType;
  entity_id: string;
  operation: SyncOperationType;
  payload: Record<string, unknown>;
  created_at: string;
  retry_count: number;
}

export interface SyncResult {
  success: boolean;
  processed: number;
  failed: number;
  errors: Array<{ operationId: number; error: string }>;
}

export type ConflictWinner = 'local' | 'remote' | 'merged';

export interface ConflictResult<T> {
  resolved: T;
  winner: ConflictWinner;
  reason: string;
}

export interface SyncState {
  status: SyncStatus;
  pendingCount: number;
  lastSyncedAt: string | null;
  error: string | null;
  dataVersion: number;
}
