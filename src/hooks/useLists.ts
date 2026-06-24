import { useCallback, useEffect, useState } from 'react';
import NetInfo from '@react-native-community/netinfo';

import * as listsApi from '@/api/listsApi';
import * as listRepo from '@/db/listRepository';
import * as syncQueueRepo from '@/db/syncQueueRepository';
import { useAuthStore } from '@/store/authStore';
import { useSyncStore } from '@/store/syncStore';
import { syncEngine } from '@/sync/SyncEngine';
import type { ListMember, ListRole, TodoList, UpdateListInput } from '@/types';

type UseListMembersResult = {
  members: ListMember[];
  loading: boolean;
  error: string | null;
  refresh: () => void;
};

type UseListsResult = {
  lists: TodoList[];
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  createList: (title: string) => TodoList;
  updateList: (id: string, patch: UpdateListInput) => void;
  deleteList: (id: string) => void;
  inviteToList: (
    listId: string,
    email: string,
    role: Exclude<ListRole, 'owner'>,
  ) => Promise<string>;
};

function getErrorMessage(error: unknown, fallback: string): string {
  return error instanceof Error ? error.message : fallback;
}

function buildCreateList(title: string, ownerId: string): TodoList {
  const now = new Date().toISOString();

  return {
    id: generateUUID(),
    title,
    owner_id: ownerId,
    created_at: now,
    updated_at: now,
    deleted_at: null,
  };
}

function normalizeListTitle(title: string): string {
  return title.trim();
}

