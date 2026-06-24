import { Image, StyleSheet, Text, View } from 'react-native';

import { theme } from '@/components/ui';
import type { ListMember, Profile } from '@/types';

export interface MemberAvatarRowProps {
  members: ListMember[];
  profiles?: Record<string, Profile>;
  maxVisible?: number;
  size?: number;
}

function getInitials(member: ListMember, profile?: Profile): string {
  const source = profile?.display_name?.trim() || member.user_id.trim();

  return source
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('') || 'U';
}

export function MemberAvatarRow({
  members,
  profiles = {},
  maxVisible = 3,
  size = 28,
}: MemberAvatarRowProps) {
  const visibleMembers = members.slice(0, maxVisible);
  const remainingCount = Math.max(0, members.length - visibleMembers.length);

  return (
    <View style={styles.row}>
      {visibleMembers.map((member, index) => {
        const profile = profiles[member.user_id];

        return (
          <View
            key={member.user_id}
            style={[
              styles.avatar,
              {
                borderRadius: size / 2,
                height: size,
                marginLeft: index === 0 ? 0 : -8,
                width: size,
                zIndex: visibleMembers.length - index,
              },
            ]}
          >
            {profile?.avatar_url ? (
              <Image
                source={{ uri: profile.avatar_url }}
                style={[styles.avatarImage, { borderRadius: size / 2, height: size, width: size }]}
              />
            ) : (
              <Text style={[styles.avatarText, { fontSize: Math.max(10, size * 0.38) }]}>
                {getInitials(member, profile)}
              </Text>
            )}
          </View>
        );
      })}

      {remainingCount > 0 ? (
        <View
          style={[
            styles.extraAvatar,
            {
              borderRadius: size / 2,
              height: size,
              marginLeft: visibleMembers.length === 0 ? 0 : -8,
              width: size,
            },
          ]}
        >
          <Text style={[styles.extraAvatarText, { fontSize: Math.max(10, size * 0.38) }]}>
            +{remainingCount}
          </Text>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  avatar: {
    alignItems: 'center',
    backgroundColor: theme.colors.primaryLight,
    borderColor: theme.colors.white,
    borderWidth: 2,
    justifyContent: 'center',
    overflow: 'hidden',
  },
  avatarImage: {
    resizeMode: 'cover',
  },
  avatarText: {
    color: theme.colors.white,
    fontWeight: theme.typography.fontWeights.bold,
  },
  extraAvatar: {
    alignItems: 'center',
    backgroundColor: theme.colors.gray200,
    borderColor: theme.colors.white,
    borderWidth: 2,
    justifyContent: 'center',
  },
  extraAvatarText: {
    color: theme.colors.gray700,
    fontWeight: theme.typography.fontWeights.semibold,
  },
  row: {
    alignItems: 'center',
    flexDirection: 'row',
  },
});
