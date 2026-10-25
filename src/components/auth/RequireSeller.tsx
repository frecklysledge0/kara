"use client";

import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { useAuth } from "./AuthProvider";
import { SellerAccess } from "./SellerAccess";

/** Authenticated children stay protected; signed-out sellers get the actual form. */
export function RequireSeller({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();
  const pathname = usePathname() || "/sell";
  if (loading) return <div className="workspace-loading" role="status">Opening your seller workspace…</div>;
  if (user) return <>{children}</>;
  return <div className="customer-app"><SellerAccess next={pathname} /></div>;
}
