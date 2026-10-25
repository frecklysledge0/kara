"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { SellerAccess, safeSellerNext } from "@/components/auth/SellerAccess";

function LoginContent() {
  const params = useSearchParams();
  const mode = params.get("mode") === "signup" ? "signup" : "signin";
  return <SellerAccess key={mode} next={safeSellerNext(params.get("next"))} initialMode={mode} redirectOnSignIn />;
}

export default function LoginPage() {
  return <Suspense fallback={<p className="workspace-loading" role="status">Opening seller sign-in…</p>}><LoginContent /></Suspense>;
}
