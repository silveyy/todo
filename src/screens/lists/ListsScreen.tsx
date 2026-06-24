import { useCallback, useMemo, useState } from 'react';
import {
  Alert,
  FlatList,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import {
  CompositeNavigationProp,
  useNavigation,
} from '@react-navigation/native';
import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { ListCard } from '@/components/lists';
import { SyncStatusBanner } from '@/components/todos/SyncStatusBanner';
import { Button, EmptyState, TextInput, theme } from '@/components/ui';
import { useListMembers, useLists } from '@/hooks/useLists';
import type { AppTabParamList } from '@/navigation/AppNavigator';
import type { ListsStackParamList } from '@/navigation/ListsStackNavigator';
import type { TodoList } from '@/types';

type ListsScreenNavigationProp = CompositeNavigationProp<
  NativeStackNavigationProp<ListsStackParamList, 'ListsHome'>,
  BottomTabNavigationProp<AppTabParamList, 'Lists'>
>;

type ListCardItemProps = {
  list: TodoList;
  onPress: () => void;
  onLongPress: () => void;
};

function ListCardItem({ list, onPress, onLongPress }: ListCardItemProps) {
  const { members } = useListMembers(list.id);

  return <ListCard list={list} members={members} onLongPress={onLongPress} onPress={onPress} />;
}

export function ListsScreen() {
  const navigation = useNavigation<ListsScreenNavigationProp>();
  const { createList, deleteList, error, lists, loading, refresh } = useLists();
  const [createTitle, setCreateTitle] = useState('');
  const [isCreateModalVisible, setIsCreateModalVisible] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const sortedLists = useMemo(() => lists, [lists]);

  const closeCreateModal = useCallback(() => {
    setCreateTitle('');
    setIsCreateModalVisible(false);
  }, []);

  const showCreateModal = useCallback(() => {
    setIsCreateModalVisible(true);
  }, []);

  const handleCreateList = useCallback(() => {
    try {
      const createdList = createList(createTitle);
      closeCreateModal();
      navigation.navigate('ListDetail', { listId: createdList.id });
    } catch (createError) {
      Alert.alert(
        'Unable to create list',
        createError instanceof Error ? createError.message : 'Try again.',
      );
    }
  }, [closeCreateModal, createList, createTitle, navigation]);

  const handleDeleteList = useCallback(
    (list: TodoList) => {
      Alert.alert(
        'Delete list',
        `Delete "${list.title}"?`,
        [
          { style: 'cancel', text: 'Cancel' },
          {
            style: 'destructive',
            text: 'Delete',
            onPress: () => {
              try {
                deleteList(list.id);
              } catch (deleteError) {
                Alert.alert(
                  'Unable to delete list',
                  deleteError instanceof Error ? deleteError.message : 'Try again.',
                );
              }
            },
          },
        ],
      );
    },
    [deleteList],
  );

  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    await refresh();
    setIsRefreshing(false);
  }, [refresh]);

  const renderItem = useCallback(
    ({ item }: { item: TodoList }) => (
      <ListCardItem
        list={item}
        onLongPress={() => handleDeleteList(item)}
        onPress={() => navigation.navigate('ListDetail', { listId: item.id })}
      />
    ),
    [handleDeleteList, navigation],
  );

  const emptyState = !loading && sortedLists.length === 0;

  return (
    <View style={styles.container} testID="lists-screen">
      <SyncStatusBanner />
      {error ? <Text style={styles.errorText}>{error}</Text> : null}

      {emptyState ? (
        <EmptyState
          action={{ label: 'Create List', onPress: showCreateModal }}
          subtitle="Create your first todo list to get started"
          title="No lists yet"
        />
      ) : (
        <FlatList
          contentContainerStyle={styles.listContent}
          data={sortedLists}
          keyExtractor={(item) => item.id}
          onRefresh={handleRefresh}
          refreshing={isRefreshing}
          renderItem={renderItem}
          showsVerticalScrollIndicator={false}
          testID="lists-flatlist"
        />
      )}

      <Pressable
        accessibilityLabel="Create list"
        onPress={showCreateModal}
        style={styles.fab}
        testID="create-list-fab"
      >
        <Text style={styles.fabText}>+</Text>
      </Pressable>

      <Modal
        animationType="slide"
        onRequestClose={closeCreateModal}
        transparent
        visible={isCreateModalVisible}
      >
        <Pressable onPress={closeCreateModal} style={styles.modalBackdrop}>
          <Pressable onPress={() => undefined} style={styles.modalCard} testID="create-list-modal">
            <Text style={styles.modalTitle}>Create List</Text>
            <TextInput
              accessibilityLabel="List title"
              autoFocus
              label="List title"
              onChangeText={setCreateTitle}
              placeholder="Weekend errands"
              testID="create-list-input"
              value={createTitle}
            />
            <View style={styles.modalActions}>
              <Button onPress={closeCreateModal} variant="ghost">
                Cancel
              </Button>
              <Button onPress={handleCreateList} testID="create-list-submit">
                Create
              </Button>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: theme.colors.gray50,
    flex: 1,
    padding: theme.spacing.lg,
  },
  errorText: {
    color: theme.colors.error,
    marginBottom: theme.spacing.md,
  },
  fab: {
    alignItems: 'center',
    backgroundColor: theme.colors.primary,
    borderRadius: theme.radii.full,
    bottom: theme.spacing.xl,
    height: 56,
    justifyContent: 'center',
    position: 'absolute',
    right: theme.spacing.xl,
    width: 56,
    ...theme.shadows.md,
  },
  fabText: {
    color: theme.colors.white,
    fontSize: 28,
    fontWeight: theme.typography.fontWeights.bold,
    lineHeight: 30,
  },
  listContent: {
    flexGrow: 1,
    paddingBottom: 96,
  },
  modalActions: {
    flexDirection: 'row',
    gap: theme.spacing.sm,
    justifyContent: 'flex-end',
    marginTop: theme.spacing.lg,
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
});
