import * as SecureStore from 'expo-secure-store';

import type { Profile } from '@/types';

const LOCAL_PROFILE_KEY = 'local_user_profile';

function generateUUID(): string {
  if (typeof globalThis.crypto?.randomUUID === 'function') {
    return globalThis.crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16);
  });
}

export async function getLocalProfile(): Promise<Profile | null> {
  const raw = await SecureStore.getItemAsync(LOCAL_PROFILE_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as Profile;
  } catch {
    return null;
  }
}

export async function saveLocalProfile(displayName: string): Promise<Profile> {
  // Preserve the existing id if a profile already exists so IDs stay stable.
  const existing = await getLocalProfile();
  const profile: Profile = {
    id: existing?.id ?? generateUUID(),
    display_name: displayName.trim(),
    avatar_url: null,
    created_at: existing?.created_at ?? new Date().toISOString(),
  };
  await SecureStore.setItemAsync(LOCAL_PROFILE_KEY, JSON.stringify(profile));
  return profile;
}

export async function clearLocalProfile(): Promise<void> {
  await SecureStore.deleteItemAsync(LOCAL_PROFILE_KEY);
}
