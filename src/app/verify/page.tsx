"use client";

import React, { useId, useState } from "react";
import { CheckCircle2, ExternalLink, Fingerprint, RefreshCw, ShieldAlert, UploadCloud } from "lucide-react";
import { PageContainer } from "@/components/layout/PageContainer";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { fingerprintFile } from "@/lib/solana/hash-browser";
import { useDemoMills, shortAddress } from "@/components/solana/useDemoMills";

interface VerifyResponse {
  status: "mill-signed" | "not-registered";
  signature?: string;
  signedAt?: string;
  explorerUrl?: string;
}

export default function VerifyPage() {
  const { mills, error: millsError } = useDemoMills();
  const fileInputId = useId();
  const millSelectId = useId();
  const [file, setFile] = useState<File | null>(null);
  const [hash, setHash] = useState<string | null>(null);
  const [millAddress, setMillAddress] = useState<string>("");
  const [isChecking, setIsChecking] = useState(false);
  const [result, setResult] = useState<VerifyResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  const selectedMill = mills.find((m) => m.address === millAddress) ?? mills[0];

  async function onFileChosen(f: File | null) {
    setFile(f);
    setHash(null);
    setResult(null);
    setError(null);
    if (f) setHash(await fingerprintFile(f));
  }

  async function handleVerify() {
    if (!hash || !selectedMill) return;
    setIsChecking(true);
    setResult(null);
    setError(null);
    try {
      const res = await fetch("/api/solana/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ hash, millAddress: selectedMill.address }),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error || "Verification failed");
      setResult(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Verification failed");
    } finally {
      setIsChecking(false);
    }
  }

  return (
    <PageContainer
      title="Verify a Certificate"
      description="Check whether a mill test certificate is exactly the file its mill registered on Solana — not edited, not swapped."
      badge={<Badge variant="demo" size="sm">Solana devnet demo</Badge>}
      breadcrumbs={[{ label: "Home", href: "/" }, { label: "Verify" }]}
    >
      <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
        <Card>
          <CardHeader>
            <CardTitle>1. Choose the certificate and the mill that issued it</CardTitle>
            <CardDescription>
              The file never leaves your browser. Only its fingerprint (SHA-256) is checked against the mill&apos;s
              public Solana history.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <label
              htmlFor={fileInputId}
              className="flex flex-col items-center justify-center gap-2 rounded border-2 border-dashed border-slate-300 bg-slate-50 p-6 text-center cursor-pointer hover:border-slate-500 focus-within:ring-2 focus-within:ring-slate-900"
            >
              <UploadCloud className="w-6 h-6 text-slate-500" aria-hidden="true" />
              <span className="text-sm font-medium text-slate-900">{file ? file.name : "Select a certificate file"}</span>
              <span className="text-xs text-slate-500">PDF or image</span>
              <input
                id={fileInputId}
                type="file"
                accept="application/pdf,image/*"
                className="sr-only"
                onChange={(e) => onFileChosen(e.target.files?.[0] ?? null)}
              />
            </label>

            {hash && (
              <p className="font-mono text-[11px] text-slate-700 inline-flex items-center gap-1.5 break-all">
                <Fingerprint className="w-3.5 h-3.5 shrink-0 text-slate-500" aria-hidden="true" />
                Fingerprint: {hash}
              </p>
            )}

            <div className="space-y-1">
              <label htmlFor={millSelectId} className="text-xs font-medium text-slate-700 block">
                Claimed issuing mill
              </label>
              <select
                id={millSelectId}
                value={selectedMill?.address ?? ""}
                onChange={(e) => setMillAddress(e.target.value)}
                className="h-9 w-full rounded border border-slate-300 bg-white px-2 text-sm text-slate-900"
              >
                {mills.map((m) => (
                  <option key={m.id} value={m.address}>
                    {m.name} · {shortAddress(m.address)}
                  </option>
                ))}
              </select>
            </div>

            <Button onClick={handleVerify} disabled={!hash || !selectedMill || isChecking} className="w-full sm:w-auto">
              {isChecking ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" aria-hidden="true" /> Checking Solana…
                </>
              ) : (
                "Verify on Solana"
              )}
            </Button>

            {(error || millsError) && (
              <p role="alert" className="text-sm text-red-700">{error || millsError}</p>
            )}

            <div aria-live="polite">
              {result?.status === "mill-signed" && (
                <div className="rounded border border-emerald-300 bg-emerald-50 p-4 space-y-1.5">
                  <p className="font-semibold text-emerald-900 inline-flex items-center gap-2">
                    <CheckCircle2 className="w-5 h-5" aria-hidden="true" /> Mill-signed and unchanged
                  </p>
                  <p className="text-sm text-emerald-900">
                    {selectedMill?.name} registered this exact file
                    {result.signedAt ? ` on ${new Date(result.signedAt).toLocaleString()}` : ""}.
                  </p>
                  {result.explorerUrl && (
                    <a href={result.explorerUrl} target="_blank" rel="noopener noreferrer" className="text-sm underline text-emerald-900 inline-flex items-center gap-1">
                      View proof on Solana Explorer <ExternalLink className="w-3.5 h-3.5" aria-hidden="true" />
                    </a>
                  )}
                </div>
              )}
              {result?.status === "not-registered" && (
                <div className="rounded border border-red-300 bg-red-50 p-4 space-y-1.5">
                  <p className="font-semibold text-red-900 inline-flex items-center gap-2">
                    <ShieldAlert className="w-5 h-5" aria-hidden="true" /> Not registered by this mill
                  </p>
                  <p className="text-sm text-red-900">
                    Either the file was edited after the mill issued it, or this mill never registered it. Ask the
                    supplier for the original, or confirm the heat number with the mill directly.
                  </p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>How this works</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-slate-700">
            <p>
              <strong>Fingerprint:</strong> every file has a unique SHA-256 fingerprint. Changing a single character
              changes it completely.
            </p>
            <p>
              <strong>Mill signature:</strong> when a mill issues a certificate, its wallet signs that fingerprint
              onto Solana. Only that mill&apos;s key can create the record.
            </p>
            <p>
              <strong>Check:</strong> we search the mill&apos;s public Solana history for your file&apos;s fingerprint.
            </p>
            <p className="text-xs text-slate-500 border-t border-slate-200 pt-3">
              Limits: this proves the document is unchanged since the mill registered it — not that the steel
              matches it. The three mills here are synthetic demo wallets on Solana devnet.
            </p>
          </CardContent>
        </Card>
      </div>
    </PageContainer>
  );
}
