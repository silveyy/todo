import { useEffect, useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Button, TextInput, colors, radii, spacing, typography } from '@/components/ui';
import type { CreateTodoInput, Priority, TodoItem, UpdateTodoInput } from '@/types';

import { DATE_INPUT_REGEX, normalizeOptionalText } from './utils';

export interface TodoFormProps {
  initialValues?: Partial<TodoItem>;
  onSubmit: (data: CreateTodoInput | UpdateTodoInput) => void;
  onCancel: () => void;
  mode: 'create' | 'edit';
}

type FormErrors = {
  title?: string;
  due_date?: string;
};

const PRIORITY_OPTIONS: Array<{ label: string; value: Priority; selectedColor: string }> = [
  { label: 'Low', value: 'low', selectedColor: colors.priorityLow },
  { label: 'Medium', value: 'medium', selectedColor: colors.priorityMedium },
  { label: 'High', value: 'high', selectedColor: colors.priorityHigh },
];

function getInitialPriority(priority?: TodoItem['priority']): Priority {
  return priority ?? 'medium';
}

export function TodoForm({ initialValues, onSubmit, onCancel, mode }: TodoFormProps) {
  const [title, setTitle] = useState(initialValues?.title ?? '');
  const [notes, setNotes] = useState(initialValues?.notes ?? '');
  const [dueDate, setDueDate] = useState(initialValues?.due_date ?? '');
  const [priority, setPriority] = useState<Priority>(getInitialPriority(initialValues?.priority));
  const [errors, setErrors] = useState<FormErrors>({});

  useEffect(() => {
    setTitle(initialValues?.title ?? '');
    setNotes(initialValues?.notes ?? '');
    setDueDate(initialValues?.due_date ?? '');
    setPriority(getInitialPriority(initialValues?.priority));
    setErrors({});
  }, [initialValues]);

  const submitLabel = useMemo(() => {
    return mode === 'create' ? 'Add Todo' : 'Save Changes';
  }, [mode]);

  const handleSubmit = () => {
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
    onSubmit({
      title: trimmedTitle,
      notes: normalizeOptionalText(notes),
      due_date: normalizeOptionalText(dueDate),
      priority,
    });
  };

  return (
    <View style={styles.container}>
      <Text style={styles.heading}>{mode === 'create' ? 'New Todo' : 'Edit Todo'}</Text>
      <TextInput
        autoFocus
        error={errors.title}
        label="Title"
        onChangeText={setTitle}
        required
        testID="todo-title-input"
        value={title}
      />
      <TextInput
        label="Notes"
        multiline
        numberOfLines={3}
        onChangeText={setNotes}
        style={styles.notesInput}
        testID="todo-notes-input"
        value={notes}
      />
      <TextInput
        error={errors.due_date}
        keyboardType="numeric"
        label="Due date"
        onChangeText={setDueDate}
        placeholder="YYYY-MM-DD"
        testID="todo-due-date-input"
        value={dueDate}
      />
      <View style={styles.prioritySection}>
        <Text style={styles.priorityLabel}>Priority</Text>
        <View style={styles.priorityRow}>
          {PRIORITY_OPTIONS.map((option) => {
            const isSelected = priority === option.value;

            return (
              <Pressable
                accessibilityRole="button"
                key={option.value}
                onPress={() => setPriority(option.value)}
                style={[
                  styles.priorityPill,
                  isSelected && {
                    backgroundColor: option.selectedColor,
                    borderColor: option.selectedColor,
                  },
                ]}
                testID={`todo-priority-${option.value}`}
              >
                <Text style={[styles.priorityPillText, isSelected && styles.priorityPillTextSelected]}>
                  {option.label}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>
      <View style={styles.actions}>
        <Button onPress={handleSubmit} style={styles.fullWidthButton} testID="todo-submit-button">
          {submitLabel}
        </Button>
        <Button
          onPress={onCancel}
          style={styles.fullWidthButton}
          testID="todo-cancel-button"
          variant="ghost"
        >
          Cancel
        </Button>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  actions: {
    gap: spacing.sm,
    marginTop: spacing.lg,
  },
  container: {
    gap: spacing.md,
  },
  fullWidthButton: {
    width: '100%',
  },
  heading: {
    color: colors.gray900,
    fontSize: typography.fontSizes.lg,
    fontWeight: typography.fontWeights.semibold,
  },
  notesInput: {
    minHeight: 96,
    textAlignVertical: 'top',
  },
  priorityLabel: {
    color: colors.gray700,
    fontSize: typography.fontSizes.sm,
    fontWeight: typography.fontWeights.medium,
  },
  priorityPill: {
    borderColor: colors.gray300,
    borderRadius: radii.full,
    borderWidth: 1,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  priorityPillText: {
    color: colors.gray700,
    fontSize: typography.fontSizes.sm,
    fontWeight: typography.fontWeights.medium,
  },
  priorityPillTextSelected: {
    color: colors.white,
  },
  priorityRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  prioritySection: {
    gap: spacing.sm,
  },
});
