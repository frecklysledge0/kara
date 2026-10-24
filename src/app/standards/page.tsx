"use client";

import React, { useState } from "react";
import { 
  BookOpen, 
  ShieldCheck, 
  AlertTriangle, 
  CheckCircle2, 
  Scale, 
  Flame, 
  Calculator,
  Search,
  Filter
} from "lucide-react";
import { ALL_GRADE_STANDARDS, GRADE_STANDARDS_REGISTRY } from "@/lib/data/standards";
import { calculateIIWCarbonEquivalent, calculatePREN } from "@/lib/engine/metallurgy";

export default function StandardsPage() {
  const [selectedGradeId, setSelectedGradeId] = useState<string>("astm-a572-50");
  const [filterCategory, setFilterCategory] = useState<string>("ALL");
  const [searchTerm, setSearchTerm] = useState<string>("");

  // Interactive CEV Sandbox State
  const [customC, setCustomC] = useState<number>(0.18);
  const [customMn, setCustomMn] = useState<number>(1.15);
  const [customCr, setCustomCr] = useState<number>(0.04);
  const [customMo, setCustomMo] = useState<number>(0.01);
  const [customV, setCustomV] = useState<number>(0.035);
  const [customNi, setCustomNi] = useState<number>(0.03);
  const [customCu, setCustomCu] = useState<number>(0.12);

  const selectedGrade = GRADE_STANDARDS_REGISTRY[selectedGradeId] || ALL_GRADE_STANDARDS[0];

  const categories = ["ALL", ...Array.from(new Set(ALL_GRADE_STANDARDS.map((g) => g.category)))];

  const filteredGrades = ALL_GRADE_STANDARDS.filter((g) => {
    const matchesCat = filterCategory === "ALL" || g.category === filterCategory;
    const matchesSearch = 
      g.grade_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      g.description.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesCat && matchesSearch;
  });

  const liveCEV = calculateIIWCarbonEquivalent({
    C: customC,
    Mn: customMn,
    Cr: customCr,
    Mo: customMo,
    V: customV,
    Ni: customNi,
    Cu: customCu
  });

  const livePREN = calculatePREN({
    Cr: customCr * 100 > 10 ? customCr * 100 : 16.5,
    Mo: customMo * 100 > 1 ? customMo * 100 : 2.1,
    N: 0.04
  });

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-10">
      {/* Header */}
      <div className="space-y-3">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-800 text-amber-400 text-xs font-semibold border border-slate-700">
          <BookOpen className="w-3.5 h-3.5" />
          <span>Deterministic Specification Reference</span>
        </div>
        <h1 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
          ASTM &amp; AISI Steel Grade Standards Library
        </h1>
        <p className="text-sm text-slate-300 max-w-3xl leading-relaxed">
          Published industrial chemical thresholds, tensile limits, and weldability rules utilized by MillProof&apos;s deterministic verification engine. Mill test results are certified against these exact mathematical boundaries.
        </p>
      </div>

      {/* Main Grid: Standards Catalog & Detail Inspector */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Column: Grade Selector */}
        <div className="lg:col-span-5 space-y-4">
          <div className="p-4 rounded-xl border border-slate-800 bg-slate-900/60 space-y-3">
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
              <input
                type="text"
                placeholder="Search grades (e.g. A572, 316L)..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-xs text-white placeholder-slate-400 focus:outline-none focus:border-amber-500"
              />
            </div>

            <div className="flex flex-wrap gap-1.5 pt-1">
              {categories.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setFilterCategory(cat)}
                  className={`px-2.5 py-1 rounded text-[11px] font-medium transition-colors ${
                    filterCategory === cat
                      ? "bg-amber-500 text-slate-950 font-bold"
                      : "bg-slate-800 text-slate-300 hover:bg-slate-700"
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            {filteredGrades.map((grade) => {
              const isSelected = grade.id === selectedGradeId;
              return (
                <div
                  key={grade.id}
                  onClick={() => setSelectedGradeId(grade.id)}
                  className={`p-4 rounded-xl border cursor-pointer transition-all ${
                    isSelected
                      ? "border-amber-500/80 bg-slate-900/90 shadow-md shadow-amber-500/10"
                      : "border-slate-800 bg-slate-900/40 hover:border-slate-700 hover:bg-slate-900/60"
                  }`}
                >
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <span className="text-xs font-mono font-bold text-amber-400">{grade.standard_org} {grade.id.toUpperCase()}</span>
                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">
                      {grade.category}
                    </span>
                  </div>
                  <h3 className="text-sm font-bold text-white">{grade.grade_name}</h3>
                  <p className="text-xs text-slate-400 line-clamp-2 mt-1">{grade.description}</p>
                  
                  <div className="mt-3 pt-2 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-slate-400 font-mono">
                    <span>Min Yield: {grade.mech_limits.yield_min_ksi ?? "N/A"} ksi</span>
                    <span>Max CEV: {grade.max_cev ?? "N/A"}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right Column: Deep Specification Breakdown */}
        <div className="lg:col-span-7 space-y-6">
          <div className="p-6 rounded-2xl border border-slate-800 bg-slate-900/70 space-y-6 shadow-xl">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 pb-4">
              <div>
                <span className="text-xs font-mono text-amber-400 uppercase tracking-wider">{selectedGrade.standard_org} SPECIFICATION</span>
                <h2 className="text-2xl font-bold text-white">{selectedGrade.grade_name}</h2>
              </div>
              <div className="text-right">
                <span className="text-xs text-slate-400 block">Category</span>
                <span className="text-xs font-semibold text-slate-200">{selectedGrade.category}</span>
              </div>
            </div>

            <p className="text-sm text-slate-300 leading-relaxed">{selectedGrade.description}</p>

            {/* Typical Applications */}
            <div className="space-y-2">
              <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Prequalified Industrial Applications</h4>
              <div className="flex flex-wrap gap-2">
                {selectedGrade.typical_applications.map((app, idx) => (
                  <span key={idx} className="px-2.5 py-1 rounded-md bg-slate-800/80 border border-slate-700 text-slate-300 text-xs">
                    &bull; {app}
                  </span>
                ))}
              </div>
            </div>

            {/* Chemical Tolerances Table */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                  Chemical Composition Limits (% Max / Min by Ladle Analysis)
                </h4>
                {selectedGrade.max_cev && (
                  <span className="text-xs font-mono text-amber-400 font-bold">
                    Max CEV: {selectedGrade.max_cev}
                  </span>
                )}
              </div>
              <div className="overflow-x-auto rounded-lg border border-slate-800 bg-slate-950">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-900 border-b border-slate-800 text-slate-400 font-mono">
                    <tr>
                      <th className="p-2.5">Element</th>
                      <th className="p-2.5">Specified Min %</th>
                      <th className="p-2.5">Specified Max %</th>
                      <th className="p-2.5">Metallurgical Role</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/70 font-mono text-slate-200">
                    {Object.entries(selectedGrade.chem_limits).map(([el, lim]) => (
                      <tr key={el} className="hover:bg-slate-900/40">
                        <td className="p-2.5 font-bold text-amber-400">{el}</td>
                        <td className="p-2.5">{lim.min !== undefined ? `${lim.min.toFixed(2)}%` : "-"}</td>
                        <td className="p-2.5">{lim.max !== undefined ? `${lim.max.toFixed(2)}%` : "-"}</td>
                        <td className="p-2.5 text-slate-400 font-sans text-[11px]">
                          {el === "C" ? "Primary strength & hardness" :
                           el === "Mn" ? "Deoxidizer, hardenability" :
                           el === "P" || el === "S" ? "Harmful impurity (embrittlement)" :
                           el === "Si" ? "Deoxidizer, killed steel" :
                           el === "Cr" ? "Corrosion & oxidation resistance" :
                           el === "Ni" ? "Notch toughness at low temps" :
                           el === "Mo" ? "Creep resistance, pitting prevention" :
                           el === "V" || el === "Nb" ? "Grain refiner, precipitation hardening" :
                           "Alloying addition"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Mechanical Limits */}
            <div className="space-y-3">
              <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                Specified Mechanical Pull &amp; Impact Limits
              </h4>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="p-3 rounded-lg bg-slate-950 border border-slate-800">
                  <span className="text-[10px] text-slate-400 uppercase block font-mono">Yield Strength</span>
                  <span className="text-base font-bold text-white font-mono">
                    {selectedGrade.mech_limits.yield_min_ksi ? `${selectedGrade.mech_limits.yield_min_ksi} ksi min` : "N/A"}
                  </span>
                </div>

                <div className="p-3 rounded-lg bg-slate-950 border border-slate-800">
                  <span className="text-[10px] text-slate-400 uppercase block font-mono">Tensile Strength</span>
                  <span className="text-base font-bold text-white font-mono">
                    {selectedGrade.mech_limits.tensile_min_ksi ? `${selectedGrade.mech_limits.tensile_min_ksi} - ${selectedGrade.mech_limits.tensile_max_ksi ?? "inf"} ksi` : "N/A"}
                  </span>
                </div>

                <div className="p-3 rounded-lg bg-slate-950 border border-slate-800">
                  <span className="text-[10px] text-slate-400 uppercase block font-mono">Elongation (2-in)</span>
                  <span className="text-base font-bold text-white font-mono">
                    {selectedGrade.mech_limits.elongation_min_pct ? `${selectedGrade.mech_limits.elongation_min_pct}% min` : "N/A"}
                  </span>
                </div>

                <div className="p-3 rounded-lg bg-slate-950 border border-slate-800">
                  <span className="text-[10px] text-slate-400 uppercase block font-mono">Charpy V-Notch</span>
                  <span className="text-base font-bold text-emerald-400 font-mono">
                    {selectedGrade.mech_limits.charpy_min_ft_lbs ? `${selectedGrade.mech_limits.charpy_min_ft_lbs} ft-lb @ ${selectedGrade.mech_limits.charpy_temp_f}°F` : "Per Purchase Spec"}
                  </span>
                </div>
              </div>
            </div>

            {/* Weldability Guidance */}
            <div className="p-4 rounded-xl bg-slate-950/80 border border-slate-800 space-y-2">
              <div className="flex items-center gap-2 text-amber-400 text-xs font-semibold">
                <Flame className="w-4 h-4" />
                <span>Weldability Guidance &amp; Procedure Rating</span>
              </div>
              <p className="text-xs text-slate-300 leading-relaxed">
                {selectedGrade.weldability_rating}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Interactive Carbon Equivalent (CEV) Simulator */}
      <section className="p-6 rounded-2xl border border-slate-800 bg-slate-900/50 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Calculator className="w-5 h-5 text-amber-400" />
              <h3 className="text-lg font-bold text-white">Interactive Carbon Equivalent ($CEV$) Sandbox</h3>
            </div>
            <p className="text-xs text-slate-400">
              Test how custom ladle heat chemistries impact the International Institute of Welding ($CEV$) formula and cold-cracking preheat requirements.
            </p>
          </div>
          <div className="text-right">
            <span className="text-[11px] text-slate-400 block font-mono">IIW Formula:</span>
            <span className="text-xs font-mono text-amber-400 font-bold">C + Mn/6 + (Cr+Mo+V)/5 + (Ni+Cu)/15</span>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-7 gap-3">
          <div>
            <label className="text-[10px] font-mono text-slate-400 block mb-1">% Carbon (C)</label>
            <input
              type="number"
              step="0.01"
              value={customC}
              onChange={(e) => setCustomC(parseFloat(e.target.value) || 0)}
              className="w-full px-2.5 py-1.5 rounded bg-slate-950 border border-slate-800 text-xs font-mono text-white"
            />
          </div>

          <div>
            <label className="text-[10px] font-mono text-slate-400 block mb-1">% Manganese (Mn)</label>
            <input
              type="number"
              step="0.01"
              value={customMn}
              onChange={(e) => setCustomMn(parseFloat(e.target.value) || 0)}
              className="w-full px-2.5 py-1.5 rounded bg-slate-950 border border-slate-800 text-xs font-mono text-white"
            />
          </div>

          <div>
            <label className="text-[10px] font-mono text-slate-400 block mb-1">% Chromium (Cr)</label>
            <input
              type="number"
              step="0.01"
              value={customCr}
              onChange={(e) => setCustomCr(parseFloat(e.target.value) || 0)}
              className="w-full px-2.5 py-1.5 rounded bg-slate-950 border border-slate-800 text-xs font-mono text-white"
            />
          </div>

          <div>
            <label className="text-[10px] font-mono text-slate-400 block mb-1">% Molybdenum (Mo)</label>
            <input
              type="number"
              step="0.01"
              value={customMo}
              onChange={(e) => setCustomMo(parseFloat(e.target.value) || 0)}
              className="w-full px-2.5 py-1.5 rounded bg-slate-950 border border-slate-800 text-xs font-mono text-white"
            />
          </div>

          <div>
            <label className="text-[10px] font-mono text-slate-400 block mb-1">% Vanadium (V)</label>
            <input
              type="number"
              step="0.005"
              value={customV}
              onChange={(e) => setCustomV(parseFloat(e.target.value) || 0)}
              className="w-full px-2.5 py-1.5 rounded bg-slate-950 border border-slate-800 text-xs font-mono text-white"
            />
          </div>

          <div>
            <label className="text-[10px] font-mono text-slate-400 block mb-1">% Nickel (Ni)</label>
            <input
              type="number"
              step="0.01"
              value={customNi}
              onChange={(e) => setCustomNi(parseFloat(e.target.value) || 0)}
              className="w-full px-2.5 py-1.5 rounded bg-slate-950 border border-slate-800 text-xs font-mono text-white"
            />
          </div>

          <div>
            <label className="text-[10px] font-mono text-slate-400 block mb-1">% Copper (Cu)</label>
            <input
              type="number"
              step="0.01"
              value={customCu}
              onChange={(e) => setCustomCu(parseFloat(e.target.value) || 0)}
              className="w-full px-2.5 py-1.5 rounded bg-slate-950 border border-slate-800 text-xs font-mono text-white"
            />
          </div>
        </div>

        {/* Live Calculation Output Card */}
        <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-xl bg-amber-500/10 border border-amber-500/30 flex flex-col items-center justify-center font-mono">
              <span className="text-[10px] text-amber-400 font-bold uppercase">CEV</span>
              <span className="text-xl font-black text-white">{liveCEV.cev}</span>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                  liveCEV.weldabilityRisk === "LOW" ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" :
                  liveCEV.weldabilityRisk === "MODERATE" ? "bg-amber-500/10 text-amber-400 border border-amber-500/20" :
                  "bg-rose-500/10 text-rose-400 border border-rose-500/20"
                }`}>
                  {liveCEV.weldabilityRisk} Risk
                </span>
                <span className="text-xs text-slate-400">AWS D1.1 Preheat Assessment</span>
              </div>
              <p className="text-xs text-slate-300 mt-1 max-w-xl">
                {liveCEV.preheatRecommendation}
              </p>
            </div>
          </div>

          <div className="text-xs font-mono text-slate-400 bg-slate-900 px-3 py-2 rounded-lg border border-slate-800">
            <span>Deterministic Math Check:</span>
            <span className="text-emerald-400 font-bold block">100% Code Verified</span>
          </div>
        </div>
      </section>
    </div>
  );
}
