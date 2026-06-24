import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Badge, theme } from '@/components/ui';
import type { ListMember, TodoList } from '@/types';

import { MemberAvatarRow } from './MemberAvatarRow';

export interface ListCardProps {
  list: TodoList;
  members: ListMember[];
  pendingCount?: number;
  onPress: () => void;
  onLongPress?: () => void;
}

export function formatRelativeTime(updatedAt: string): string {
  const timestamp = new Date(updatedAt).getTime();

  if (Number.isNaN(timestamp)) {
    return 'recently';
  }

  const diffMs = Date.now() - timestamp;
  const diffSeconds = Math.max(0, Math.floor(diffMs / 1000));

  if (diffSeconds < 60) {
    return 'just now';
  }

  const diffMinutes = Math.floor(diffSeconds / 60);
  if (diffMinutes < 60) {
    return `${diffMinutes}m ago`;
  }

  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) {
    return `${diffHours}h ago`;
  }

  if (diffHours < 48) {
    return 'yesterday';
  }

  const diffDays = Math.floor(diffHours / 24);
  return `${diffDays}d ago`;
}

function formatMemberCount(count: number): string {
  return `${count} member${count === 1 ? '' : 's'}`;
}

export function ListCard({
  list,
  members,
  pendingCount = 0,
  onPress,
  onLongPress,
}: ListCardProps) {
  return (
    <Pressable
      accessibilityLabel={`${list.title} list`}
      accessibilityRole="button"
      onLongPress={onLongPress}
      onPress={onPress}
      style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
      testID={`list-card-${list.id}`}
    >
      <View style={styles.headerRow}>
        <Text style={styles.title} testID="list-card-title">
          {list.title}
        </Text>
        {pendingCount > 0 ? (
          <Badge label={`${pendingCount} pending`} variant="warning" />
        ) : null}
      </View>

      <View style={styles.metaRow}>
        <Text style={styles.metaText} testID="list-card-member-count">
          {formatMemberCount(members.length)}
        </Text>
        <Text style={styles.separator}>•</Text>
        <Text style={styles.metaText}>{formatRelativeTime(list.updated_at)}</Text>
      </View>

      <View style={styles.footer}>
        <MemberAvatarRow members={members} />
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: theme.colors.white,
    borderRadius: theme.radii.lg,
    marginBottom: theme.spacing.md,
    padding: theme.spacing.md,
    ...theme.shadows.md,
  },
  cardPressed: {
    opacity: 0.9,
  },
  footer: {
    marginTop: theme.spacing.md,
  },
  headerRow: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    gap: theme.spacing.sm,
    justifyContent: 'space-between',
  },
  metaRow: {
    alignItems: 'center',
    flexDirection: 'row',
    marginTop: theme.spacing.sm,
  },
  metaText: {
    color: theme.colors.gray500,
    fontSize: theme.typography.fontSizes.sm,
  },
  separator: {
    color: theme.colors.gray400,
    marginHorizontal: theme.spacing.sm,
  },
  title: {
    color: theme.colors.gray900,
    flex: 1,
    fontSize: theme.typography.fontSizes.lg,
    fontWeight: theme.typography.fontWeights.bold,
  },
});
