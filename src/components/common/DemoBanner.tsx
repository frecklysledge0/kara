import React from "react";
import { AlertCircle, ShieldAlert } from "lucide-react";

export function DemoBanner() {
  return (
    <div className="bg-amber-500/10 border-b border-amber-500/30 px-4 py-2 text-xs text-amber-300">
      <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <ShieldAlert className="w-4 h-4 text-amber-400 shrink-0" />
          <span className="font-semibold tracking-wide uppercase">Synthetic Benchmark Mode:</span>
          <span>
            Seller profiles, material test reports (MTRs), and pricing benchmarks are realistic synthetic records for demonstration.
          </span>
        </div>
        <div className="flex items-center gap-1.5 text-amber-400/80 font-mono text-[11px]">
          <AlertCircle className="w-3.5 h-3.5" />
          <span>Non-financial simulation &bull; ASTM standards deterministic validation</span>
        </div>
      </div>
    </div>
  );
}
