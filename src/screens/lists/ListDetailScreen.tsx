import { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Modal,
  Pressable,
  Share,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import { MemberAvatarRow } from '@/components/lists';
import { TodoList } from '@/components/todos';
import { Button, EmptyState, TextInput, theme } from '@/components/ui';
import { useListMembers, useLists } from '@/hooks/useLists';
import type { ListsStackParamList } from '@/navigation/ListsStackNavigator';

type Props = NativeStackScreenProps<ListsStackParamList, 'ListDetail'>;
type ShareRole = 'editor' | 'viewer';

const emailRegex = /^\S+@\S+\.\S+$/;

function RolePill({
  label,
  onPress,
  selected,
}: {
  label: 'Editor' | 'Viewer';
  onPress: () => void;
  selected: boolean;
}) {
  return (
    <Pressable onPress={onPress} style={[styles.rolePill, selected && styles.rolePillSelected]}>
      <Text style={[styles.rolePillText, selected && styles.rolePillTextSelected]}>{label}</Text>
    </Pressable>
  );
}

export function ListDetailScreen({ navigation, route }: Props) {
  const { listId } = route.params;
  const { inviteToList, lists, loading, updateList } = useLists();
  const { members } = useListMembers(listId);
  const [email, setEmail] = useState('');
  const [inviteLink, setInviteLink] = useState<string | null>(null);
  const [inviteError, setInviteError] = useState<string | null>(null);
  const [inviteLoading, setInviteLoading] = useState(false);
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [isShareVisible, setIsShareVisible] = useState(false);
  const [role, setRole] = useState<ShareRole>('editor');
  const list = useMemo(() => lists.find((item) => item.id === listId) ?? null, [listId, lists]);
  const [titleDraft, setTitleDraft] = useState(list?.title ?? '');

  useEffect(() => {
    if (list?.title) {
      navigation.setOptions({ title: list.title });
      setTitleDraft(list.title);
    }
  }, [list?.title, navigation]);

  const handleSaveTitle = () => {
    if (!list) {
      return;
    }

    try {
      updateList(list.id, { title: titleDraft });
      setIsEditingTitle(false);
    } catch (updateError) {
      Alert.alert(
        'Unable to rename list',
        updateError instanceof Error ? updateError.message : 'Try again.',
      );
      setTitleDraft(list.title);
      setIsEditingTitle(false);
    }
  };

  const handleSendInvite = async () => {
    if (!list) {
      return;
    }

    const normalizedEmail = email.trim().toLowerCase();

    if (!emailRegex.test(normalizedEmail)) {
      setInviteError('Enter a valid email address.');
      return;
    }

    setInviteLoading(true);
    setInviteError(null);

    try {
      const link = await inviteToList(list.id, normalizedEmail, role);
      setInviteLink(link);
    } catch (error) {
      setInviteError(error instanceof Error ? error.message : 'Unable to send invite.');
    } finally {
      setInviteLoading(false);
    }
  };

  const handleShareLink = async () => {
    if (!inviteLink) {
      return;
    }

    await Share.share({ message: inviteLink });
  };

  if (loading && !list) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator color={theme.colors.primary} size="large" />
      </View>
    );
  }

  if (!list) {
    return (
      <View style={styles.screen}>
        <EmptyState subtitle="This list is not available locally yet." title="List not found" />
      </View>
    );
  }

  return (
    <View style={styles.screen} testID="list-detail-screen">
      <View style={styles.content}>
        <View style={styles.headerRow}>
          <View style={styles.headerTitleContainer}>
            {isEditingTitle ? (
              <TextInput
                accessibilityLabel="Edit list title"
                autoFocus
                onBlur={handleSaveTitle}
                onChangeText={setTitleDraft}
                onSubmitEditing={handleSaveTitle}
                value={titleDraft}
              />
            ) : (
              <Pressable onPress={() => setIsEditingTitle(true)}>
                <Text style={styles.title}>{list.title}</Text>
              </Pressable>
            )}
          </View>

          <Button
            onPress={() => setIsShareVisible(true)}
            size="sm"
            testID="share-button"
            variant="secondary"
          >
            Share
          </Button>
        </View>

        <View style={styles.membersSection}>
          <Text style={styles.sectionLabel}>Members</Text>
          <MemberAvatarRow members={members} />
        </View>
      </View>

      <View style={styles.todoSection}>
        <TodoList listId={list.id} onEditTodo={() => undefined} />
      </View>

      <Modal
        animationType="slide"
        onRequestClose={() => setIsShareVisible(false)}
        transparent
        visible={isShareVisible}
      >
        <Pressable onPress={() => setIsShareVisible(false)} style={styles.modalBackdrop}>
          <Pressable onPress={() => undefined} style={styles.modalCard}>
            <Text style={styles.modalTitle}>Share List</Text>
            <TextInput
              accessibilityLabel="Invite email"
              autoCapitalize="none"
              keyboardType="email-address"
              label="Email"
              onChangeText={setEmail}
              placeholder="person@example.com"
              testID="share-email-input"
              value={email}
            />

            <View>
              <Text style={styles.sectionLabel}>Role</Text>
              <View style={styles.roleRow}>
                <RolePill
                  label="Editor"
                  onPress={() => setRole('editor')}
                  selected={role === 'editor'}
                />
                <RolePill
                  label="Viewer"
                  onPress={() => setRole('viewer')}
                  selected={role === 'viewer'}
                />
              </View>
            </View>

            {inviteError ? <Text style={styles.errorText}>{inviteError}</Text> : null}

            <Button
              loading={inviteLoading}
              onPress={() => void handleSendInvite()}
              testID="share-send-button"
            >
              Send Invite
            </Button>

            {inviteLink ? (
              <View style={styles.inviteLinkCard}>
                <Text style={styles.sectionLabel}>Invite Link</Text>
                <Text selectable style={styles.inviteLinkText} testID="invite-link-text">
                  {inviteLink}
                </Text>
                <Button onPress={() => void handleShareLink()} variant="secondary">
                  Copy Link
                </Button>
              </View>
            ) : null}
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  content: {
    gap: theme.spacing.lg,
    padding: theme.spacing.lg,
  },
  errorText: {
    color: theme.colors.error,
  },
  headerRow: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    gap: theme.spacing.md,
    justifyContent: 'space-between',
  },
  loadingContainer: {
    alignItems: 'center',
    backgroundColor: theme.colors.gray50,
    flex: 1,
    justifyContent: 'center',
  },
  headerTitleContainer: {
    flex: 1,
  },
  inviteLinkCard: {
    backgroundColor: theme.colors.gray50,
    borderRadius: theme.radii.lg,
    gap: theme.spacing.sm,
    padding: theme.spacing.md,
  },
  inviteLinkText: {
    color: theme.colors.primaryDark,
  },
  membersSection: {
    gap: theme.spacing.sm,
  },
  modalBackdrop: {
    backgroundColor: 'rgba(17, 24, 39, 0.4)',
    flex: 1,
    justifyContent: 'flex-end',
    padding: theme.spacing.lg,
  },
  modalCard: {
    backgroundColor: theme.colors.white,
    borderRadius: theme.radii.xl,
    gap: theme.spacing.md,
    padding: theme.spacing.lg,
  },
  modalTitle: {
    color: theme.colors.gray900,
    fontSize: theme.typography.fontSizes.xl,
    fontWeight: theme.typography.fontWeights.bold,
  },
  rolePill: {
    backgroundColor: theme.colors.gray100,
    borderRadius: theme.radii.full,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
  },
  rolePillSelected: {
    backgroundColor: theme.colors.primary,
  },
  rolePillText: {
    color: theme.colors.gray700,
    fontWeight: theme.typography.fontWeights.semibold,
  },
  rolePillTextSelected: {
    color: theme.colors.white,
  },
  roleRow: {
    flexDirection: 'row',
    gap: theme.spacing.sm,
    marginTop: theme.spacing.sm,
  },
  screen: {
    backgroundColor: theme.colors.gray50,
    flex: 1,
  },
  sectionLabel: {
    color: theme.colors.gray700,
    fontSize: theme.typography.fontSizes.sm,
    fontWeight: theme.typography.fontWeights.semibold,
  },
  title: {
    color: theme.colors.gray900,
    fontSize: theme.typography.fontSizes.xxl,
    fontWeight: theme.typography.fontWeights.bold,
  },
  todoSection: {
    flex: 1,
    paddingHorizontal: theme.spacing.lg,
    paddingBottom: theme.spacing.lg,
  },
});
