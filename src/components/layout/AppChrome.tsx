"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, type ReactNode } from "react";
import { CustomerState, useCustomerSearch } from "@/components/customer/CustomerState";
import { useAuth } from "@/components/auth/AuthProvider";
import "@/components/customer/customer.css";

function Chrome({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const { user, signOut } = useAuth();
  const { state } = useCustomerSearch();
  const [authError, setAuthError] = useState("");
  const immersive = ["/", "/assistant", "/know-your-steel", "/compare", "/login"].includes(pathname);
  const seller = Boolean(user) && ["/sell", "/orders", "/verify"].includes(pathname);
  const links = seller ? [
    ["/sell", "List Inventory"], ["/orders", "Quote Requests"], ["/verify", "Verify"], ["/", "Buyer view"],
  ] : [
    ["/", "Find Steel"], ["/know-your-steel", "Know Your Steel"],
    ["/compare", `Compare${state.compareIds.length ? ` (${state.compareIds.length})` : ""}`],
    ["/verify", "Verify a Certificate"], ["/orders", "My Quotes"],
  ];
  return <div className={`millproof-shell ${immersive ? "customer-app" : "workspace-app"}`}>
    <a className="customer-skip" href="#customer-main">Skip to content</a>
    <header className="customer-header">
      <Link className="customer-logo" href="/" aria-label="MillProof home"><span aria-hidden="true" className="brand-mark">M</span>MillProof<span className="brand-dot">®</span></Link>
      <nav aria-label={seller ? "Seller navigation" : "Customer navigation"}>{links.map(([href, label]) =>
        <Link key={href} href={href} aria-current={pathname === href || (href === "/" && pathname === "/assistant") ? "page" : undefined}>{label}</Link>
      )}</nav>
      <div className="account-actions">
        <Link className="seller-link" href="/sell">{user ? "Seller workspace" : "For Sellers"} <span aria-hidden="true">↗</span></Link>
        {user && <button type="button" onClick={async () => { setAuthError(""); try { await signOut(); } catch { setAuthError("Sign-out failed. Please try again."); } }}>Sign out</button>}
      </div>
    </header>
    {authError && <p className="customer-error" role="alert">{authError}</p>}
    <main id="customer-main" className={immersive ? undefined : "workspace-surface"}>{children}</main>
    <footer className="customer-footer"><span>MillProof</span><span>Material knowledge. Human connections.</span><Link href="/listings">Browse inventory ↗</Link><span>© 2026</span></footer>
  </div>;
}

export function AppChrome({ children }: { children: ReactNode }) {
  return <CustomerState><Chrome>{children}</Chrome></CustomerState>;
}
