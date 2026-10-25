import { createClient, SupabaseClient } from "@supabase/supabase-js";
import { Database } from "@/types/database";
import { fetchWithTimeout } from "@/lib/network";

/**
 * Returns a typed Supabase server client for use in API routes and Server Actions.
 * SECURITY: Called strictly in server-side contexts. Never exposed to browser bundles.
 */
export function getSupabaseServerClient(): SupabaseClient<Database> | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !key) {
    return null;
  }

  return createClient<Database>(url, key, {
    global: { fetch: fetchWithTimeout },
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}
