import { act, fireEvent, render, screen } from '@testing-library/react-native';
import { beforeEach, describe, expect, it, jest } from '@jest/globals';

import { ListsScreen } from '@/screens/lists/ListsScreen';
import type { ListMember, TodoList } from '@/types';

const mockNavigate = jest.fn();
const mockRefresh = jest.fn();
const mockCreateList = jest.fn((title: string): TodoList => ({
  id: 'new-list',
  title,
  owner_id: 'user-1',
  created_at: '2026-06-24T10:00:00.000Z',
  updated_at: '2026-06-24T10:00:00.000Z',
  deleted_at: null,
}));
let mockLists: TodoList[] = [];

const mockMembers: ListMember[] = [
  {
    list_id: 'list-1',
    user_id: 'user-1',
    role: 'owner',
    invited_by: null,
    joined_at: '2026-06-24T10:00:00.000Z',
  },
];

jest.mock('@/hooks/useLists', () => ({
  useLists: () => ({
    lists: mockLists,
    loading: false,
    error: null,
    refresh: mockRefresh,
    createList: mockCreateList,
    deleteList: jest.fn(),
  }),
  useListMembers: () => ({
    members: mockMembers,
    loading: false,
    error: null,
    refresh: jest.fn(),
  }),
}));

jest.mock('@/components/todos/SyncStatusBanner', () => ({
  SyncStatusBanner: () => null,
}));

jest.mock('@react-navigation/native', () => {
  const actual = jest.requireActual('@react-navigation/native') as Record<string, unknown>;

  return {
    ...actual,
    useNavigation: () => ({
      navigate: mockNavigate,
    }),
  };
});

describe('ListsScreen', () => {
  beforeEach(() => {
    mockLists = [];
    mockNavigate.mockReset();
    mockRefresh.mockReset();
    mockCreateList.mockClear();
  });

  it('shows EmptyState when lists array is empty', () => {
    render(<ListsScreen />);

    expect(screen.getByText('No lists yet')).toBeTruthy();
    expect(screen.getByText('Create your first todo list to get started')).toBeTruthy();
  });

  it('renders ListCard for each list', () => {
    mockLists = [
      {
        id: 'list-1',
        title: 'Groceries',
        owner_id: 'user-1',
        created_at: '2026-06-24T10:00:00.000Z',
        updated_at: '2026-06-24T10:00:00.000Z',
        deleted_at: null,
      },
      {
        id: 'list-2',
        title: 'Work',
        owner_id: 'user-1',
        created_at: '2026-06-24T11:00:00.000Z',
        updated_at: '2026-06-24T11:00:00.000Z',
        deleted_at: null,
      },
    ];

    render(<ListsScreen />);

    expect(screen.getByText('Groceries')).toBeTruthy();
    expect(screen.getByText('Work')).toBeTruthy();
  });

  it('FAB triggers create list modal', () => {
    render(<ListsScreen />);

    fireEvent.press(screen.getByTestId('lists-screen-fab'));

    expect(screen.getByLabelText('List title')).toBeTruthy();
  });

  it('create list modal calls createList with typed title', () => {
    render(<ListsScreen />);

    fireEvent.press(screen.getByTestId('lists-screen-fab'));
    fireEvent.changeText(screen.getByLabelText('List title'), 'Weekend errands');
    fireEvent.press(screen.getByText('Create'));

    expect(mockCreateList).toHaveBeenCalledWith('Weekend errands');
  });

  it('navigates to ListDetail when ListCard is pressed', () => {
    mockLists = [
      {
        id: 'list-1',
        title: 'Groceries',
        owner_id: 'user-1',
        created_at: '2026-06-24T10:00:00.000Z',
        updated_at: '2026-06-24T10:00:00.000Z',
        deleted_at: null,
      },
    ];

    render(<ListsScreen />);
    fireEvent.press(screen.getByLabelText('Groceries list'));

    expect(mockNavigate).toHaveBeenCalledWith('ListDetail', { listId: 'list-1' });
  });

  it('pull-to-refresh calls refresh()', () => {
    mockLists = [
      {
        id: 'list-1',
        title: 'Groceries',
        owner_id: 'user-1',
        created_at: '2026-06-24T10:00:00.000Z',
        updated_at: '2026-06-24T10:00:00.000Z',
        deleted_at: null,
      },
    ];

    render(<ListsScreen />);

    act(() => {
      screen.getByTestId('lists-screen-flatlist').props.onRefresh();
    });

    expect(mockRefresh).toHaveBeenCalledTimes(1);
  });
});
