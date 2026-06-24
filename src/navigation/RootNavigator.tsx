import { useEffect, useState } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { ActivityIndicator, Linking, StyleSheet, View } from 'react-native';

import * as listsApi from '@/api/listsApi';
import { theme } from '@/components/ui';
import * as listRepo from '@/db/listRepository';
import { useAuth } from '@/hooks/useAuth';
import { AppNavigator } from '@/navigation/AppNavigator';
import { AuthNavigator } from '@/navigation/AuthNavigator';
import { useAuthStore } from '@/store/authStore';
import { useSyncStore } from '@/store/syncStore';
import { syncEngine } from '@/sync/SyncEngine';

function parseInviteToken(url: string | null): string | null {
  if (!url) {
    return null;
  }

  const match = url.match(/^todoapp:\/\/invite\/([^/?#]+)/i);
  return match?.[1] ? decodeURIComponent(match[1]) : null;
}

export function RootNavigator() {
  const { session, loading } = useAuthStore();
  const { initialize } = useAuth();
  const [pendingInviteToken, setPendingInviteToken] = useState<string | null>(null);

  useEffect(() => {
    void initialize();

    void Linking.getInitialURL().then((url) => {
      const token = parseInviteToken(url);
      if (token) {
        setPendingInviteToken(token);
      }
    });

    const subscription = Linking.addEventListener('url', ({ url }) => {
      const token = parseInviteToken(url);
      if (token) {
        setPendingInviteToken(token);
      }
    });

    return () => {
      subscription.remove();
    };
  }, [initialize]);

  useEffect(() => {
    if (!session?.user.id) {
      syncEngine.stop();
      return;
    }

    syncEngine.start(session.user.id);

    return () => {
      syncEngine.stop();
    };
  }, [session?.user.id]);

  useEffect(() => {
    if (!session || !pendingInviteToken) {
      return;
    }

    let isCancelled = false;

    const acceptPendingInvite = async () => {
      try {
        const listId = await listsApi.acceptInvitation(pendingInviteToken);
        const remoteList = await listsApi.getList(listId);

        if (isCancelled || !remoteList) {
          return;
        }

        listRepo.upsertList(remoteList);
        remoteList.members.forEach((member) => {
          listRepo.upsertListMember(member);
        });
        useSyncStore.getState().bumpDataVersion();
      } finally {
        if (!isCancelled) {
          setPendingInviteToken(null);
        }
      }
    };

    void acceptPendingInvite();

    return () => {
      isCancelled = true;
    };
  }, [pendingInviteToken, session]);

  return (
    <NavigationContainer>
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator color={theme.colors.primary} size="large" />
        </View>
      ) : session ? (
        <AppNavigator />
      ) : (
        <AuthNavigator />
      )}
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    alignItems: 'center',
    backgroundColor: theme.colors.white,
    flex: 1,
    justifyContent: 'center',
  },
});
