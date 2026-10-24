"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Factory, Lock } from "lucide-react";
import { useAuth } from "./AuthProvider";
import { Button } from "@/components/ui/Button";
import { Skeleton } from "@/components/ui/Skeleton";

/** Shows children only to signed-in sellers; everyone else gets a friendly sign-in prompt. */
export function RequireSeller({ children }: { children: React.ReactNode }) {
  const { user, loading, configured } = useAuth();
  const pathname = usePathname() || "/sell";

  if (loading) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-16 space-y-4" aria-busy="true">
        <Skeleton className="h-8 w-1/2" />
        <Skeleton className="h-32 w-full" />
      </div>
    );
  }

  if (user) return <>{children}</>;

  return (
    <div className="max-w-lg mx-auto px-4 py-16 sm:py-24 text-center space-y-5">
      <div className="w-12 h-12 mx-auto rounded-lg bg-slate-900 text-white flex items-center justify-center">
        <Factory className="w-6 h-6" aria-hidden="true" />
      </div>
      <div className="space-y-2">
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">Seller workspace</h1>
        <p className="text-sm text-slate-600">
          Listing inventory requires a verified seller account, so every certificate on MillProof traces back to a
          real company. Buyers can browse and request quotes without signing up.
        </p>
      </div>
      {configured ? (
        <div className="flex flex-col sm:flex-row gap-2 justify-center">
          <Link href={`/login?mode=signup&next=${encodeURIComponent(pathname)}`}>
            <Button size="lg" className="w-full sm:w-auto">Create seller account</Button>
          </Link>
          <Link href={`/login?next=${encodeURIComponent(pathname)}`}>
            <Button size="lg" variant="outline" className="w-full sm:w-auto">Sign in</Button>
          </Link>
        </div>
      ) : (
        <p className="text-xs text-amber-800 bg-amber-50 border border-amber-200 rounded p-3 inline-flex items-center gap-2">
          <Lock className="w-3.5 h-3.5" aria-hidden="true" /> Seller sign-in needs Supabase keys in .env.local.
        </p>
      )}
    </div>
  );
}
