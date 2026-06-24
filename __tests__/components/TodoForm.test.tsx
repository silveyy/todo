import { StyleSheet } from 'react-native';
import { fireEvent, render, screen } from '@testing-library/react-native';
import { describe, expect, it, jest } from '@jest/globals';

import { TodoForm } from '@/components/todos/TodoForm';
import { colors } from '@/components/ui';
import type { TodoItem } from '@/types';

function buildInitialValues(overrides: Partial<TodoItem> = {}): Partial<TodoItem> {
  return {
    id: 'todo-1',
    list_id: 'list-1',
    title: 'Ship feature',
    notes: 'Before Friday',
    completed: false,
    completed_at: null,
    completed_by: null,
    due_date: '2026-06-30',
    priority: 'high',
    position: 1,
    created_by: 'user-1',
    created_at: '2026-06-24T00:00:00.000Z',
    updated_at: '2026-06-24T00:00:00.000Z',
    deleted_at: null,
    ...overrides,
  };
}

describe('TodoForm', () => {
  it('renders all fields', () => {
    render(<TodoForm mode="create" onCancel={jest.fn()} onSubmit={jest.fn()} />);

    expect(screen.getByLabelText('Title')).toBeTruthy();
    expect(screen.getByLabelText('Notes')).toBeTruthy();
    expect(screen.getByLabelText('Due date')).toBeTruthy();
    expect(screen.getByText('Low')).toBeTruthy();
    expect(screen.getByText('Medium')).toBeTruthy();
    expect(screen.getByText('High')).toBeTruthy();
  });

  it('autofocuses title input', () => {
    render(<TodoForm mode="create" onCancel={jest.fn()} onSubmit={jest.fn()} />);

    expect(screen.getByLabelText('Title').props.autoFocus).toBe(true);
  });

  it('shows validation error when title is empty on submit', () => {
    render(<TodoForm mode="create" onCancel={jest.fn()} onSubmit={jest.fn()} />);

    fireEvent.press(screen.getByText('Add Todo'));

    expect(screen.getByText('Title is required')).toBeTruthy();
  });

  it('calls onSubmit with correct data for create mode', () => {
    const onSubmit = jest.fn();

    render(<TodoForm mode="create" onCancel={jest.fn()} onSubmit={onSubmit} />);

    fireEvent.changeText(screen.getByLabelText('Title'), 'Review PR');
    fireEvent.changeText(screen.getByLabelText('Notes'), 'Check tests');
    fireEvent.changeText(screen.getByLabelText('Due date'), '2026-07-01');
    fireEvent.press(screen.getByText('High'));
    fireEvent.press(screen.getByText('Add Todo'));

    expect(onSubmit).toHaveBeenCalledWith({
      title: 'Review PR',
      notes: 'Check tests',
      due_date: '2026-07-01',
      priority: 'high',
    });
  });

  it('pre-fills fields from initialValues in edit mode', () => {
    render(
      <TodoForm
        initialValues={buildInitialValues()}
        mode="edit"
        onCancel={jest.fn()}
        onSubmit={jest.fn()}
      />,
    );

    expect(screen.getByLabelText('Title').props.value).toBe('Ship feature');
    expect(screen.getByLabelText('Notes').props.value).toBe('Before Friday');
    expect(screen.getByLabelText('Due date').props.value).toBe('2026-06-30');
  });

  it('calls onCancel when cancel pressed', () => {
    const onCancel = jest.fn();

    render(<TodoForm mode="create" onCancel={onCancel} onSubmit={jest.fn()} />);

    fireEvent.press(screen.getByText('Cancel'));

    expect(onCancel).toHaveBeenCalledTimes(1);
  });

  it('validates due date format', () => {
    render(<TodoForm mode="create" onCancel={jest.fn()} onSubmit={jest.fn()} />);

    fireEvent.changeText(screen.getByLabelText('Title'), 'Review PR');
    fireEvent.changeText(screen.getByLabelText('Due date'), 'not-a-date');
    fireEvent.press(screen.getByText('Add Todo'));

    expect(screen.getByText('Due date must be in YYYY-MM-DD format')).toBeTruthy();
  });

  it('priority selection highlights selected pill', () => {
    render(<TodoForm mode="create" onCancel={jest.fn()} onSubmit={jest.fn()} />);

    fireEvent.press(screen.getByText('High'));

    expect(StyleSheet.flatten(screen.getByTestId('priority-pill-high').props.style)).toMatchObject({
      backgroundColor: colors.priorityHigh,
      borderColor: colors.priorityHigh,
    });
  });
});
