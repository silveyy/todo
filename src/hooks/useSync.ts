import { useCallback } from 'react';

import { useSyncStore } from '@/store/syncStore';
import { syncEngine } from '@/sync/SyncEngine';

export function useSync() {
  const { error, lastSyncedAt, pendingCount, status } = useSyncStore();

  const forceSync = useCallback(() => {
    void syncEngine.syncNow();
  }, []);

  return {
    status,
    pendingCount,
    lastSyncedAt,
    error,
    isOffline: status === 'idle' && pendingCount > 0,
    forceSync,
  };
}
