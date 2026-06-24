import { useCallback } from 'react';
import type { Session } from '@supabase/supabase-js';

import * as authApi from '@/api/authApi';
import { supabase } from '@/api/supabaseClient';
import { useAuthStore } from '@/store/authStore';
import type { Profile } from '@/types';

let authSubscription: authApi.Subscription | null = null;

async function loadProfile(session: Session): Promise<Profile> {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', session.user.id)
    .single();

  if (error || !data) {
    throw new Error(error?.message ?? 'Failed to load profile.');
  }

  return data;
}

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : 'Something went wrong.';
}

export function useAuth() {
  const { session, profile, loading, error, setSession, setProfile, setLoading, setError, clearAuth } =
    useAuthStore();

  const signIn = useCallback(
    async (email: string, password: string) => {
      setLoading(true);
      setError(null);

      try {
        const result = await authApi.signIn(email, password);

        if ('error' in result) {
          setError(result.error);
          return;
        }

        setSession(result.session);
        setProfile(result.profile);
        setError(null);
      } catch (authError) {
        setError(getErrorMessage(authError));
      } finally {
        setLoading(false);
      }
    },
    [setError, setLoading, setProfile, setSession],
  );

  const signUp = useCallback(
    async (email: string, password: string, displayName: string) => {
      setLoading(true);
      setError(null);

      try {
        const result = await authApi.signUp(email, password, displayName);

        if ('error' in result) {
          setError(result.error);
          return;
        }

        setSession(result.session);
        setProfile(result.profile);
        setError(null);
      } catch (authError) {
        setError(getErrorMessage(authError));
      } finally {
        setLoading(false);
      }
    },
    [setError, setLoading, setProfile, setSession],
  );

  const signOut = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      await authApi.signOut();
      clearAuth();
    } catch (authError) {
      setError(getErrorMessage(authError));
    } finally {
      setLoading(false);
    }
  }, [clearAuth, setError, setLoading]);

  const initialize = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const currentSession = await authApi.getSession();
      setSession(currentSession);

      if (currentSession) {
        const currentProfile = await loadProfile(currentSession);
        setProfile(currentProfile);
      } else {
        setProfile(null);
      }

      authSubscription?.unsubscribe();
      authSubscription = authApi.onAuthStateChange(async (event, nextSession) => {
        if (event === 'SIGNED_OUT') {
          clearAuth();
          setLoading(false);
          return;
        }

        setSession(nextSession);

        if (nextSession) {
          try {
            const nextProfile = await loadProfile(nextSession);
            setProfile(nextProfile);
            setError(null);
          } catch (profileError) {
            setProfile(null);
            setError(getErrorMessage(profileError));
          }
        } else {
          setProfile(null);
        }

        setLoading(false);
      });
    } catch (authError) {
      clearAuth();
      setError(getErrorMessage(authError));
    } finally {
      setLoading(false);
    }
  }, [clearAuth, setError, setLoading, setProfile, setSession]);

  return {
    session,
    profile,
    loading,
    error,
    signIn,
    signUp,
    signOut,
    initialize,
  };
}
