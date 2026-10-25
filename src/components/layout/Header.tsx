"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { 
  Menu, 
  X, 
  Search, 
  UploadCloud, 
  Sparkles, 
  FileText,
  ChevronRight,
  ShieldCheck,
  LogOut,
  Factory
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/Badge";
import { useAuth } from "@/components/auth/AuthProvider";

export function Header() {
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const { user, companyName, signOut } = useAuth();
  const isSeller = Boolean(user);

  // Buyers never need an account; signed-in sellers get their own workspace links.
  const buyerLinks = [
    { href: "/", label: "Find Your Steel", icon: Sparkles },
    { href: "/know-your-steel", label: "Know Your Steel", icon: Sparkles },
  ];
  const sellerLinks = [
    { href: "/sell", label: "List Inventory", icon: UploadCloud },
    { href: "/orders", label: "Quote Requests", icon: FileText },
    { href: "/listings", label: "Marketplace", icon: Search },
    { href: "/verify", label: "Verify MTR", icon: ShieldCheck },
  ];
  const navLinks = isSeller ? sellerLinks : buyerLinks;

  function isActive(href: string) {
    if (href === "/dashboard") return pathname === "/dashboard";
    return pathname === href || pathname?.startsWith(`${href}/`);
  }

  return (
    <header className="sticky top-0 z-40 w-full border-b border-slate-200 bg-white/95 backdrop-blur-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-14">
          {/* Brand Wordmark */}
          <div className="flex items-center gap-6">
            <Link
              href="/"
              className="flex items-center gap-2 group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-900 rounded py-1"
              aria-label="MillProof B2B Industrial Steel Home"
            >
              <div className="w-7 h-7 rounded bg-slate-900 text-white flex items-center justify-center font-bold text-xs shadow-xs">
                MP
              </div>
              <div className="flex items-baseline gap-1.5">
                <span className="font-bold text-base tracking-tight text-slate-900">
                  MillProof
                </span>
                <span className="text-[11px] font-mono text-slate-500 font-normal">
                  B2B
                </span>
              </div>
            </Link>

            {/* Desktop Navigation */}
            <nav className="hidden lg:flex items-center space-x-1" aria-label="Main Navigation">
              {navLinks.map((link) => {
                const active = isActive(link.href);
                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    className={cn(
                      "px-2.5 py-1.5 rounded text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-900",
                      active
                        ? "bg-slate-100 text-slate-900 font-semibold"
                        : "text-slate-600 hover:text-slate-900 hover:bg-slate-50"
                    )}
                  >
                    {link.label}
                  </Link>
                );
              })}
            </nav>
          </div>

          {/* Right Area: Demo Badge & Action */}
          <div className="hidden sm:flex items-center gap-3">
            <Badge variant="demo" size="sm">
              Demo Environment
            </Badge>

            {isSeller ? (
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-700 max-w-[180px] truncate" title={user?.email ?? undefined}>
                  <Factory className="w-3.5 h-3.5 text-slate-500 shrink-0" aria-hidden="true" />
                  {companyName || user?.email}
                </span>
                <button
                  type="button"
                  onClick={() => signOut()}
                  className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded text-xs font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-900"
                >
                  <LogOut className="w-3.5 h-3.5" aria-hidden="true" /> Sign out
                </button>
              </div>
            ) : (
              <Link
                href="/login?next=/sell"
                className="inline-flex items-center justify-center px-3 py-1.5 rounded text-xs font-medium bg-slate-900 text-white hover:bg-slate-800 transition-colors shadow-2xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-900"
              >
                For Sellers
              </Link>
            )}
          </div>

          {/* Mobile menu button */}
          <div className="flex items-center lg:hidden">
            <button
              type="button"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-1.5 rounded text-slate-600 hover:text-slate-900 hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-900"
              aria-label={mobileMenuOpen ? "Close menu" : "Open menu"}
              aria-expanded={mobileMenuOpen}
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile menu dropdown */}
      {mobileMenuOpen && (
        <div className="lg:hidden border-b border-slate-200 bg-white px-4 pt-2 pb-4 space-y-1 animate-in slide-in-from-top-2 duration-150">
          <div className="pb-2 mb-2 border-b border-slate-100 flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Navigation
            </span>
            <Badge variant="demo" size="sm">Demo Mode</Badge>
          </div>
          {navLinks.map((link) => {
            const Icon = link.icon;
            const active = isActive(link.href);
            return (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setMobileMenuOpen(false)}
                className={cn(
                  "flex items-center justify-between px-3 py-2 rounded text-sm transition-colors",
                  active
                    ? "bg-slate-100 text-slate-900 font-semibold"
                    : "text-slate-700 hover:bg-slate-50 hover:text-slate-900"
                )}
              >
                <div className="flex items-center gap-2.5">
                  <Icon className="w-4 h-4 text-slate-500" />
                  <span>{link.label}</span>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-400" />
              </Link>
            );
          })}
          <div className="pt-2 mt-2 border-t border-slate-100">
            {isSeller ? (
              <button
                type="button"
                onClick={() => { setMobileMenuOpen(false); signOut(); }}
                className="w-full flex items-center gap-2.5 px-3 py-2 rounded text-sm text-slate-700 hover:bg-slate-50"
              >
                <LogOut className="w-4 h-4 text-slate-500" aria-hidden="true" />
                Sign out{companyName ? ` (${companyName})` : ""}
              </button>
            ) : (
              <Link
                href="/login?next=/sell"
                onClick={() => setMobileMenuOpen(false)}
                className="flex items-center gap-2.5 px-3 py-2 rounded text-sm font-semibold text-slate-900 bg-slate-100"
              >
                <Factory className="w-4 h-4" aria-hidden="true" />
                For Sellers: sign in
              </Link>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
