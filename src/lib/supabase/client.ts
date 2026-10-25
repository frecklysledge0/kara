import { createClient, SupabaseClient } from "@supabase/supabase-js";
import { Database } from "@/types/database";
import { fetchWithTimeout } from "@/lib/network";

let browserClient: SupabaseClient<Database> | null = null;

/**
 * Returns a typed Supabase browser client configured with public/anon credentials.
 * SECURITY: Never injects or uses service-role keys in browser code.
 */
export function getSupabaseBrowserClient(): SupabaseClient<Database> | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anonKey) {
    return null;
  }

  if (!browserClient) {
    browserClient = createClient<Database>(url, anonKey, { global: { fetch: fetchWithTimeout } });
  }

  return browserClient;
}
