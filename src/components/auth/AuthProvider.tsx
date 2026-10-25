"use client";

/**
 * Seller authentication (Supabase Auth, email + password).
 * Buyers never need an account. Only sellers sign in, so they can upload certificates and list lots.
 */
import React, { createContext, useContext, useEffect, useMemo, useState, useSyncExternalStore } from "react";
import type { User } from "@supabase/supabase-js";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { withTimeout } from "@/lib/network";

interface AuthState {
  user: User | null;
  /** Company name the seller entered at sign-up. */
  companyName: string | null;
  loading: boolean;
  /** False when Supabase env vars are missing (offline demo mode). */
  configured: boolean;
  error: string | null;
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
  const [error, setError] = useState<string | null>(null);

  // The Supabase client is created only in the browser (inside the effect), never during
  // server pre-rendering — Next.js 16 Cache Components fails the render otherwise.
  useEffect(() => {
    let mounted = true;
    let authChanged = false;
    let unsubscribe: (() => void) | undefined;
    const fail = () => {
      if (!mounted || authChanged) return;
      setError("We couldn't restore your session. Please sign in again.");
      setLoading(false);
    };
    try {
      const supabase = getSupabaseBrowserClient();
      if (!supabase) return; // Initial loading is already false without configuration.
      const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
        if (!mounted) return;
        authChanged = true;
        setUser(session?.user ?? null);
        setError(null);
        setLoading(false);
      });
      unsubscribe = () => sub.subscription.unsubscribe();
      void withTimeout(supabase.auth.getSession(), 10000, "Session check timed out").then(({ data, error }) => {
        if (!mounted || authChanged) return;
        if (error) { fail(); return; }
        setUser(data.session?.user ?? null);
        setLoading(false);
      }).catch(fail);
    } catch { fail(); }
    return () => { mounted = false; unsubscribe?.(); };
  }, []);

  const value = useMemo<AuthState>(
    () => ({
      user,
      companyName: (user?.user_metadata?.company_name as string | undefined) ?? null,
      loading,
      configured: SUPABASE_CONFIGURED,
      error,
      signOut: async () => {
        const result = await getSupabaseBrowserClient()?.auth.signOut();
        if (result?.error) throw result.error;
        setUser(null);
      },
    }),
    [user, loading, error],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

const DEFAULT_AUTH_STATE: AuthState = {
  user: null,
  companyName: null,
  loading: SUPABASE_CONFIGURED,
  configured: SUPABASE_CONFIGURED,
  error: null,
  signOut: async () => {},
};

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  // Streamed route segments can hydrate after the provider has resolved its session.
  // Their first render must still match the signed-out/loading server snapshot.
  const hydrated = useSyncExternalStore(subscribeHydration, clientSnapshot, serverSnapshot);
  return hydrated ? ctx ?? DEFAULT_AUTH_STATE : DEFAULT_AUTH_STATE;
}

const subscribeHydration = () => () => {};
const clientSnapshot = () => true;
const serverSnapshot = () => false;
