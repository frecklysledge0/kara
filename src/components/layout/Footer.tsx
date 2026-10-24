import React from "react";
import Link from "next/link";
import { Layers, ShieldCheck, FileCheck, CheckCircle2 } from "lucide-react";

export function Footer() {
  return (
    <footer className="w-full border-t border-slate-800 bg-slate-950 text-slate-400 py-12 text-sm mt-auto">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Layers className="w-5 h-5 text-amber-400" />
              <span className="text-base font-bold text-white tracking-tight">MillProof</span>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed">
              Industrial B2B steel marketplace connecting structural fabricators, OEMs, and EPC contractors with verified mill inventory and deterministic MTR quality validation.
            </p>
          </div>

          <div>
            <h4 className="text-xs font-semibold text-slate-200 uppercase tracking-wider mb-3">Platform</h4>
            <ul className="space-y-2 text-xs">
              <li>
                <Link href="/procure" className="hover:text-amber-400 transition-colors">
                  Buyer Procurement &amp; Requirement Matcher
                </Link>
              </li>
              <li>
                <Link href="/seller" className="hover:text-amber-400 transition-colors">
                  Seller MTR Ingestion &amp; QC Workbench
                </Link>
              </li>
              <li>
                <Link href="/compare" className="hover:text-amber-400 transition-colors">
                  Multi-Lot Comparison Matrix
                </Link>
              </li>
              <li>
                <Link href="/standards" className="hover:text-amber-400 transition-colors">
                  ASTM &amp; EN Steel Grade Standards
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h4 className="text-xs font-semibold text-slate-200 uppercase tracking-wider mb-3">Compliance &amp; Rules</h4>
            <ul className="space-y-2 text-xs">
              <li className="flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                <span>Deterministic ASTM Tolerance Checks</span>
              </li>
              <li className="flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                <span>Carbon Equivalent (CEV / Pcm) Calculation</span>
              </li>
              <li className="flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                <span>EN 10204 Type 3.1 &amp; 3.2 Material Reports</span>
              </li>
              <li className="flex items-center gap-1.5 text-amber-300">
                <ShieldCheck className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                <span>Zero Crypto / No Fake Authenticity Claims</span>
              </li>
            </ul>
          </div>

          <div>
            <h4 className="text-xs font-semibold text-slate-200 uppercase tracking-wider mb-3">Engineering Notice</h4>
            <p className="text-[11px] text-slate-400 leading-relaxed bg-slate-900 border border-slate-800 p-3 rounded-lg">
              Documents are processed with AI for extraction only. All compliance pass/fail determinations, carbon equivalents, and delivered logistics costs are computed by deterministic software rules against published standards.
            </p>
          </div>
        </div>

        <div className="pt-6 border-t border-slate-900 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-400">
          <p>&copy; 2026 MillProof Industrial Systems. Synthetic demonstration benchmark platform.</p>
          <div className="flex items-center gap-4 text-xs">
            <span className="text-slate-400">Next.js App Router</span>
            <span className="text-slate-400">&bull;</span>
            <span className="text-slate-400">TypeScript Strict</span>
            <span className="text-slate-400">&bull;</span>
            <span className="text-slate-400">Deterministic Rule Engine</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
