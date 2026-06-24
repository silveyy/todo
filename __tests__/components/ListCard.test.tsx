import { fireEvent, render, screen } from '@testing-library/react-native';
import { afterEach, beforeEach, describe, expect, it, jest } from '@jest/globals';

import { ListCard } from '@/components/lists/ListCard';
import type { ListMember, TodoList } from '@/types';

const baseList: TodoList = {
  id: 'list-1',
  title: 'Groceries',
  owner_id: 'user-1',
  created_at: '2026-06-24T10:00:00.000Z',
  updated_at: '2026-06-24T10:00:00.000Z',
  deleted_at: null,
};

const members: ListMember[] = [
  {
    list_id: 'list-1',
    user_id: 'user-1',
    role: 'owner',
    invited_by: null,
    joined_at: '2026-06-24T10:00:00.000Z',
  },
  {
    list_id: 'list-1',
    user_id: 'user-2',
    role: 'editor',
    invited_by: 'user-1',
    joined_at: '2026-06-24T10:01:00.000Z',
  },
  {
    list_id: 'list-1',
    user_id: 'user-3',
    role: 'viewer',
    invited_by: 'user-1',
    joined_at: '2026-06-24T10:02:00.000Z',
  },
];

describe('ListCard', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2026-06-24T10:00:30.000Z'));
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('renders list title', () => {
    render(<ListCard list={baseList} members={members} onPress={jest.fn()} />);

    expect(screen.getByText('Groceries')).toBeTruthy();
  });

  it('renders member count', () => {
    render(<ListCard list={baseList} members={members} onPress={jest.fn()} />);

    expect(screen.getByText('3 members')).toBeTruthy();
  });

  it('calls onPress when pressed', () => {
    const onPress = jest.fn();

    render(<ListCard list={baseList} members={members} onPress={onPress} />);
    fireEvent.press(screen.getByRole('button'));

    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('calls onLongPress when long pressed', () => {
    const onLongPress = jest.fn();

    render(
      <ListCard
        list={baseList}
        members={members}
        onLongPress={onLongPress}
        onPress={jest.fn()}
      />,
    );
    fireEvent(screen.getByRole('button'), 'longPress');

    expect(onLongPress).toHaveBeenCalledTimes(1);
  });

  it('shows pending badge when pendingCount > 0', () => {
    render(<ListCard list={baseList} members={members} onPress={jest.fn()} pendingCount={2} />);

    expect(screen.getByText('2 pending')).toBeTruthy();
  });

  it('does NOT show pending badge when pendingCount = 0', () => {
    render(<ListCard list={baseList} members={members} onPress={jest.fn()} pendingCount={0} />);

    expect(screen.queryByText('0 pending')).toBeNull();
  });

  it('shows "just now" for very recent updated_at', () => {
    render(<ListCard list={baseList} members={members} onPress={jest.fn()} />);

    expect(screen.getByText('just now')).toBeTruthy();
  });
});