export function useLists(): UseListsResult {
  const [lists, setLists] = useState<TodoList[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const profile = useAuthStore((state) => state.profile);
  const dataVersion = useSyncStore((state) => state.dataVersion);
  const syncIfOnline = useCallback(() => {
    void NetInfo.fetch().then((state) => {
      if (state.isConnected && state.isInternetReachable !== false) {
        return syncEngine.syncNow();
      }

      return undefined;
    });
  }, []);

  const refresh = useCallback(async () => {
    if (!profile) {
      setLists([]);
      setError(null);
      setLoading(false);
      return;
    }

    setError(null);

    let localLists: TodoList[] = [];

    try {
      localLists = listRepo.getLists(profile.id);
      setLists(localLists);
    } catch (refreshError) {
      setError(getErrorMessage(refreshError, 'Failed to load lists.'));
      setLoading(false);
      return;
    }

    try {
      const remoteLists = await listsApi.getLists();
      const detailedLists = await Promise.all(remoteLists.map(async (list) => listsApi.getList(list.id)));

      detailedLists.forEach((remoteList) => {
        if (!remoteList) {
          return;
        }

        listRepo.upsertList(remoteList);
        remoteList.members.forEach((member) => {
          listRepo.upsertListMember(member);
        });
      });

      useSyncStore.getState().bumpDataVersion();
      setLists(listRepo.getLists(profile.id));
      setError(null);
    } catch (refreshError) {
      if (localLists.length === 0) {
        setError(getErrorMessage(refreshError, 'Failed to sync lists.'));
      }
    } finally {
      setLoading(false);
    }
  }, [profile]);

  useEffect(() => {
    setLoading(true);
    void refresh();
  }, [refresh]);

  useEffect(() => {
    if (!profile) {
      return;
    }

    try {
      setLists(listRepo.getLists(profile.id));
    } catch (refreshError) {
      setError(getErrorMessage(refreshError, 'Failed to load lists.'));
    }
  }, [dataVersion, profile]);

  const createList = useCallback(
    (title: string): TodoList => {
      if (!profile) {
        throw new Error('Not authenticated.');
      }

      const normalizedTitle = normalizeListTitle(title);

      if (!normalizedTitle) {
        throw new Error('List title is required.');
      }

      const newList = buildCreateList(normalizedTitle, profile.id);

      try {
        listRepo.upsertList(newList);
        listRepo.upsertListMember({
          list_id: newList.id,
          user_id: profile.id,
          role: 'owner',
          invited_by: null,
          joined_at: newList.created_at,
        });
        syncQueueRepo.enqueue('list', newList.id, 'insert', { ...newList });
        useSyncStore.getState().incrementPendingCount();
        useSyncStore.getState().bumpDataVersion();
        syncIfOnline();
        setError(null);
        void refresh();
        return newList;
      } catch (createError) {
        const message = getErrorMessage(createError, 'Failed to create list.');
        setError(message);
        throw new Error(message);
      }
    },
    [profile, refresh, syncIfOnline],
  );

  const updateList = useCallback(
    (id: string, patch: UpdateListInput): void => {
      const normalizedTitle =
        typeof patch.title === 'string' ? normalizeListTitle(patch.title) : undefined;

      if (patch.title !== undefined && !normalizedTitle) {
        throw new Error('List title is required.');
      }

      const existing = listRepo.getList(id);

      if (!existing) {
        throw new Error('List not found.');
      }

      const updated: TodoList = {
        ...existing,
        ...(normalizedTitle !== undefined ? { title: normalizedTitle } : {}),
        updated_at: new Date().toISOString(),
      };

      const queuePatch: UpdateListInput = normalizedTitle !== undefined ? { title: normalizedTitle } : {};

      try {
        listRepo.upsertList(updated);
        if (Object.keys(queuePatch).length > 0) {
          syncQueueRepo.enqueue('list', id, 'update', queuePatch);
          useSyncStore.getState().incrementPendingCount();
          syncIfOnline();
        }
        useSyncStore.getState().bumpDataVersion();
        setError(null);
        void refresh();
      } catch (updateError) {
        const message = getErrorMessage(updateError, 'Failed to update list.');
        setError(message);
        throw new Error(message);
      }
    },
    [refresh, syncIfOnline],
  );

  const deleteList = useCallback(
    (id: string): void => {
      try {
        listRepo.softDeleteList(id);
        syncQueueRepo.enqueue('list', id, 'delete', {});
        useSyncStore.getState().incrementPendingCount();
        useSyncStore.getState().bumpDataVersion();
        syncIfOnline();
        setError(null);
        void refresh();
      } catch (deleteError) {
        const message = getErrorMessage(deleteError, 'Failed to delete list.');
        setError(message);
        throw new Error(message);
      }
    },
    [refresh],
  );

  const inviteToList = useCallback(
    async (
      listId: string,
      email: string,
      role: Exclude<ListRole, 'owner'>,
    ): Promise<string> => {
      const normalizedEmail = email.trim().toLowerCase();

      if (!normalizedEmail) {
        throw new Error('Email is required.');
      }

      const invitation = await listsApi.inviteToList(listId, normalizedEmail, role);

      if (!invitation.token) {
        throw new Error('Invitation token was not returned.');
      }

      setError(null);
      return `todoapp://invite/${invitation.token}`;
    },
    [],
  );

  return {
    lists,
    loading,
    error,
    refresh,
    createList,
    updateList,
    deleteList,
    inviteToList,
  };
}

export function useListMembers(listId: string): UseListMembersResult {
  const [members, setMembers] = useState<ListMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(() => {
    if (!listId) {
      setMembers([]);
      setError(null);
      setLoading(false);
      return;
    }

    setError(null);

    try {
      setMembers(listRepo.getListMembers(listId));
    } catch (refreshError) {
      setError(getErrorMessage(refreshError, 'Failed to load list members.'));
    } finally {
      setLoading(false);
    }
  }, [listId]);

  useEffect(() => {
    setLoading(true);
    refresh();
  }, [refresh]);

  return {
    members,
    loading,
    error,
    refresh,
  };
}

function generateUUID(): string {
  if (typeof globalThis.crypto?.randomUUID === 'function') {
    return globalThis.crypto.randomUUID();
  }

  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (char) => {
    const random = Math.floor(Math.random() * 16);
    const value = char === 'x' ? random : (random & 0x3) | 0x8;
    return value.toString(16);
  });
}
