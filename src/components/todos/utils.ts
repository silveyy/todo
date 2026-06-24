import type { Priority, TodoItem } from '@/types';

export const DATE_INPUT_REGEX = /^\d{4}-\d{2}-\d{2}$/;

export function getPriorityBadgeVariant(priority: Priority): 'priority-low' | 'priority-medium' | 'priority-high' {
  switch (priority) {
    case 'low':
      return 'priority-low';
    case 'high':
      return 'priority-high';
    case 'medium':
    default:
      return 'priority-medium';
  }
}

export function getPriorityLabel(priority: Priority): string {
  return priority.charAt(0).toUpperCase() + priority.slice(1);
}

export function formatDueDateLabel(dueDate: string | null): string | null {
  if (!dueDate) {
    return null;
  }

  const parsedDate = new Date(dueDate);
  if (Number.isNaN(parsedDate.getTime())) {
    return dueDate;
  }

  return parsedDate.toLocaleDateString();
}

export function isTodoOverdue(todo: TodoItem): boolean {
  if (!todo.due_date || todo.completed) {
    return false;
  }

  const dueDate = new Date(todo.due_date);
  if (Number.isNaN(dueDate.getTime())) {
    return false;
  }

  dueDate.setHours(0, 0, 0, 0);

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  return dueDate.getTime() < today.getTime();
}

export function normalizeOptionalText(value: string): string | undefined {
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}
