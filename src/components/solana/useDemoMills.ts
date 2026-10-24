"use client";

import { useEffect, useState } from "react";

export interface DemoMill {
  id: 1 | 2 | 3;
  name: string;
  address: string;
}

/** Loads the demo mills (names + public addresses) from /api/solana/mills. */
export function useDemoMills() {
  const [mills, setMills] = useState<DemoMill[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/solana/mills")
      .then((r) => r.json())
      .then((data) => {
        if (cancelled) return;
        if (data.success) setMills(data.mills);
        else setError(data.error || "Solana demo mills unavailable");
      })
      .catch(() => !cancelled && setError("Could not load demo mills"));
    return () => {
      cancelled = true;
    };
  }, []);

  return { mills, error };
}

export function shortAddress(address: string) {
  return `${address.slice(0, 4)}…${address.slice(-4)}`;
}
