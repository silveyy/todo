import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Badge, Checkbox, colors, radii, spacing, typography } from '@/components/ui';
import type { TodoItem as TodoItemModel } from '@/types';

import { formatDueDateLabel, getPriorityBadgeVariant, getPriorityLabel, isTodoOverdue } from './utils';

export interface TodoItemProps {
  todo: TodoItemModel;
  onComplete: (id: string) => void;
  onUncomplete: (id: string) => void;
  onEdit: (todo: TodoItemModel) => void;
  onDelete: (id: string) => void;
}

export function TodoItem({ todo, onComplete, onUncomplete, onEdit, onDelete }: TodoItemProps) {
  const dueDateLabel = formatDueDateLabel(todo.due_date);
  const isOverdue = isTodoOverdue(todo);

  return (
    <View style={styles.container} testID={`todo-item-${todo.id}`}>
      <Checkbox
        accessibilityLabel={`${todo.completed ? 'Completed' : 'Active'} ${todo.title}`}
        checked={todo.completed}
        onToggle={() => {
          if (todo.completed) {
            onUncomplete(todo.id);
            return;
          }

          onComplete(todo.id);
        }}
        testID={`todo-checkbox-${todo.id}`}
      />
      <Pressable
        accessibilityRole="button"
        onLongPress={() => onEdit(todo)}
        onPress={() => onEdit(todo)}
        style={styles.content}
      >
        <Text
          style={[styles.title, todo.completed && styles.titleCompleted]}
          testID={`todo-title-${todo.id}`}
        >
          {todo.title}
        </Text>
        {todo.notes ? (
          <Text numberOfLines={1} style={[styles.notes, todo.completed && styles.notesCompleted]}>
            {todo.notes}
          </Text>
        ) : null}
      </Pressable>
      <View style={styles.meta}>
        {todo.priority ? (
          <Badge label={getPriorityLabel(todo.priority)} variant={getPriorityBadgeVariant(todo.priority)} />
        ) : null}
        {dueDateLabel ? (
          <Text style={[styles.dueDate, isOverdue && styles.dueDateOverdue]} testID="todo-due-date">
            {dueDateLabel}
          </Text>
        ) : null}
        <Pressable
          accessibilityLabel={`Delete ${todo.title}`}
          accessibilityRole="button"
          onPress={() => onDelete(todo.id)}
          style={styles.deleteButton}
          testID={`todo-delete-${todo.id}`}
        >
          <Text style={styles.deleteButtonText}>Delete</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    backgroundColor: colors.white,
    borderColor: colors.gray200,
    borderRadius: radii.lg,
    borderWidth: 1,
    flexDirection: 'row',
    gap: spacing.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
  },
  content: {
    flex: 1,
    minHeight: 44,
    justifyContent: 'center',
  },
  deleteButton: {
    alignSelf: 'flex-end',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },
  deleteButtonText: {
    color: colors.error,
    fontSize: typography.fontSizes.sm,
    fontWeight: typography.fontWeights.semibold,
  },
  dueDate: {
    color: colors.gray500,
    fontSize: typography.fontSizes.xs,
    textAlign: 'right',
  },
  dueDateOverdue: {
    color: colors.error,
  },
  meta: {
    alignItems: 'flex-end',
    gap: spacing.sm,
    maxWidth: 112,
  },
  notes: {
    color: colors.gray500,
    fontSize: typography.fontSizes.sm,
    marginTop: spacing.xs,
  },
  notesCompleted: {
    color: colors.gray400,
  },
  title: {
    color: colors.gray900,
    fontSize: typography.fontSizes.md,
    fontWeight: typography.fontWeights.medium,
  },
  titleCompleted: {
    color: colors.gray500,
    textDecorationLine: 'line-through',
  },
});
