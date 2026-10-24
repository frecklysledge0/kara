"use client";

import React, { useState } from "react";
import Link from "next/link";
import { 
  Sparkles, 
  Search, 
  ArrowRight, 
  Compass, 
  ShieldCheck, 
  Layers, 
  Flame, 
  CheckCircle2, 
  RefreshCw,
  Info,
  HelpCircle
} from "lucide-react";
import { PageContainer } from "@/components/layout/PageContainer";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Input } from "@/components/ui/Input";
import { TranslatedRequirement } from "@/types/steel";

export default function AssistantPage() {
  const [prompt, setPrompt] = useState("");
  const [isTranslating, setIsTranslating] = useState(false);
  const [translationResult, setTranslationResult] = useState<TranslatedRequirement | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const presets = [
    {
      title: "Sub-Zero Highway Bridge Girder",
      prompt: "Outdoor highway bridge box girder requiring 50 ksi yield, Charpy impact toughness at -20°F, and high weldability under AWS D1.1 without cracking.",
    },
    {
      title: "Marine Seawater Piping & Flanges",
      prompt: "Fabricating an offshore chemical processing line exposed to sea splash and chloride corrosion. Must resist pitting and carbide precipitation.",
    },
    {
      title: "Excavator Wear Liners (High Abrasion)",
      prompt: "Heavy mining excavator bucket wear liner needing high yield strength >= 100 ksi and extreme abrasion resistance.",
    },
    {
      title: "Industrial Pressure Vessel (PVQ)",
      prompt: "Welded pressure vessel operating at moderate temperatures requiring ASME Section IX compliance and notch toughness.",
    },
  ];

  async function handleTranslate(query?: string) {
    const text = query || prompt;
    if (!text.trim()) return;

    setIsTranslating(true);
    setErrorMsg(null);

    try {
      const res = await fetch("/api/translate-requirements", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: text }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Translation request failed");
      }

      setTranslationResult(data.translation);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Error translating requirement";
      setErrorMsg(msg);
    } finally {
      setIsTranslating(false);
    }
  }

  return (
    <PageContainer
      title="Sourcing Assistant"
      description="Translate engineering requirements, structural loadings, and environmental conditions into standardized ASTM/EN grades."
      badge={<Badge variant="outline" size="sm">Intelligent Matching</Badge>}
    >
      <div className="space-y-8">
        {/* Main Input Card */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-slate-700" />
              <CardTitle>Describe Your Structural or Fabrication Application</CardTitle>
            </div>
            <CardDescription>
              Provide plain language functional requirements (yield strength, operating temperature, weldability, or corrosion conditions).
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-4">
            <div className="flex flex-col sm:flex-row gap-2">
              <div className="flex-1">
                <Input
                  placeholder="e.g. Need 50 ksi structural plate with good low-temperature impact toughness for bridge beams..."
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleTranslate()}
                />
              </div>
              <Button
                variant="primary"
                size="md"
                onClick={() => handleTranslate()}
                disabled={isTranslating || !prompt.trim()}
              >
                {isTranslating ? (
                  <RefreshCw className="w-4 h-4 animate-spin mr-1.5" />
                ) : (
                  <Sparkles className="w-4 h-4 mr-1.5" />
                )}
                <span>{isTranslating ? "Translating..." : "Translate Requirements"}</span>
              </Button>
            </div>

            {/* Presets */}
            <div className="space-y-2 pt-2 border-t border-slate-100">
              <span className="text-xs font-semibold text-slate-700 block">
                Benchmark Industry Presets:
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {presets.map((preset) => (
                  <button
                    key={preset.title}
                    type="button"
                    onClick={() => {
                      setPrompt(preset.prompt);
                      handleTranslate(preset.prompt);
                    }}
                    className="p-2.5 rounded border border-slate-200 bg-slate-50/60 hover:bg-slate-100/80 text-left transition-colors"
                  >
                    <span className="text-xs font-semibold text-slate-900 block">{preset.title}</span>
                    <span className="text-[11px] text-slate-500 line-clamp-1 mt-0.5">{preset.prompt}</span>
                  </button>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Error Notice */}
        {errorMsg && (
          <div className="p-4 rounded border border-rose-200 bg-rose-50 text-rose-800 text-xs">
            {errorMsg}
          </div>
        )}

        {/* Results Card */}
        {translationResult && (
          <div className="space-y-6 animate-in fade-in duration-200">
            <div className="flex items-center justify-between pb-2 border-b border-slate-200">
              <h2 className="text-lg font-bold text-slate-900">
                Recommended Specification Matches
              </h2>
              <span className="text-xs text-slate-500 font-mono">
                {translationResult.suggestedGrades.length} Candidate Grades Evaluated
              </span>
            </div>

            {/* Grade Match Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {translationResult.suggestedGrades.map((grade) => (
                <Card key={grade.gradeId} elevated className="flex flex-col justify-between">
                  <CardHeader>
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <CardTitle className="text-base">{grade.gradeName}</CardTitle>
                      <Badge variant="success" size="md">
                        {grade.suitabilityScore}% Match
                      </Badge>
                    </div>
                    <CardDescription>{grade.matchReason}</CardDescription>
                  </CardHeader>

                  <CardContent className="space-y-3 pt-0">
                    {grade.considerations && grade.considerations.length > 0 && (
                      <div className="p-3 rounded bg-slate-50 border border-slate-200 text-xs space-y-1">
                        <span className="font-semibold text-slate-700 block text-[10px] uppercase font-mono">
                          Fabrication &amp; Welding Considerations:
                        </span>
                        <ul className="space-y-0.5 text-slate-600 text-[11px]">
                          {grade.considerations.map((c, i) => (
                            <li key={i}>&bull; {c}</li>
                          ))}
                        </ul>
                      </div>
                    )}

                    <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
                      <Link href={`/listings?q=${encodeURIComponent(grade.gradeId)}`}>
                        <Button variant="primary" size="sm">
                          <span>Search {grade.gradeName} Inventory</span>
                          <ArrowRight className="w-3.5 h-3.5 ml-1.5" />
                        </Button>
                      </Link>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Acceptance Thresholds & Assumptions */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">Derived Mechanical &amp; Chemical Bounds</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 text-xs font-mono">
                  <div className="flex justify-between py-1 border-b border-slate-100">
                    <span className="text-slate-500">Minimum Yield Strength:</span>
                    <span className="font-bold text-slate-900">{translationResult.keyMechanicalCriteria.minYieldKsi} ksi</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-slate-100">
                    <span className="text-slate-500">Minimum Tensile Strength:</span>
                    <span className="font-bold text-slate-900">{translationResult.keyMechanicalCriteria.minTensileKsi} ksi</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-slate-100">
                    <span className="text-slate-500">Charpy Toughness Required:</span>
                    <span className="font-bold text-slate-900">
                      {translationResult.keyMechanicalCriteria.charpyImpactRequired ? `Yes (${translationResult.keyMechanicalCriteria.charpyTempF ?? -20}°F)` : "Standard"}
                    </span>
                  </div>
                  <div className="flex justify-between py-1">
                    <span className="text-slate-500">Maximum Carbon Equivalent (CEV):</span>
                    <span className="font-bold text-slate-900">{translationResult.keyChemicalCriteria.maxCev}</span>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">Engineering Assumptions Made</CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-1.5 text-xs text-slate-600">
                    {translationResult.assumptionsMade.map((a, i) => (
                      <li key={i} className="flex items-start gap-1.5">
                        <span className="text-slate-400">&bull;</span>
                        <span>{a}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            </div>
          </div>
        )}
      </div>
    </PageContainer>
  );
}
