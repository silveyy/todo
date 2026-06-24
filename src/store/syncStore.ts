import { create } from 'zustand';

import type { SyncState } from '@/types';

interface SyncStoreState extends SyncState {
  setSyncing: () => void;
  setIdle: () => void;
  setError: (error: string) => void;
  setPendingCount: (count: number) => void;
  setLastSyncedAt: (ts: string) => void;
  incrementPendingCount: () => void;
  decrementPendingCount: (by?: number) => void;
  bumpDataVersion: () => void;
}

export const useSyncStore = create<SyncStoreState>((set) => ({
  status: 'idle',
  pendingCount: 0,
  lastSyncedAt: null,
  error: null,
  dataVersion: 0,
  setSyncing: () => set({ status: 'syncing', error: null }),
  setIdle: () => set({ status: 'idle' }),
  setError: (error) => set({ status: 'error', error }),
  setPendingCount: (count) => set({ pendingCount: count }),
  setLastSyncedAt: (ts) => set({ lastSyncedAt: ts }),
  incrementPendingCount: () => set((state) => ({ pendingCount: state.pendingCount + 1 })),
  decrementPendingCount: (by = 1) =>
    set((state) => ({ pendingCount: Math.max(0, state.pendingCount - by) })),
  bumpDataVersion: () => set((state) => ({ dataVersion: state.dataVersion + 1 })),
}));
