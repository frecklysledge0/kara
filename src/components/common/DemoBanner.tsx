import React from "react";
import { ShieldAlert, Info } from "lucide-react";

export function DemoBanner() {
  return (
    <div className="bg-amber-50/90 border-b border-amber-200/80 px-4 py-2 text-xs text-amber-900">
      <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <ShieldAlert className="w-3.5 h-3.5 text-amber-700 shrink-0" />
          <span className="font-semibold tracking-wide uppercase text-[10px] font-mono px-1.5 py-0.2 rounded bg-amber-200/60 text-amber-900 border border-amber-300">
            Synthetic Demo Mode
          </span>
          <span className="text-slate-700">
            All seller profiles, material test certificates, and price benchmarks are realistic synthetic records for demonstration.
          </span>
        </div>
        <div className="flex items-center gap-1.5 text-amber-800 font-mono text-[11px]">
          <Info className="w-3.5 h-3.5 text-amber-700" />
          <span>Deterministic ASTM limits check &bull; No live financial obligations</span>
        </div>
      </div>
    </div>
  );
}
