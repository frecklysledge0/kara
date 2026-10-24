"use client";

/**
 * Seller authentication (Supabase Auth, email + password).
 * Buyers never need an account. Only sellers sign in, so they can upload certificates and list lots.
 */
import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import type { User } from "@supabase/supabase-js";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";

interface AuthState {
  user: User | null;
  /** Company name the seller entered at sign-up. */
  companyName: string | null;
  loading: boolean;
  /** False when Supabase env vars are missing (offline demo mode). */
  configured: boolean;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthState | null>(null);

/** Env vars are inlined at build time, so this is safe to read during render. */
const SUPABASE_CONFIGURED = Boolean(
  process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(SUPABASE_CONFIGURED);

  // The Supabase client is created only in the browser (inside the effect), never during
  // server pre-rendering — Next.js 16 Cache Components fails the render otherwise.
  useEffect(() => {
    const supabase = getSupabaseBrowserClient();
    if (!supabase) return;
    supabase.auth.getSession().then(({ data }) => {
      setUser(data.session?.user ?? null);
      setLoading(false);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      setLoading(false);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  const value = useMemo<AuthState>(
    () => ({
      user,
      companyName: (user?.user_metadata?.company_name as string | undefined) ?? null,
      loading,
      configured: SUPABASE_CONFIGURED,
      signOut: async () => {
        await getSupabaseBrowserClient()?.auth.signOut();
      },
    }),
    [user, loading],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside <AuthProvider>");
  return ctx;
}
