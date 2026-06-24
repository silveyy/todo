import { useMemo, useState } from 'react';
import {
  FlatList,
  Modal,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { EmptyState, colors, radii, shadows, spacing, typography } from '@/components/ui';
import { useTodos } from '@/hooks/useTodos';
import type { CreateTodoInput, TodoItem as TodoItemModel, UpdateTodoInput } from '@/types';

import { SyncStatusBanner } from './SyncStatusBanner';
import { TodoForm } from './TodoForm';
import { TodoItem } from './TodoItem';

export interface TodoListProps {
  listId: string;
  onEditTodo: (todo: TodoItemModel) => void;
}

type TodoSection = {
  key: 'active' | 'completed';
  title: string;
  items: TodoItemModel[];
};

export function TodoList({ listId, onEditTodo }: TodoListProps) {
  const { completeTodo, createTodo, deleteTodo, error, loading, refresh, todos, uncompleteTodo, updateTodo } =
    useTodos(listId);
  const [isFormVisible, setIsFormVisible] = useState(false);
  const [editingTodo, setEditingTodo] = useState<TodoItemModel | null>(null);

  const sections = useMemo<TodoSection[]>(() => {
    const active = todos.filter((todo) => !todo.completed);
    const completed = todos.filter((todo) => todo.completed);
    const nextSections: TodoSection[] = [];

    if (active.length > 0) {
      nextSections.push({ key: 'active', title: 'Active', items: active });
    }

    if (completed.length > 0) {
      nextSections.push({ key: 'completed', title: 'Completed', items: completed });
    }

    return nextSections;
  }, [todos]);

  const flattenedItems = useMemo<Array<{ type: 'header'; key: string; title: string } | { type: 'todo'; key: string; todo: TodoItemModel }>>(() => {
    return sections.flatMap((section) => [
      { type: 'header' as const, key: `${section.key}-header`, title: section.title },
      ...section.items.map((todo) => ({ type: 'todo' as const, key: todo.id, todo })),
    ]);
  }, [sections]);

  const openCreateForm = () => {
    setEditingTodo(null);
    setIsFormVisible(true);
  };

  const openEditForm = (todo: TodoItemModel) => {
    onEditTodo(todo);
    setEditingTodo(todo);
    setIsFormVisible(true);
  };

  const closeForm = () => {
    setEditingTodo(null);
    setIsFormVisible(false);
  };

  const handleSubmit = (data: CreateTodoInput | UpdateTodoInput) => {
    if (editingTodo) {
      updateTodo(editingTodo.id, data as UpdateTodoInput);
    } else {
      createTodo(data as CreateTodoInput);
    }
    closeForm();
  };

  return (
    <View style={styles.container} testID="todo-list">
      <SyncStatusBanner />
      {error ? <Text style={styles.errorText}>{error}</Text> : null}
      <FlatList
        contentContainerStyle={todos.length === 0 ? styles.emptyContent : styles.listContent}
        data={flattenedItems}
        keyExtractor={(item) => item.key}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={refresh} />}
        renderItem={({ item }) => {
          if (item.type === 'header') {
            return <Text style={styles.sectionHeader}>{item.title}</Text>;
          }

          return (
            <TodoItem
              onComplete={completeTodo}
              onDelete={deleteTodo}
              onEdit={openEditForm}
              onUncomplete={uncompleteTodo}
              todo={item.todo}
            />
          );
        }}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
        ListEmptyComponent={
          <EmptyState
            action={{ label: 'Add your first todo', onPress: openCreateForm }}
            subtitle="Add your first todo"
            title="No todos yet"
          />
        }
      />
      <Pressable
        accessibilityLabel="Add todo"
        accessibilityRole="button"
        onPress={openCreateForm}
        style={styles.fab}
        testID="add-todo-fab"
      >
        <Text style={styles.fabLabel}>+</Text>
      </Pressable>
      <Modal animationType="slide" onRequestClose={closeForm} transparent visible={isFormVisible}>
        <View style={styles.modalRoot}>
          <Pressable onPress={closeForm} style={styles.modalBackdrop} />
          <View style={styles.modalSheet} testID="todo-form-modal">
            <TodoForm
              initialValues={editingTodo ?? undefined}
              mode={editingTodo ? 'edit' : 'create'}
              onCancel={closeForm}
              onSubmit={handleSubmit}
            />
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  emptyContent: {
    flexGrow: 1,
    paddingBottom: spacing.xxxl * 2,
  },
  errorText: {
    color: colors.error,
    fontSize: typography.fontSizes.sm,
    marginBottom: spacing.sm,
  },
  fab: {
    alignItems: 'center',
    backgroundColor: colors.primary,
    borderRadius: radii.full,
    bottom: spacing.xl,
    height: 56,
    justifyContent: 'center',
    position: 'absolute',
    right: spacing.xl,
    width: 56,
    ...shadows.md,
  },
  fabLabel: {
    color: colors.white,
    fontSize: typography.fontSizes.xxl,
    fontWeight: typography.fontWeights.semibold,
    marginTop: -2,
  },
  listContent: {
    paddingBottom: spacing.xxxl * 2,
  },
  modalBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(17, 24, 39, 0.35)',
  },
  modalRoot: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  modalSheet: {
    backgroundColor: colors.white,
    borderTopLeftRadius: radii.xl,
    borderTopRightRadius: radii.xl,
    padding: spacing.lg,
  },
  sectionHeader: {
    color: colors.gray600,
    fontSize: typography.fontSizes.sm,
    fontWeight: typography.fontWeights.semibold,
    marginBottom: spacing.sm,
    marginTop: spacing.md,
  },
  separator: {
    height: spacing.sm,
  },
});
