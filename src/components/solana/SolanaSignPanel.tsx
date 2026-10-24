"use client";

import React, { useEffect, useId, useState } from "react";
import Link from "next/link";
import { ExternalLink, Fingerprint, Link2, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { fingerprintFile } from "@/lib/solana/hash-browser";
import { useDemoMills, shortAddress } from "./useDemoMills";

/**
 * Seller-side panel: the issuing (demo) mill registers this certificate's fingerprint on Solana devnet.
 * Shown on /sell after a real file is uploaded.
 */
export function SolanaSignPanel({ file }: { file: File | null }) {
  const { mills, error: millsError } = useDemoMills();
  const selectId = useId();
  const [millId, setMillId] = useState<1 | 2 | 3>(1);
  const [hash, setHash] = useState<string | null>(null);
  const [isSigning, setIsSigning] = useState(false);
  const [result, setResult] = useState<{ explorerUrl: string; signature: string } | null>(null);
  const [error, setError] = useState<string | null>(null);

  // The parent remounts this panel (via `key`) when the file changes, so state starts fresh.
  useEffect(() => {
    if (!file) return;
    fingerprintFile(file)
      .then(setHash)
      .catch(() => setError("Could not fingerprint file"));
  }, [file]);

  async function handleSign() {
    if (!hash) return;
    setIsSigning(true);
    setError(null);
    try {
      const res = await fetch("/api/solana/sign", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ hash, mill: millId }),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error || "Signing failed");
      setResult({ explorerUrl: data.explorerUrl, signature: data.signature });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Signing failed");
    } finally {
      setIsSigning(false);
    }
  }

  return (
    <section className="p-3 rounded border border-violet-200 bg-violet-50/60 space-y-3" aria-label="Solana mill signature">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <h4 className="text-xs font-semibold text-slate-900 inline-flex items-center gap-1.5">
          <Link2 className="w-3.5 h-3.5 text-violet-700" aria-hidden="true" />
          Mill signature on Solana
        </h4>
        <Badge variant="demo" size="sm">Devnet demo</Badge>
      </div>

      {!file ? (
        <p className="text-[11px] text-slate-600">
          Upload your own certificate file (not a built-in benchmark) to register its fingerprint.
        </p>
      ) : (
        <>
          <p className="text-[11px] text-slate-600">
            The issuing mill signs this file&apos;s fingerprint onto Solana. Later, anyone can check the file
            was not edited since. This proves the document is unchanged, not that the steel matches it.
          </p>
          <div className="font-mono text-[11px] text-slate-700 inline-flex items-center gap-1.5 break-all">
            <Fingerprint className="w-3.5 h-3.5 shrink-0 text-slate-500" aria-hidden="true" />
            {hash ? `${hash.slice(0, 24)}…` : "Computing fingerprint…"}
          </div>

          {result ? (
            <div className="space-y-1.5">
              <p className="text-xs font-semibold text-emerald-800">✓ Registered by {mills.find((m) => m.id === millId)?.name}</p>
              <a
                href={result.explorerUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-[11px] text-violet-800 underline inline-flex items-center gap-1"
              >
                View transaction on Solana Explorer <ExternalLink className="w-3 h-3" aria-hidden="true" />
              </a>
              <p className="text-[11px] text-slate-600">
                Buyers can check it on the <Link href="/verify" className="underline">Verify page</Link>.
              </p>
            </div>
          ) : (
            <div className="flex items-end gap-2 flex-wrap">
              <div className="space-y-1">
                <label htmlFor={selectId} className="text-[10px] font-mono uppercase text-slate-500 block">
                  Issuing mill
                </label>
                <select
                  id={selectId}
                  value={millId}
                  onChange={(e) => setMillId(Number(e.target.value) as 1 | 2 | 3)}
                  className="h-8 rounded border border-slate-300 bg-white px-2 text-xs text-slate-900"
                >
                  {mills.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.name} · {shortAddress(m.address)}
                    </option>
                  ))}
                </select>
              </div>
              <Button size="sm" onClick={handleSign} disabled={!hash || isSigning || mills.length === 0}>
                {isSigning ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" aria-hidden="true" /> Signing on Solana…
                  </>
                ) : (
                  "Register fingerprint as mill"
                )}
              </Button>
            </div>
          )}
        </>
      )}

      {(error || millsError) && (
        <p role="alert" className="text-[11px] text-red-700">{error || millsError}</p>
      )}
    </section>
  );
}
