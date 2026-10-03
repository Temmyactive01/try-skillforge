import { createClient } from '@supabase/supabase-js';
import type { Database } from './types';

function supabaseConfig() {
  // Use import.meta.env for client-side (Vite build-time replacement)
  // Fall back to process.env for SSR (server-side rendering)
  const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
  const SUPABASE_PUBLISHABLE_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || process.env.SUPABASE_PUBLISHABLE_KEY;

  if (!SUPABASE_URL || !SUPABASE_PUBLISHABLE_KEY) {
    const missing = [
      ...(!SUPABASE_URL ? ['SUPABASE_URL'] : []),
      ...(!SUPABASE_PUBLISHABLE_KEY ? ['SUPABASE_PUBLISHABLE_KEY'] : []),
    ];
    const message = `Missing Supabase environment variable(s): ${missing.join(', ')}. Set them in .env (see README).`;
    console.error(`[Supabase] ${message}`);
    throw new Error(message);
  }
  return { url: SUPABASE_URL, key: SUPABASE_PUBLISHABLE_KEY };
}

function createSupabaseClient() {
  const { url, key } = supabaseConfig();
  return createClient<Database>(url, key, {
    auth: {
      // Browser sessions persist in localStorage; SSR has no storage.
      storage: typeof window === 'undefined' ? undefined : window.localStorage,
      persistSession: true,
      autoRefreshToken: true,
    }
  });
}

/**
 * Browser-only client whose session lives in this tab's sessionStorage, so other tabs
 * signing in or out can't replace or remove it. It never reads tokens from the URL
 * itself and never refreshes in the background; callers hand it a session explicitly.
 */
export function createTabSessionClient(storageKey: string) {
  const { url, key } = supabaseConfig();
  return createClient<Database>(url, key, {
    auth: {
      storage: window.sessionStorage,
      storageKey,
      persistSession: true,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  });
}

let _supabase: ReturnType<typeof createSupabaseClient> | undefined;

// Import the supabase client like this:
// import { supabase } from "@/integrations/supabase/client";
export const supabase = new Proxy({} as ReturnType<typeof createSupabaseClient>, {
  get(_, prop, receiver) {
    if (!_supabase) _supabase = createSupabaseClient();
    return Reflect.get(_supabase, prop, receiver);
  },
});
