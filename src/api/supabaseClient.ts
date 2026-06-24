import { createClient } from '@supabase/supabase-js';
import * as SecureStore from 'expo-secure-store';

import type { Database } from '@/types/database';

const ExpoSecureStoreAdapter = {
  getItem: (key: string) => SecureStore.getItemAsync(key),
  setItem: (key: string, value: string) => SecureStore.setItemAsync(key, value),
  removeItem: (key: string) => SecureStore.deleteItemAsync(key),
};

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL ?? '';
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? '';

/**
 * True when both EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY are present.
 * When false the app runs in local/demo mode: SQLite works normally but all remote
 * API calls and real-time sync are disabled.
 */
export const IS_SUPABASE_CONFIGURED =
  supabaseUrl.startsWith('https://') && supabaseAnonKey.length > 0;

// Only construct the Supabase client when credentials are available.
// Calling createClient() with empty strings throws synchronously.
export const supabase = IS_SUPABASE_CONFIGURED
  ? createClient<Database>(supabaseUrl, supabaseAnonKey, {
      auth: {
        storage: ExpoSecureStoreAdapter,
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: false,
      },
    })
  : (null as unknown as ReturnType<typeof createClient<Database>>);
