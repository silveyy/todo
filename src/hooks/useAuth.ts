import { useCallback } from 'react';
import type { Session } from '@supabase/supabase-js';

import * as authApi from '@/api/authApi';
import { clearLocalProfile, getLocalProfile, saveLocalProfile } from '@/api/localProfile';
import { IS_SUPABASE_CONFIGURED, supabase } from '@/api/supabaseClient';
import { useAuthStore } from '@/store/authStore';
import type { Profile } from '@/types';

// Minimal session-shaped value used in local mode.
// Only user.id is read by the app after initialization.
function makeLocalSession(userId: string): Session {
  return {
    user: { id: userId, email: '' },
    access_token: '',
    refresh_token: '',
    expires_in: 0,
    token_type: 'bearer',
  } as unknown as Session;
}

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

  // ─── Local mode ───────────────────────────────────────────────────────────
  // Called by LocalSetupScreen when the user enters their name for the first time
  // (or updates it). No Supabase involved.
  const setupLocalProfile = useCallback(
    async (displayName: string) => {
      setLoading(true);
      setError(null);
      try {
        const savedProfile = await saveLocalProfile(displayName);
        setProfile(savedProfile);
        setSession(makeLocalSession(savedProfile.id));
      } catch (err) {
        setError(getErrorMessage(err));
      } finally {
        setLoading(false);
      }
    },
    [setError, setLoading, setProfile, setSession],
  );

  // ─── Connected mode ───────────────────────────────────────────────────────
  const signIn = useCallback(
    async (email: string, password: string) => {
      setLoading(true);
      setError(null);
      try {
        const result = await authApi.signIn(email, password);
        if ('error' in result) { setError(result.error); return; }
        setSession(result.session);
        setProfile(result.profile);
        setError(null);
      } catch (err) {
        setError(getErrorMessage(err));
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
        if ('error' in result) { setError(result.error); return; }
        setSession(result.session);
        setProfile(result.profile);
        setError(null);
      } catch (err) {
        setError(getErrorMessage(err));
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
      if (!IS_SUPABASE_CONFIGURED) {
        await clearLocalProfile();
      } else {
        await authApi.signOut();
      }
      clearAuth();
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, [clearAuth, setError, setLoading]);

  // ─── Initialization (called once on app start) ────────────────────────────
  const initialize = useCallback(async () => {
    setLoading(true);
    setError(null);

    // Local mode: read profile from secure store, no network call needed.
    if (!IS_SUPABASE_CONFIGURED) {
      try {
        const localProfile = await getLocalProfile();
        if (localProfile) {
          setProfile(localProfile);
          setSession(makeLocalSession(localProfile.id));
        }
        // If no profile yet, session stays null → AuthNavigator shows LocalSetupScreen.
      } catch (err) {
        setError(getErrorMessage(err));
      } finally {
        setLoading(false);
      }
      return;
    }

    // Connected mode: restore Supabase session and subscribe to auth events.
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
          } catch (profileErr) {
            setProfile(null);
            setError(getErrorMessage(profileErr));
          }
        } else {
          setProfile(null);
        }
        setLoading(false);
      });
    } catch (err) {
      clearAuth();
      setError(getErrorMessage(err));
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
    setupLocalProfile,
  };
}

