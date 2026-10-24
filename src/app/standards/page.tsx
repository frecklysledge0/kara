"use client";

import React, { useState } from "react";
import { 
  Calculator, 
  ChevronRight
} from "lucide-react";
import { PageContainer } from "@/components/layout/PageContainer";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { GradeDetailPanel } from "@/components/common/GradeDetailPanel";
import { GradeTranslatorPanel } from "@/components/common/GradeTranslatorPanel";
import { getAllGrades, getGradeById } from "@/lib/data/grades";
import { calculateIIWCarbonEquivalent, calculatePREN } from "@/lib/engine/metallurgy";

export default function StandardsPage() {
  const grades = getAllGrades();
  const [selectedGradeId, setSelectedGradeId] = useState<string>("astm-a572-50");
  const [familyFilter, setFamilyFilter] = useState<string>("ALL");
  const [searchTerm, setSearchTerm] = useState<string>("");

  // Interactive CEV / PREN Calculator Sandbox State
  const [customC, setCustomC] = useState<number>(0.18);
  const [customMn, setCustomMn] = useState<number>(1.15);
  const [customCr, setCustomCr] = useState<number>(0.04);
  const [customMo, setCustomMo] = useState<number>(0.01);
  const [customV, setCustomV] = useState<number>(0.035);
  const [customNi, setCustomNi] = useState<number>(0.03);
  const [customCu, setCustomCu] = useState<number>(0.12);
  const [customN, setCustomN] = useState<number>(0.02);

  const selectedGrade = getGradeById(selectedGradeId) || grades[0];

  const families = ["ALL", ...Array.from(new Set(grades.map((g) => g.material_family)))];

  const filteredGrades = grades.filter((g) => {
    const matchesFamily = familyFilter === "ALL" || g.material_family === familyFilter;
    const matchesSearch =
      g.canonical_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      g.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      g.typical_uses.some((u) => u.toLowerCase().includes(searchTerm.toLowerCase())) ||
      g.applicable_standard.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesFamily && matchesSearch;
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
    Cr: customCr > 1 ? customCr : 18.0,
    Mo: customMo > 0.5 ? customMo : 2.5,
    N: customN
  });

  return (
    <PageContainer
      title="Curated Steel Grade Knowledge Base"
      description="Peer-reviewed chemical tolerances, mechanical property ranges, weldability ratings, and cross-standard equivalents."
      breadcrumbs={[
        { label: "Marketplace", href: "/listings" },
        { label: "Standards Registry" },
      ]}
      badge={<Badge variant="outline" size="sm">ASTM &bull; AISI &bull; EN Reference Library</Badge>}
    >
      <div className="space-y-8">
        {/* Main 2-Column Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Left Column: Grade Navigator & Filters (4 cols) */}
          <div className="lg:col-span-4 space-y-4">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm">Search Catalog</CardTitle>
                <CardDescription>Filter by grade designation or family</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3 pt-0">
                <Input
                  placeholder="Search A36, 4140, 316L, 2205..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />

                <div>
                  <label className="text-[11px] font-medium text-slate-700 block mb-1">
                    Material Family
                  </label>
                  <Select
                    value={familyFilter}
                    onChange={(e) => setFamilyFilter(e.target.value)}
                  >
                    {families.map((f) => (
                      <option key={f} value={f}>
                        {f === "ALL" ? "All Material Families" : f}
                      </option>
                    ))}
                  </Select>
                </div>
              </CardContent>
            </Card>

            {/* Grade List */}
            <div className="space-y-1.5 max-h-[600px] overflow-y-auto pr-1">
              {filteredGrades.map((g) => {
                const isSelected = g.id === selectedGrade.id;
                return (
                  <button
                    key={g.id}
                    onClick={() => setSelectedGradeId(g.id)}
                    className={`w-full text-left p-3 rounded border transition-all flex items-center justify-between ${
                      isSelected
                        ? "bg-slate-900 text-white border-slate-900 shadow-sm"
                        : "bg-white text-slate-900 border-slate-200 hover:border-slate-300 hover:bg-slate-50"
                    }`}
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-xs">
                          {g.canonical_name}
                        </span>
                        <span
                          className={`text-[10px] px-1.5 py-0.2 rounded font-sans ${
                            isSelected
                              ? "bg-slate-800 text-slate-200"
                              : "bg-slate-100 text-slate-600"
                          }`}
                        >
                          Tier {g.relative_cost_tier.tier}
                        </span>
                      </div>
                      <span
                        className={`text-[11px] block mt-0.5 ${
                          isSelected ? "text-slate-300" : "text-slate-500"
                        }`}
                      >
                        {g.material_family}
                      </span>
                    </div>
                    <ChevronRight
                      className={`w-4 h-4 ${
                        isSelected ? "text-white" : "text-slate-400"
                      }`}
                    />
                  </button>
                );
              })}
            </div>
          </div>

          {/* Right Column: Full Grade Detail Panel (8 cols) */}
          <div className="lg:col-span-8">
            <GradeDetailPanel grade={selectedGrade} />
          </div>
        </div>

        {/* Cross-Standard Steel Grade Translator */}
        <div id="translator">
          <GradeTranslatorPanel />
        </div>

        {/* Metallurgical Formula Sandbox Section */}
        <Card className="border-slate-300">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Calculator className="w-4 h-4 text-slate-800" />
              <CardTitle className="text-sm">Deterministic Metallurgical Calculator Sandbox</CardTitle>
            </div>
            <CardDescription>
              Test arbitrary ladle chemistries against international carbon equivalent (IIW CEV) and pitting resistance (PREN) formulas.
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-6">
            <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-8 gap-3">
              <div>
                <label className="text-[10px] font-mono text-slate-500 uppercase block mb-1">C %</label>
                <Input
                  type="number"
                  step="0.01"
                  value={customC}
                  onChange={(e) => setCustomC(parseFloat(e.target.value) || 0)}
                />
              </div>
              <div>
                <label className="text-[10px] font-mono text-slate-500 uppercase block mb-1">Mn %</label>
                <Input
                  type="number"
                  step="0.05"
                  value={customMn}
                  onChange={(e) => setCustomMn(parseFloat(e.target.value) || 0)}
                />
              </div>
              <div>
                <label className="text-[10px] font-mono text-slate-500 uppercase block mb-1">Cr %</label>
                <Input
                  type="number"
                  step="0.1"
                  value={customCr}
                  onChange={(e) => setCustomCr(parseFloat(e.target.value) || 0)}
                />
              </div>
              <div>
                <label className="text-[10px] font-mono text-slate-500 uppercase block mb-1">Mo %</label>
                <Input
                  type="number"
                  step="0.05"
                  value={customMo}
                  onChange={(e) => setCustomMo(parseFloat(e.target.value) || 0)}
                />
              </div>
              <div>
                <label className="text-[10px] font-mono text-slate-500 uppercase block mb-1">V %</label>
                <Input
                  type="number"
                  step="0.01"
                  value={customV}
                  onChange={(e) => setCustomV(parseFloat(e.target.value) || 0)}
                />
              </div>
              <div>
                <label className="text-[10px] font-mono text-slate-500 uppercase block mb-1">Ni %</label>
                <Input
                  type="number"
                  step="0.1"
                  value={customNi}
                  onChange={(e) => setCustomNi(parseFloat(e.target.value) || 0)}
                />
              </div>
              <div>
                <label className="text-[10px] font-mono text-slate-500 uppercase block mb-1">Cu %</label>
                <Input
                  type="number"
                  step="0.05"
                  value={customCu}
                  onChange={(e) => setCustomCu(parseFloat(e.target.value) || 0)}
                />
              </div>
              <div>
                <label className="text-[10px] font-mono text-slate-500 uppercase block mb-1">N %</label>
                <Input
                  type="number"
                  step="0.005"
                  value={customN}
                  onChange={(e) => setCustomN(parseFloat(e.target.value) || 0)}
                />
              </div>
            </div>

            {/* Formula Outputs */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
              <div className="p-4 rounded border border-slate-200 bg-slate-50">
                <span className="text-xs font-mono font-bold text-slate-900 block">
                  IIW Carbon Equivalent: {liveCEV.cev.toFixed(3)}
                </span>
                <span className="text-[11px] text-slate-600 block mt-1">
                  Weldability: <strong className="text-slate-900">{liveCEV.weldabilityRisk} Risk</strong> ({liveCEV.preheatRecommendation})
                </span>
                <span className="text-[10px] font-mono text-slate-400 block mt-1">
                  CE = C + Mn/6 + (Cr+Mo+V)/5 + (Ni+Cu)/15
                </span>
              </div>

              <div className="p-4 rounded border border-slate-200 bg-slate-50">
                <span className="text-xs font-mono font-bold text-slate-900 block">
                  Pitting Resistance Equivalent (PREN): {livePREN.pren.toFixed(1)}
                </span>
                <span className="text-[11px] text-slate-600 block mt-1">
                  Seawater Suitability: <strong className="text-slate-900">{livePREN.isMarineSuitable ? "Marine / Seawater Capable" : "Standard Non-Marine"}</strong> ({livePREN.notes})
                </span>
                <span className="text-[10px] font-mono text-slate-400 block mt-1">
                  PREN = Cr + 3.3(Mo) + 16(N)
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </PageContainer>
  );
}
