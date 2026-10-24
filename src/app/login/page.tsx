"use client";

import React, { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { CheckCircle2, Factory, Fingerprint, MailCheck, ShieldCheck, Users } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { useAuth } from "@/components/auth/AuthProvider";

type Mode = "signin" | "signup";

/** Only allow redirects to pages on this site. */
function safeNext(raw: string | null) {
  return raw && raw.startsWith("/") && !raw.startsWith("//") ? raw : "/sell";
}

function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const next = safeNext(params.get("next"));
  const { user, configured } = useAuth();

  const [mode, setMode] = useState<Mode>(params.get("mode") === "signup" ? "signup" : "signin");
  const [companyName, setCompanyName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [checkEmail, setCheckEmail] = useState(false);

  // Already signed in? Go straight to the seller workspace.
  useEffect(() => {
    if (user) router.replace(next);
  }, [user, next, router]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const supabase = getSupabaseBrowserClient();
    if (!supabase) return setError("Supabase is not configured.");
    setIsSubmitting(true);
    setError(null);
    try {
      if (mode === "signup") {
        if (companyName.trim().length < 2) throw new Error("Enter your company name.");
        const { data, error: err } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: { company_name: companyName.trim(), role: "seller" },
            emailRedirectTo: `${window.location.origin}${next}`,
          },
        });
        if (err) throw err;
        if (!data.session) setCheckEmail(true); // email confirmation is on in Supabase
      } else {
        const { error: err } = await supabase.auth.signInWithPassword({ email, password });
        if (err) throw err;
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong. Try again.");
    } finally {
      setIsSubmitting(false);
    }
  }

  if (checkEmail) {
    return (
      <div className="space-y-4 text-center" role="status">
        <MailCheck className="w-10 h-10 mx-auto text-emerald-700" aria-hidden="true" />
        <h2 className="text-xl font-bold text-slate-900">Confirm your email</h2>
        <p className="text-sm text-slate-600">
          We sent a link to <strong>{email}</strong>. Open it to activate your seller account, then sign in.
        </p>
        <Button variant="outline" onClick={() => { setCheckEmail(false); setMode("signin"); }}>
          Back to sign in
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="space-y-1.5">
        <h2 className="text-2xl font-bold tracking-tight text-slate-900">
          {mode === "signup" ? "Create your seller account" : "Welcome back"}
        </h2>
        <p className="text-sm text-slate-600">
          {mode === "signup"
            ? "List inventory, upload mill certificates, and answer buyer quote requests."
            : "Sign in to manage your lots and certificates."}
        </p>
      </div>

      <div role="tablist" aria-label="Sign in or sign up" className="grid grid-cols-2 rounded-lg bg-slate-100 p-1 text-sm">
        {(["signin", "signup"] as Mode[]).map((m) => (
          <button
            key={m}
            role="tab"
            type="button"
            aria-selected={mode === m}
            onClick={() => { setMode(m); setError(null); }}
            className={`rounded-md py-1.5 font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-900 ${
              mode === m ? "bg-white text-slate-900 shadow-xs" : "text-slate-600 hover:text-slate-900"
            }`}
          >
            {m === "signin" ? "Sign in" : "Sign up"}
          </button>
        ))}
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {mode === "signup" && (
          <Input
            label="Company name"
            value={companyName}
            onChange={(e) => setCompanyName(e.target.value)}
            placeholder="e.g. Lakeshore Steel Service Center"
            autoComplete="organization"
            required
          />
        )}
        <Input
          label="Work email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@company.com"
          autoComplete="email"
          required
        />
        <Input
          label="Password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoComplete={mode === "signup" ? "new-password" : "current-password"}
          minLength={6}
          helperText={mode === "signup" ? "At least 6 characters." : undefined}
          required
        />
        {error && (
          <p role="alert" className="text-sm text-rose-700 bg-rose-50 border border-rose-200 rounded p-2.5">
            {error}
          </p>
        )}
        <Button type="submit" size="lg" className="w-full" isLoading={isSubmitting} disabled={!configured}>
          {mode === "signup" ? "Create seller account" : "Sign in"}
        </Button>
      </form>

      <p className="text-xs text-slate-500 text-center">
        Buying steel? You don&apos;t need an account.{" "}
        <Link href="/assistant" className="font-medium text-slate-900 underline underline-offset-2">
          Start sourcing
        </Link>
      </p>
    </div>
  );
}

const PERKS = [
  { icon: Users, title: "Reach verified buyers", text: "Fabricators and OEMs find your lots by need, not by part number." },
  { icon: ShieldCheck, title: "Certificates checked instantly", text: "Chemistry and strength audited against published grade limits." },
  { icon: Fingerprint, title: "Mill-signed on Solana", text: "Prove your certificate is the original, unedited document." },
];

export default function LoginPage() {
  return (
    <div className="min-h-[calc(100vh-3.5rem)] grid lg:grid-cols-2">
      {/* Brand panel */}
      <aside className="relative overflow-hidden bg-slate-950 text-white px-6 py-10 sm:px-12 sm:py-16 flex flex-col justify-between gap-10">
        <div
          aria-hidden="true"
          className="absolute inset-0 opacity-[0.07]"
          style={{
            backgroundImage:
              "linear-gradient(to right, #fff 1px, transparent 1px), linear-gradient(to bottom, #fff 1px, transparent 1px)",
            backgroundSize: "36px 36px",
          }}
        />
        <div aria-hidden="true" className="absolute -bottom-32 -right-32 w-96 h-96 rounded-full bg-amber-500/20 blur-3xl" />

        <div className="relative space-y-4 max-w-md">
          <span className="inline-flex items-center gap-2 text-xs font-mono uppercase tracking-widest text-amber-400">
            <Factory className="w-4 h-4" aria-hidden="true" /> For mills &amp; service centers
          </span>
          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight leading-tight">
            Your steel, proven before the first phone call.
          </h1>
          <p className="text-slate-300 text-sm sm:text-base">
            MillProof connects steel sellers with buyers. We don&apos;t sell steel, we make every lot easy to find and
            easy to trust.
          </p>
        </div>

        <ul className="relative space-y-4 max-w-md">
          {PERKS.map(({ icon: Icon, title, text }) => (
            <li key={title} className="flex gap-3">
              <span className="mt-0.5 w-8 h-8 shrink-0 rounded-md bg-white/10 flex items-center justify-center">
                <Icon className="w-4 h-4 text-amber-400" aria-hidden="true" />
              </span>
              <span>
                <span className="block text-sm font-semibold">{title}</span>
                <span className="block text-sm text-slate-400">{text}</span>
              </span>
            </li>
          ))}
        </ul>

        <p className="relative text-xs text-slate-500 inline-flex items-center gap-1.5">
          <CheckCircle2 className="w-3.5 h-3.5" aria-hidden="true" /> Free during the SBUHacks demo
        </p>
      </aside>

      {/* Form panel */}
      <section className="flex items-center justify-center px-6 py-12 sm:px-12 bg-white">
        <div className="w-full max-w-sm">
          <Suspense fallback={<div className="h-80" aria-busy="true" />}>
            <LoginForm />
          </Suspense>
        </div>
      </section>
    </div>
  );
}
