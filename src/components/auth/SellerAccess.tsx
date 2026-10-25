"use client";

import { useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRight, Factory, FileCheck2, Fingerprint, MailCheck } from "lucide-react";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { withTimeout } from "@/lib/network";
import { useAuth } from "./AuthProvider";

export function safeSellerNext(raw: string | null) {
  return raw && raw.startsWith("/") && !raw.startsWith("//") && !/[\\\r\n]/.test(raw) ? raw : "/sell";
}

/** Shared by /login and the protected workspace: no extra landing-page click. */
export function SellerAccess({ next = "/sell", initialMode = "signin", redirectOnSignIn = false }: {
  next?: string; initialMode?: "signin" | "signup"; redirectOnSignIn?: boolean;
}) {
  const { user, configured, error: sessionError } = useAuth();
  const router = useRouter();
  const [mode, setMode] = useState(initialMode);
  const [company, setCompany] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [checkEmail, setCheckEmail] = useState(false);
  const destination = safeSellerNext(next);

  useEffect(() => {
    if (user && redirectOnSignIn) router.replace(destination);
  }, [user, redirectOnSignIn, destination, router]);

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (busy) return;
    setBusy(true); setError("");
    try {
      const supabase = getSupabaseBrowserClient();
      if (!supabase) throw new Error("Seller sign-in is unavailable on this installation. Please contact the site owner and try again later.");
      if (mode === "signup" && company.trim().length < 2) throw new Error("Enter your company name.");
      const result = await withTimeout(mode === "signup"
        ? supabase.auth.signUp({ email: email.trim(), password, options: {
          data: { company_name: company.trim(), role: "seller" },
          emailRedirectTo: `${window.location.origin}${destination}`,
        } })
        : supabase.auth.signInWithPassword({ email: email.trim(), password }),
      15000, "Sign-in took too long. Check your connection and try again; your details are still here.");
      if (result.error) throw result.error;
      if (mode === "signup" && !result.data.session) setCheckEmail(true);
      else if (redirectOnSignIn) router.replace(destination);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "We couldn't sign you in. Please try again.");
    } finally { setBusy(false); }
  }

  return <section className="seller-access">
    <div className="seller-intro">
      <p className="eyebrow"><Factory size={16} /> The seller workspace</p>
      <h1>Your steel. <br /><span>Its proof.</span> <br />The right buyer.</h1>
      <p>Publish your inventory, check your mill certificates, and connect directly with buyers who need what you have.</p>
      <ul className="seller-benefits">
        <li><FileCheck2 size={22} /><div><strong>Upload. Review. Publish.</strong><span>Extract certificate data and review the checks before listing a lot.</span></div></li>
        <li><Fingerprint size={22} /><div><strong>A record buyers can check.</strong><span>Optional Solana proof shows a certificate file is unedited. It does not certify the steel.</span></div></li>
      </ul>
      <Link href="/">Buying steel? Start here <ArrowRight size={15} /></Link>
    </div>
    <div className="seller-auth-card">
      {checkEmail ? <div role="status" className="email-confirmation">
        <MailCheck size={32} /><h2>Check your email</h2>
        <p>Open the confirmation link sent to <strong>{email}</strong>, then sign in to your workspace.</p>
        <button type="button" className="solid-button" onClick={() => { setCheckEmail(false); setMode("signin"); }}>Back to sign in</button>
      </div> : <>
        <p className="eyebrow">For mills & service centers</p>
        <h2>{mode === "signup" ? "Create a seller account" : "Welcome back"}</h2>
        <p>{mode === "signup" ? "One account for your inventory, certificates, and quote requests." : "Sign in to open your inventory workspace."}</p>
        <div className="auth-mode" aria-label="Account access">
          <button type="button" aria-pressed={mode === "signin"} disabled={busy} onClick={() => { setMode("signin"); setError(""); }}>Sign in</button>
          <button type="button" aria-pressed={mode === "signup"} disabled={busy} onClick={() => { setMode("signup"); setError(""); }}>Create account</button>
        </div>
        {!configured && <p role="alert" className="customer-error">Seller sign-in is unavailable on this installation. The site owner needs to finish account setup. Buyers can still explore steel without an account.</p>}
        {sessionError && <p role="status" className="customer-error">{sessionError}</p>}
        <form onSubmit={submit} className="seller-auth-form">
          {mode === "signup" && <label>Company name<input name="company" autoComplete="organization" value={company} onChange={(e) => setCompany(e.target.value)} required minLength={2} placeholder="Your mill or service center" /></label>}
          <label>Work email<input name="email" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} required placeholder="you@company.com" /></label>
          <label>Password<input name="password" type="password" autoComplete={mode === "signup" ? "new-password" : "current-password"} value={password} onChange={(e) => setPassword(e.target.value)} required minLength={mode === "signup" ? 6 : undefined} /></label>
          {mode === "signup" && <p className="small muted">Use at least 6 characters.</p>}
          {error && <p role="alert" className="customer-error">{error}</p>}
          <button className="solid-button" type="submit" disabled={busy || !configured}>{busy ? (mode === "signup" ? "Creating your account…" : "Signing you in…") : mode === "signup" ? "Create seller account" : "Sign in to workspace"}<ArrowRight size={17} /></button>
        </form>
        <p className="auth-footnote">Buyers never need an account. MillProof connects you with suppliers; it does not sell steel.</p>
      </>}
    </div>
  </section>;
}
