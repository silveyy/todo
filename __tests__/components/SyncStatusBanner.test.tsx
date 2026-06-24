import { act, render, screen } from '@testing-library/react-native';
import { afterEach, beforeEach, describe, expect, it, jest } from '@jest/globals';

let mockSyncState = {
  status: 'idle' as 'idle' | 'syncing' | 'error',
  pendingCount: 0,
  lastSyncedAt: null as string | null,
  error: null as string | null,
  isOffline: false,
  forceSync: jest.fn(),
};

let mockNetState = {
  isOnline: true,
  isChecking: false,
};

jest.mock('@/hooks/useSync', () => ({
  useSync: () => mockSyncState,
}));

jest.mock('@/hooks/useNetworkStatus', () => ({
  useNetworkStatus: () => mockNetState,
}));

import { SyncStatusBanner } from '@/components/todos/SyncStatusBanner';

describe('SyncStatusBanner', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    mockSyncState = {
      status: 'idle',
      pendingCount: 0,
      lastSyncedAt: null,
      error: null,
      isOffline: false,
      forceSync: jest.fn(),
    };
    mockNetState = {
      isOnline: true,
      isChecking: false,
    };
  });

  afterEach(() => {
    act(() => {
      jest.runOnlyPendingTimers();
    });
    jest.useRealTimers();
  });

  it('renders nothing when online + idle + pendingCount=0', () => {
    render(<SyncStatusBanner />);

    expect(screen.queryByText(/unsynced change/i)).toBeNull();
    expect(screen.queryByText(/offline/i)).toBeNull();
    expect(screen.queryByText(/Syncing/i)).toBeNull();
  });

  it('shows offline message when isOnline=false', () => {
    mockNetState.isOnline = false;

    render(<SyncStatusBanner />);
    act(() => {
      jest.runOnlyPendingTimers();
    });

    expect(screen.getByText("You're offline — changes will sync when connected")).toBeTruthy();
  });

  it('shows "Syncing…" when status=syncing', () => {
    mockSyncState.status = 'syncing';

    render(<SyncStatusBanner />);
    act(() => {
      jest.runOnlyPendingTimers();
    });

    expect(screen.getByText('Syncing…')).toBeTruthy();
  });

  it('shows pending count when online + pendingCount > 0 + idle', () => {
    mockSyncState.pendingCount = 3;

    render(<SyncStatusBanner />);
    act(() => {
      jest.runOnlyPendingTimers();
    });

    expect(screen.getByText('3 unsynced changes')).toBeTruthy();
  });

  it('shows error message when status=error', () => {
    mockSyncState.status = 'error';
    mockSyncState.error = 'Network timeout';

    render(<SyncStatusBanner />);
    act(() => {
      jest.runOnlyPendingTimers();
    });

    expect(screen.getByText('Sync error: Network timeout')).toBeTruthy();
  });
});
