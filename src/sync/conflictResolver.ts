import type { ConflictResult } from '@/types';

type Timestamped = { updated_at: string };

export function resolve<T extends Timestamped>(local: T, remote: T): ConflictResult<T> {
  const localTime = new Date(local.updated_at).getTime();
  const remoteTime = new Date(remote.updated_at).getTime();

  if (localTime > remoteTime) {
    return { resolved: local, winner: 'local', reason: 'local updated_at is newer' };
  }

  if (remoteTime > localTime) {
    return { resolved: remote, winner: 'remote', reason: 'remote updated_at is newer' };
  }

  return {
    resolved: remote,
    winner: 'remote',
    reason: 'equal timestamps, remote wins as tiebreaker',
  };
}
