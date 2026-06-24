import { StyleSheet } from 'react-native';
import { fireEvent, render, screen } from '@testing-library/react-native';
import { describe, expect, it, jest } from '@jest/globals';

import { TodoItem } from '@/components/todos/TodoItem';
import { colors } from '@/components/ui';
import type { TodoItem as TodoItemModel } from '@/types';

function buildTodo(overrides: Partial<TodoItemModel> = {}): TodoItemModel {
  return {
    id: 'todo-1',
    list_id: 'list-1',
    title: 'Write tests',
    notes: 'Remember edge cases',
    completed: false,
    completed_at: null,
    completed_by: null,
    due_date: null,
    priority: 'medium',
    position: 0,
    created_by: 'user-1',
    created_at: '2026-06-24T00:00:00.000Z',
    updated_at: '2026-06-24T00:00:00.000Z',
    deleted_at: null,
    ...overrides,
  };
}

describe('TodoItem', () => {
  it('renders todo title', () => {
    render(
      <TodoItem
        onComplete={jest.fn()}
        onDelete={jest.fn()}
        onEdit={jest.fn()}
        onUncomplete={jest.fn()}
        todo={buildTodo()}
      />,
    );

    expect(screen.getByText('Write tests')).toBeTruthy();
  });

  it('renders strikethrough style when completed=true', () => {
    render(
      <TodoItem
        onComplete={jest.fn()}
        onDelete={jest.fn()}
        onEdit={jest.fn()}
        onUncomplete={jest.fn()}
        todo={buildTodo({ completed: true })}
      />,
    );

    expect(StyleSheet.flatten(screen.getByText('Write tests').props.style)).toMatchObject({
      color: colors.gray500,
      textDecorationLine: 'line-through',
    });
  });

  it('calls onComplete when checkbox pressed on incomplete todo', () => {
    const onComplete = jest.fn();

    render(
      <TodoItem
        onComplete={onComplete}
        onDelete={jest.fn()}
        onEdit={jest.fn()}
        onUncomplete={jest.fn()}
        todo={buildTodo({ completed: false })}
      />,
    );

    fireEvent.press(screen.getByRole('checkbox'));

    expect(onComplete).toHaveBeenCalledWith('todo-1');
  });

  it('calls onUncomplete when checkbox pressed on complete todo', () => {
    const onUncomplete = jest.fn();

    render(
      <TodoItem
        onComplete={jest.fn()}
        onDelete={jest.fn()}
        onEdit={jest.fn()}
        onUncomplete={onUncomplete}
        todo={buildTodo({ completed: true })}
      />,
    );

    fireEvent.press(screen.getByRole('checkbox'));

    expect(onUncomplete).toHaveBeenCalledWith('todo-1');
  });

  it('calls onEdit when long pressed', () => {
    const onEdit = jest.fn();
    const todo = buildTodo();

    render(
      <TodoItem
        onComplete={jest.fn()}
        onDelete={jest.fn()}
        onEdit={onEdit}
        onUncomplete={jest.fn()}
        todo={todo}
      />,
    );

    fireEvent(screen.getByText('Write tests'), 'longPress');

    expect(onEdit).toHaveBeenCalledWith(todo);
  });

  it('calls onDelete when delete button pressed', () => {
    const onDelete = jest.fn();

    render(
      <TodoItem
        onComplete={jest.fn()}
        onDelete={onDelete}
        onEdit={jest.fn()}
        onUncomplete={jest.fn()}
        todo={buildTodo()}
      />,
    );

    fireEvent.press(screen.getByTestId('todo-delete-button'));

    expect(onDelete).toHaveBeenCalledWith('todo-1');
  });

  it('shows priority badge when priority is set', () => {
    render(
      <TodoItem
        onComplete={jest.fn()}
        onDelete={jest.fn()}
        onEdit={jest.fn()}
        onUncomplete={jest.fn()}
        todo={buildTodo({ priority: 'high' })}
      />,
    );

    expect(screen.getByText('High')).toBeTruthy();
  });

  it('shows overdue styling when due_date is in the past and not completed', () => {
    render(
      <TodoItem
        onComplete={jest.fn()}
        onDelete={jest.fn()}
        onEdit={jest.fn()}
        onUncomplete={jest.fn()}
        todo={buildTodo({ due_date: '2000-01-01' })}
      />,
    );

    expect(StyleSheet.flatten(screen.getByTestId('todo-due-date').props.style)).toMatchObject({
      color: colors.error,
    });
  });

  it('has correct accessibilityRole and accessibilityState', () => {
    render(
      <TodoItem
        onComplete={jest.fn()}
        onDelete={jest.fn()}
        onEdit={jest.fn()}
        onUncomplete={jest.fn()}
        todo={buildTodo({ completed: true })}
      />,
    );

    const checkbox = screen.getByRole('checkbox');
    expect(checkbox).toBeTruthy();
    expect(checkbox.props.accessibilityState).toMatchObject({ checked: true });
  });
});
