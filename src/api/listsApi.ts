import { supabase } from '@/api/supabaseClient';
import type {
  CreateListInput,
  Invitation,
  TodoList as BaseTodoList,
  TodoListWithMembers,
  UpdateListInput,
} from '@/types';

export type TodoList = BaseTodoList & {
  member_count?: number;
};

type ListRowWithCount = BaseTodoList & {
  list_members?: Array<{ count: number | null }> | null;
};

async function requireCurrentUser() {
  const { data, error } = await supabase.auth.getUser();

  if (error) {
    throw new Error(`Failed to get current user: ${error.message}`);
  }

  if (!data.user) {
    throw new Error('No authenticated user found.');
  }

  return data.user;
}

export async function getLists(): Promise<TodoList[]> {
  const { data, error } = await supabase
    .from('lists')
    .select('id, title, owner_id, created_at, updated_at, deleted_at, list_members(count)')
    .is('deleted_at', null)
    .order('updated_at', { ascending: false });

  if (error) {
    throw new Error(`Failed to fetch lists: ${error.message}`);
  }

  return ((data ?? []) as ListRowWithCount[]).map(({ list_members, ...list }) => ({
    ...list,
    member_count: list_members?.[0]?.count ?? 0,
  }));
}

export async function getList(
  id: string,
): Promise<TodoListWithMembers | null> {
  const { data: list, error: listError } = await supabase
    .from('lists')
    .select('*')
    .eq('id', id)
    .is('deleted_at', null)
    .maybeSingle();

  if (listError) {
    throw new Error(`Failed to fetch list: ${listError.message}`);
  }

  if (!list) {
    return null;
  }

  const { data: members, error: membersError } = await supabase
    .from('list_members')
    .select('*')
    .eq('list_id', id);

  if (membersError) {
    throw new Error(`Failed to fetch list members: ${membersError.message}`);
  }

  return {
    ...list,
    members: members ?? [],
  };
}

export async function createList(input: CreateListInput): Promise<TodoList> {
  const user = await requireCurrentUser();

  const { data: list, error: listError } = await supabase
    .from('lists')
    .insert({
      id: input.id,
      title: input.title,
      owner_id: input.owner_id ?? user.id,
      created_at: input.created_at,
      updated_at: input.updated_at,
      deleted_at: input.deleted_at ?? null,
    })
    .select()
    .single();

  if (listError || !list) {
    throw new Error(`Failed to create list: ${listError?.message ?? 'Unknown error.'}`);
  }

  const { error: memberError } = await supabase.from('list_members').insert({
    list_id: list.id,
    user_id: input.owner_id ?? user.id,
    role: 'owner',
    joined_at: input.created_at,
  });

  if (memberError) {
    throw new Error(`Failed to create owner membership: ${memberError.message}`);
  }

  return {
    ...list,
    member_count: 1,
  };
}

export async function updateList(
  id: string,
  patch: UpdateListInput,
): Promise<BaseTodoList> {
  const { data, error } = await supabase
    .from('lists')
    .update(patch)
    .eq('id', id)
    .select()
    .single();

  if (error || !data) {
    throw new Error(`Failed to update list: ${error?.message ?? 'Unknown error.'}`);
  }

  return data as BaseTodoList;
}

export async function deleteList(id: string): Promise<void> {
  const { error } = await supabase
    .from('lists')
    .update({
      deleted_at: new Date().toISOString(),
    })
    .eq('id', id);

  if (error) {
    throw new Error(`Failed to delete list: ${error.message}`);
  }
}

export async function inviteToList(
  listId: string,
  email: string,
  role: Invitation['role'],
): Promise<Invitation> {
  const user = await requireCurrentUser();
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
  const token = crypto.randomUUID();

  const { data, error } = await supabase
    .from('invitations')
    .insert({
      list_id: listId,
      invited_by: user.id,
      email,
      token,
      role,
      expires_at: expiresAt,
    })
    .select()
    .single();

  if (error || !data) {
    throw new Error(`Failed to create invitation: ${error?.message ?? 'Unknown error.'}`);
  }

  return data;
}

export async function acceptInvitation(token: string): Promise<string> {
  const user = await requireCurrentUser();

  if (!user.email) {
    throw new Error('Current user does not have an email address.');
  }

  const { data: invitation, error: invitationError } = await supabase
    .from('invitations')
    .select('*')
    .eq('token', token)
    .single();

  if (invitationError || !invitation) {
    throw new Error(
      `Failed to load invitation: ${invitationError?.message ?? 'Invitation not found.'}`,
    );
  }

  if (invitation.accepted_at) {
    throw new Error('Invitation has already been accepted.');
  }

  if (new Date(invitation.expires_at).getTime() <= Date.now()) {
    throw new Error('Invitation has expired.');
  }

  if (invitation.email && invitation.email.toLowerCase() !== user.email.toLowerCase()) {
    throw new Error('Invitation email does not match the current user.');
  }

  const acceptedAt = new Date().toISOString();

  const { error: updateError } = await supabase
    .from('invitations')
    .update({
      accepted_at: acceptedAt,
    })
    .eq('id', invitation.id);

  if (updateError) {
    throw new Error(`Failed to accept invitation: ${updateError.message}`);
  }

  const { error: memberError } = await supabase.from('list_members').insert({
    list_id: invitation.list_id,
    user_id: user.id,
    role: invitation.role,
    invited_by: invitation.invited_by,
  });

  if (memberError) {
    throw new Error(`Failed to add user to list: ${memberError.message}`);
  }

  return invitation.list_id;
}

export async function removeMember(listId: string, userId: string): Promise<void> {
  await requireCurrentUser();

  const { error } = await supabase
    .from('list_members')
    .delete()
    .eq('list_id', listId)
    .eq('user_id', userId);

  if (error) {
    throw new Error(`Failed to remove member: ${error.message}`);
  }
}
