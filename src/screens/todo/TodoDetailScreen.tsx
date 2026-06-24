import { useEffect, useMemo, useState } from 'react';
import { useNavigation, useRoute, type NavigationProp, type RouteProp } from '@react-navigation/native';
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { Button, Checkbox, EmptyState, TextInput, colors, spacing, typography } from '@/components/ui';
import { DATE_INPUT_REGEX, normalizeOptionalText } from '@/components/todos/utils';
import { useTodos } from '@/hooks/useTodos';
import { useAuthStore } from '@/store/authStore';
import type { Priority } from '@/types';

type TodoDetailRouteParams = {
  todoId: string;
  listId: string;
};

type TodoDetailRoute = RouteProp<Record<string, TodoDetailRouteParams>, string>;

type AppNavigation = NavigationProp<Record<string, object | undefined>>;

type FormErrors = {
  title?: string;
  due_date?: string;
};

export function TodoDetailScreen() {
  const navigation = useNavigation<AppNavigation>();
  const route = useRoute<TodoDetailRoute>();
  const { listId, todoId } = route.params;
  const { deleteTodo, loading, todos, updateTodo } = useTodos(listId);
  const profile = useAuthStore((state) => state.profile);
  const todo = useMemo(() => todos.find((item) => item.id === todoId) ?? null, [todoId, todos]);
  const [title, setTitle] = useState('');
  const [notes, setNotes] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [priority, setPriority] = useState<Priority>('medium');
  const [completed, setCompleted] = useState(false);
  const [errors, setErrors] = useState<FormErrors>({});

  useEffect(() => {
    if (!todo) {
      return;
    }

    setTitle(todo.title);
    setNotes(todo.notes ?? '');
    setDueDate(todo.due_date ?? '');
    setPriority(todo.priority ?? 'medium');
    setCompleted(todo.completed);
    setErrors({});
  }, [todo]);

  if (loading && !todo) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator color={colors.primary} size="large" />
      </View>
    );
  }

  if (!todo) {
    return <EmptyState subtitle="This todo may have been deleted." title="Todo not found" />;
  }

  const createdByLabel = todo.created_by === profile?.id ? profile.display_name : todo.created_by;

  const handleSave = () => {
    const trimmedTitle = title.trim();
    const nextErrors: FormErrors = {};

    if (trimmedTitle.length === 0) {
      nextErrors.title = 'Title is required';
    }

    if (dueDate.trim().length > 0 && !DATE_INPUT_REGEX.test(dueDate.trim())) {
      nextErrors.due_date = 'Due date must be in YYYY-MM-DD format';
    }

    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors);
      return;
    }

    setErrors({});
    updateTodo(todo.id, {
      title: trimmedTitle,
      notes: normalizeOptionalText(notes),
      due_date: normalizeOptionalText(dueDate),
      priority,
      completed,
      completed_at: completed ? todo.completed_at ?? new Date().toISOString() : null,
      completed_by: completed ? todo.completed_by ?? profile?.id ?? todo.created_by : null,
    });
  };

  const handleDelete = () => {
    Alert.alert('Delete Todo', 'Are you sure you want to delete this todo?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => {
          deleteTodo(todo.id);
          navigation.goBack();
        },
      },
    ]);
  };

  return (
    <ScrollView contentContainerStyle={styles.contentContainer} style={styles.container}>
      <View style={styles.formSection}>
        <TextInput
          error={errors.title}
          label="Title"
          onChangeText={setTitle}
          required
          value={title}
        />
        <TextInput
          label="Notes"
          multiline
          numberOfLines={4}
          onChangeText={setNotes}
          style={styles.notesInput}
          value={notes}
        />
        <TextInput
          error={errors.due_date}
          keyboardType="numeric"
          label="Due date"
          onChangeText={setDueDate}
          placeholder="YYYY-MM-DD"
          value={dueDate}
        />
        <Text style={styles.priorityLabel}>Priority</Text>
        <View style={styles.priorityRow}>
          {(['low', 'medium', 'high'] as const).map((value) => {
            const isSelected = priority === value;
            const backgroundColor =
              value === 'low'
                ? colors.priorityLow
                : value === 'high'
                  ? colors.priorityHigh
                  : colors.priorityMedium;

            return (
              <Button
                key={value}
                onPress={() => setPriority(value)}
                style={{
                  ...styles.priorityButton,
                  ...(isSelected ? { backgroundColor } : styles.priorityButtonGhost),
                }}
                variant={isSelected ? 'primary' : 'secondary'}
              >
                {value.charAt(0).toUpperCase() + value.slice(1)}
              </Button>
            );
          })}
        </View>
        <Checkbox checked={completed} label="Mark as complete" onToggle={() => setCompleted((value) => !value)} />
      </View>
      <View style={styles.actions}>
        <Button onPress={handleSave} style={styles.fullWidthButton}>
          Save
        </Button>
        <Button onPress={handleDelete} style={styles.fullWidthButton} variant="destructive">
          Delete Todo
        </Button>
      </View>
      <Text style={styles.metadata}>
        Created by {createdByLabel} on {new Date(todo.created_at).toLocaleDateString()}
      </Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  actions: {
    gap: spacing.md,
    marginTop: spacing.lg,
  },
  container: {
    backgroundColor: colors.white,
    flex: 1,
  },
  contentContainer: {
    padding: spacing.lg,
    paddingBottom: spacing.xxxl,
  },
  formSection: {
    gap: spacing.md,
  },
  fullWidthButton: {
    width: '100%',
  },
  loadingContainer: {
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
  },
  metadata: {
    color: colors.gray500,
    fontSize: typography.fontSizes.sm,
    marginTop: spacing.xl,
  },
  notesInput: {
    minHeight: 120,
    textAlignVertical: 'top',
  },
  priorityButton: {
    minWidth: 96,
  },
  priorityButtonGhost: {
    backgroundColor: colors.white,
  },
  priorityLabel: {
    color: colors.gray700,
    fontSize: typography.fontSizes.sm,
    fontWeight: typography.fontWeights.medium,
  },
  priorityRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
});
