import { useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Animated, StyleSheet, Text } from 'react-native';

import { IS_SUPABASE_CONFIGURED } from '@/api/supabaseClient';
import { colors, radii, spacing, typography } from '@/components/ui';
import { useNetworkStatus } from '@/hooks/useNetworkStatus';
import { useSync } from '@/hooks/useSync';

function getPendingLabel(pendingCount: number): string {
  return `${pendingCount} unsynced change${pendingCount === 1 ? '' : 's'}`;
}

export function SyncStatusBanner() {
  // In local mode there is no sync — hide the banner entirely.
  if (!IS_SUPABASE_CONFIGURED) return null;
  const { isOnline } = useNetworkStatus();
  const { error, pendingCount, status } = useSync();
  const opacity = useRef(new Animated.Value(0)).current;

  const bannerState = useMemo(() => {
    if (status === 'error') {
      return {
        backgroundColor: '#FEE2E2',
        kind: 'error' as const,
        text: `Sync error: ${error ?? 'Unknown error'}`,
        textColor: colors.error,
        showSpinner: false,
      };
    }

    if (!isOnline) {
      return {
        backgroundColor: '#FFEDD5',
        kind: 'offline' as const,
        text: "You're offline — changes will sync when connected",
        textColor: '#C2410C',
        showSpinner: false,
      };
    }

    if (status === 'syncing') {
      return {
        backgroundColor: '#DBEAFE',
        kind: 'syncing' as const,
        text: 'Syncing…',
        textColor: colors.info,
        showSpinner: true,
      };
    }

    if (pendingCount > 0) {
      return {
        backgroundColor: '#FEF3C7',
        kind: 'pending' as const,
        text: getPendingLabel(pendingCount),
        textColor: '#92400E',
        showSpinner: false,
      };
    }

    return null;
  }, [error, isOnline, pendingCount, status]);

  const [isRendered, setIsRendered] = useState(Boolean(bannerState));

  useEffect(() => {
    if (bannerState) {
      setIsRendered(true);
      Animated.timing(opacity, {
        toValue: 1,
        duration: 180,
        useNativeDriver: true,
      }).start();
      return;
    }

    Animated.timing(opacity, {
      toValue: 0,
      duration: 180,
      useNativeDriver: true,
    }).start(({ finished }) => {
      if (finished) {
        setIsRendered(false);
      }
    });
  }, [bannerState, opacity]);

  if (!bannerState && !isRendered) {
    return null;
  }

  return (
    <Animated.View
      style={[
        styles.container,
        bannerState ? { backgroundColor: bannerState.backgroundColor } : styles.hidden,
        { opacity },
      ]}
      testID="sync-banner"
    >
      {bannerState?.showSpinner ? (
        <ActivityIndicator
          color={bannerState.textColor}
          size="small"
          style={styles.spinner}
          testID="sync-banner-syncing"
        />
      ) : null}
      <Text
        style={[styles.text, bannerState ? { color: bannerState.textColor } : styles.hiddenText]}
        testID={
          bannerState?.kind === 'offline'
            ? 'sync-banner-offline'
            : bannerState?.kind === 'pending'
              ? 'sync-banner-pending'
              : bannerState?.kind === 'error'
                ? 'sync-banner-error'
                : undefined
        }
      >
        {bannerState?.text ?? ''}
      </Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    borderRadius: radii.md,
    flexDirection: 'row',
    marginBottom: spacing.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  hidden: {
    backgroundColor: 'transparent',
  },
  hiddenText: {
    color: 'transparent',
  },
  spinner: {
    marginRight: spacing.sm,
  },
  text: {
    fontSize: typography.fontSizes.sm,
    fontWeight: typography.fontWeights.medium,
  },
});
