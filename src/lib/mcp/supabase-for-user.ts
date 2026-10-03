import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";

export type McpUser = { userId: string; token: string };

// Queries run with the caller's own token so RLS scopes every result.
export function supabaseForUser(user: McpUser) {
  return createClient<Database>(process.env.SUPABASE_URL!, process.env.SUPABASE_PUBLISHABLE_KEY!, {
    global: { headers: { Authorization: `Bearer ${user.token}` } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
