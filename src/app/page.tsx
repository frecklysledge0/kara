import React from "react";
import Link from "next/link";
import { 
  Sparkles, 
  UploadCloud, 
  Search, 
  ShieldCheck, 
  Layers, 
  Scale, 
  ArrowRight, 
  CheckCircle2, 
  Factory, 
  Truck, 
  FileText,
  AlertTriangle,
  Flame,
  Gauge
} from "lucide-react";
import { SYNTHETIC_LISTINGS } from "@/lib/data/synthetic-listings";
import { ALL_GRADE_STANDARDS } from "@/lib/data/standards";

export default function HomePage() {
  return (
    <div className="flex flex-col gap-16 py-8 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
      {/* Hero Section */}
      <section className="relative overflow-hidden rounded-2xl border border-slate-800 bg-gradient-to-b from-slate-900/90 via-slate-900/50 to-slate-950 p-8 sm:p-12 lg:p-16 shadow-2xl">
        <div className="absolute top-0 right-0 -mt-12 -mr-12 w-96 h-96 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 -mb-12 -ml-12 w-96 h-96 bg-sky-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative max-w-3xl space-y-6">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-400 text-xs font-semibold">
            <Flame className="w-3.5 h-3.5" />
            <span>AI Translation &bull; Deterministic ASTM Validation &bull; Delivered Landed Cost</span>
          </div>

          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-white leading-tight">
            Procure Industrial Steel with{" "}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-400 via-amber-200 to-amber-500">
              Verified Batch Certainty
            </span>
          </h1>

          <p className="text-lg text-slate-300 leading-relaxed">
            Translate engineering requirements into suitable ASTM/EN grades, compare verified inventory lots with delivered flatbed freight rates, and audit Mill Test Reports with mathematical precision.
          </p>

          <div className="flex flex-wrap items-center gap-4 pt-2">
            <Link
              href="/procure"
              className="inline-flex items-center gap-2 px-6 py-3.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-sm transition-all shadow-lg shadow-amber-500/25 hover:scale-[1.02]"
            >
              <Search className="w-4 h-4" />
              <span>Explore Marketplace &amp; AI Matcher</span>
              <ArrowRight className="w-4 h-4" />
            </Link>

            <Link
              href="/seller"
              className="inline-flex items-center gap-2 px-6 py-3.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-sm border border-slate-700 transition-all hover:scale-[1.02]"
            >
              <UploadCloud className="w-4 h-4 text-amber-400" />
              <span>Seller MTR Upload &amp; QC</span>
            </Link>

            <Link
              href="/standards"
              className="inline-flex items-center gap-2 px-5 py-3.5 rounded-xl text-slate-400 hover:text-slate-200 text-sm font-medium transition-colors"
            >
              <span>View ASTM Grade Specs</span>
            </Link>
          </div>

          <div className="pt-6 border-t border-slate-800/80 grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
            <div>
              <span className="text-slate-400 block">Chemistry Rules</span>
              <span className="font-semibold text-slate-200">ASTM C, Mn, P, S, Si</span>
            </div>
            <div>
              <span className="text-slate-400 block">Weldability Calc</span>
              <span className="font-semibold text-slate-200">CEV &amp; Pcm Deterministic</span>
            </div>
            <div>
              <span className="text-slate-400 block">Logistics Engine</span>
              <span className="font-semibold text-slate-200">45k lb Flatbed Haversine</span>
            </div>
            <div>
              <span className="text-slate-400 block">Data Integrity</span>
              <span className="font-semibold text-emerald-400">Zero Crypto / Real Specs</span>
            </div>
          </div>
        </div>
      </section>

      {/* Two Core Workflows */}
      <section className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Buyer Workflow */}
        <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-6 flex flex-col justify-between hover:border-slate-700 transition-colors">
          <div className="space-y-4">
            <div className="w-12 h-12 rounded-lg bg-sky-500/10 border border-sky-500/30 flex items-center justify-center text-sky-400">
              <Search className="w-6 h-6" />
            </div>
            <h2 className="text-xl font-bold text-white">For Industrial Buyers &amp; Fabricators</h2>
            <p className="text-sm text-slate-300 leading-relaxed">
              Input natural language application criteria (e.g. <i>&quot;Need 50 ksi yield structural plate for an outdoor sub-zero bridge girder with good weldability&quot;</i>). MillProof identifies standard ASTM matches, filters verified inventory lots, and itemizes delivered freight.
            </p>
            <ul className="space-y-2 text-xs text-slate-300 pt-2">
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-sky-400" />
                <span>AI requirement translation into ASTM A572, A516, A514, or 316L</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-sky-400" />
                <span>Delivered cost breakdown: Base CWT + Truckload Freight + Surcharges</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-sky-400" />
                <span>Chemical tolerance radar &amp; mechanical batch verification</span>
              </li>
            </ul>
          </div>
          <div className="pt-6">
            <Link
              href="/procure"
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-sky-400 hover:text-sky-300"
            >
              <span>Launch Buyer Procurement Workspace</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>

        {/* Seller Workflow */}
        <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-6 flex flex-col justify-between hover:border-slate-700 transition-colors">
          <div className="space-y-4">
            <div className="w-12 h-12 rounded-lg bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
              <UploadCloud className="w-6 h-6" />
            </div>
            <h2 className="text-xl font-bold text-white">For Mills &amp; Steel Service Centers</h2>
            <p className="text-sm text-slate-300 leading-relaxed">
              Upload raw Mill Test Reports (PDF / scan). Server-side Gemini extracts heat number, ladle chemical analysis, and tensile pull tests. Deterministic code immediately benchmarks every value against published ASTM tolerances.
            </p>
            <ul className="space-y-2 text-xs text-slate-300 pt-2">
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-amber-400" />
                <span>Automated extraction of heat numbers, chemistry, and tensile limits</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-amber-400" />
                <span>Deterministic pass/fail flagging against ASTM chemical limits</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-amber-400" />
                <span>One-click listing publish to verified inventory marketplace</span>
              </li>
            </ul>
          </div>
          <div className="pt-6">
            <Link
              href="/seller"
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-amber-400 hover:text-amber-300"
            >
              <span>Open Seller Ingestion Workbench</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      </section>

      {/* Synthetic Inventory Benchmark Preview */}
      <section className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800 pb-3">
          <div>
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              <Factory className="w-5 h-5 text-amber-400" />
              <span>Available Inventory Lots (Synthetic Benchmarks)</span>
            </h3>
            <p className="text-xs text-slate-400">
              Real-time lot availability backed by synthetic EN 10204 3.1 Mill Test Certificates.
            </p>
          </div>
          <Link
            href="/procure"
            className="text-xs text-amber-400 hover:underline flex items-center gap-1"
          >
            <span>View All in Catalog</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {SYNTHETIC_LISTINGS.slice(0, 3).map((lot) => (
            <div
              key={lot.id}
              className="rounded-xl border border-slate-800 bg-slate-900/40 p-5 space-y-4 hover:border-slate-700 transition-all flex flex-col justify-between"
            >
              <div className="space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">
                    Heat: {lot.certificate?.heat_number}
                  </span>
                  <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3" />
                    <span>ASTM Verified</span>
                  </span>
                </div>

                <h4 className="text-sm font-bold text-white line-clamp-1">{lot.title}</h4>
                <p className="text-xs text-slate-400">{lot.dimensions_display} &bull; {lot.product_form}</p>
              </div>

              <div className="pt-3 border-t border-slate-800/80 space-y-2 text-xs">
                <div className="flex justify-between text-slate-400">
                  <span>Available Weight:</span>
                  <span className="text-slate-200 font-mono font-medium">
                    {lot.total_weight_lbs.toLocaleString()} lbs ({(lot.total_weight_lbs / 2000).toFixed(1)} tons)
                  </span>
                </div>

                <div className="flex justify-between text-slate-400">
                  <span>Base Mill Price:</span>
                  <span className="text-amber-400 font-mono font-bold">
                    ${lot.price_per_cwt.toFixed(2)} / cwt
                  </span>
                </div>

                <div className="flex justify-between text-slate-400">
                  <span>FOB Warehouse:</span>
                  <span className="text-slate-300">
                    {lot.warehouse_city}, {lot.warehouse_state}
                  </span>
                </div>
              </div>

              <div className="pt-2">
                <Link
                  href={`/procure?selected=${lot.id}`}
                  className="w-full flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold transition-colors"
                >
                  <Scale className="w-3.5 h-3.5 text-amber-400" />
                  <span>Calculate Delivered Cost</span>
                </Link>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Standards Summary Banner */}
      <section className="rounded-xl border border-slate-800 bg-slate-900/30 p-6 flex flex-col md:flex-row items-center justify-between gap-6">
        <div className="space-y-1.5">
          <div className="flex items-center gap-2">
            <Gauge className="w-5 h-5 text-amber-400" />
            <h3 className="text-base font-bold text-white">Pre-Loaded ASTM &amp; AISI Structural Standards</h3>
          </div>
          <p className="text-xs text-slate-400 max-w-2xl">
            Deterministic validation against ASTM A36, A572-50, A514 (T-1), A516-70 PVQ, AISI 304L, AISI 316L, and AISI 4140 with chemical limits and Carbon Equivalent thresholds.
          </p>
        </div>
        <Link
          href="/standards"
          className="shrink-0 px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-amber-400 border border-slate-700 text-xs font-semibold transition-colors"
        >
          Explore Grade Library
        </Link>
      </section>
    </div>
  );
}
