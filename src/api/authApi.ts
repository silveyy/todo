import type { Session } from '@supabase/supabase-js';

import { supabase } from '@/api/supabaseClient';
import type { Profile } from '@/types';

export type AuthResult = { session: Session; profile: Profile } | { error: string };
export type Subscription = { unsubscribe: () => void };

export async function signUp(
  email: string,
  password: string,
  displayName: string,
): Promise<AuthResult> {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        display_name: displayName,
      },
    },
  });

  if (error) {
    return { error: error.message };
  }

  if (!data.user || !data.session) {
    return { error: 'Sign up did not create an active session.' };
  }

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .insert({
      id: data.user.id,
      display_name: displayName,
    })
    .select()
    .single();

  if (profileError || !profile) {
    return { error: profileError?.message ?? 'Failed to create profile.' };
  }

  return {
    session: data.session,
    profile,
  };
}

export async function signIn(email: string, password: string): Promise<AuthResult> {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    return { error: error.message };
  }

  if (!data.session || !data.user) {
    return { error: 'Sign in did not return a valid session.' };
  }

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', data.user.id)
    .single();

  if (profileError || !profile) {
    return { error: profileError?.message ?? 'Failed to load profile.' };
  }

  return {
    session: data.session,
    profile,
  };
}

export async function signOut(): Promise<void> {
  const { error } = await supabase.auth.signOut();

  if (error) {
    throw new Error(`Failed to sign out: ${error.message}`);
  }
}

export async function getSession(): Promise<Session | null> {
  const { data, error } = await supabase.auth.getSession();

  if (error) {
    throw new Error(`Failed to get session: ${error.message}`);
  }

  return data.session;
}

export function onAuthStateChange(
  callback: (event: string, session: Session | null) => void,
): Subscription {
  const {
    data: { subscription },
  } = supabase.auth.onAuthStateChange((event, session) => {
    callback(event, session);
  });

  return subscription as Subscription;
}
