import type { Database } from '@/types/database';

export type ListRole = Database['public']['Enums']['list_role'];
export type Priority = Database['public']['Enums']['todo_priority'];
export type SyncStatus = 'idle' | 'syncing' | 'error';

export type Profile = Database['public']['Tables']['profiles']['Row'];

export type TodoList = Database['public']['Tables']['lists']['Row'];

export type ListMember = Database['public']['Tables']['list_members']['Row'];

export type Invitation = Omit<Database['public']['Tables']['invitations']['Row'], 'role'> & {
  role: Exclude<ListRole, 'owner'>;
};

export type TodoItem = Omit<Database['public']['Tables']['todos']['Row'], 'priority'> & {
  priority: Priority | null;
};

export type TodoListWithMembers = TodoList & { members: ListMember[] };
export type TodoListWithMemberProfiles = TodoList & {
  members: Array<ListMember & { profile: Profile }>;
};

export type CreateTodoInput = {
  title: string;
  notes?: string | null;
  due_date?: string | null;
  priority?: Priority | null;
  position?: number;
};

export type UpdateTodoInput = Partial<CreateTodoInput> & {
  completed?: boolean;
  completed_at?: string | null;
  completed_by?: string | null;
};

export type CreateListInput = {
  title: string;
  id?: string;
  owner_id?: string;
  created_at?: string;
  updated_at?: string;
  deleted_at?: string | null;
};
export type UpdateListInput = Partial<CreateListInput>;
