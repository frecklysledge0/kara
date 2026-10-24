"use client";

import React, { useState } from "react";
import Link from "next/link";
import { 
  ArrowRight, 
  Search, 
  Globe, 
  ShieldCheck, 
  AlertTriangle, 
  Sparkles,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Input } from "@/components/ui/Input";
import { translateGrade, getPopularGradeTranslations, GradeTranslationResult } from "@/lib/engine/grade-translator";

interface GradeTranslatorPanelProps {
  initialQuery?: string;
  className?: string;
}

export function GradeTranslatorPanel({ initialQuery = "", className = "" }: GradeTranslatorPanelProps) {
  const [query, setQuery] = useState(initialQuery);
  const popularExamples = getPopularGradeTranslations();

  const results: GradeTranslationResult[] = query.trim() ? translateGrade(query) : [];

  return (
    <Card className={`border-slate-200 bg-white shadow-2xs ${className}`}>
      <CardHeader className="pb-3 border-b border-slate-100">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded bg-slate-900 text-white flex items-center justify-center">
              <Globe className="w-4 h-4" />
            </div>
            <div>
              <CardTitle className="text-base text-slate-900">
                Cross-Standard Grade Translator
              </CardTitle>
              <CardDescription>
                Translate foreign drawing designations (EN, JIS, DIN, CSA, ISO) into canonical ASTM/AISI specifications.
              </CardDescription>
            </div>
          </div>
          <Badge variant="outline" size="sm" className="font-mono text-slate-600">
            Sourced Equivalence
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="p-4 space-y-4">
        {/* Search Bar */}
        <div className="space-y-2">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <Input
              placeholder="Enter foreign designation: e.g. S355JR, 1.4404, SS400, 42CrMo4, St52, UNS S31803..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="pl-9 text-xs"
            />
          </div>

          {/* Quick Filter Chips */}
          <div className="flex flex-wrap items-center gap-1.5 pt-1">
            <span className="text-[10px] uppercase font-mono text-slate-400 mr-1 flex items-center gap-1">
              <Sparkles className="w-3 h-3 text-slate-400" /> Examples:
            </span>
            {popularExamples.map((ex, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => setQuery(ex.from)}
                className="px-2 py-0.5 rounded text-[11px] font-mono bg-slate-100 text-slate-700 hover:bg-slate-200 hover:text-slate-900 transition-colors"
              >
                {ex.from} &rarr; {ex.to}
              </button>
            ))}
          </div>
        </div>

        {/* Translation Results */}
        {query.trim() === "" ? (
          <div className="py-6 text-center text-xs text-slate-500 border border-dashed border-slate-200 rounded-lg">
            <Globe className="w-6 h-6 text-slate-300 mx-auto mb-1.5" />
            <p className="font-medium text-slate-700">Enter an international or foreign steel grade designation above.</p>
            <p className="text-[11px] text-slate-400 mt-0.5">
              MillProof queries peer-reviewed metallurgical standards across EN 10025, JIS G3101/G3106, CSA G40.21, and DIN 17100.
            </p>
          </div>
        ) : results.length === 0 ? (
          <div className="py-6 text-center text-xs text-slate-500 border border-slate-200 rounded-lg bg-slate-50/50">
            <AlertTriangle className="w-5 h-5 text-amber-600 mx-auto mb-1" />
            <p className="font-semibold text-slate-800">No direct curated equivalent found for &ldquo;{query}&rdquo;</p>
            <p className="text-[11px] text-slate-500 max-w-md mx-auto mt-1">
              Check spelling or try a broad chemical family search in the knowledge base catalog or AI Sourcing Assistant.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {results.map((match, idx) => (
              <div
                key={idx}
                className="p-4 rounded-lg border border-slate-200 bg-slate-50/50 space-y-3"
              >
                {/* Result Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200 pb-2.5">
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-slate-900 text-sm">
                        {match.sourceDesignation}
                      </span>
                      <ArrowRight className="w-3.5 h-3.5 text-slate-400" />
                      <span className="font-mono font-bold text-sky-950 text-sm">
                        {match.canonicalName}
                      </span>
                    </div>
                    <div className="text-[11px] text-slate-500">
                      Standard: <span className="font-medium text-slate-700">{match.applicableStandard}</span> &bull; {match.sourceStandardOrg}
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <Badge
                      variant={
                        match.confidence === "Direct Equivalent"
                          ? "success"
                          : match.confidence === "Close Substitute"
                          ? "secondary"
                          : "warning"
                      }
                      size="sm"
                    >
                      {match.confidence}
                    </Badge>
                    <Link href={`/listings?grade=${encodeURIComponent(match.canonicalName)}`}>
                      <Button variant="primary" size="sm" className="h-7 text-xs">
                        <Search className="w-3 h-3 mr-1" />
                        Find Lots in Catalog
                      </Button>
                    </Link>
                  </div>
                </div>

                {/* Sourced Equivalence Rationale */}
                <p className="text-xs text-slate-700 leading-relaxed">
                  {match.sourceNotes}
                </p>

                {/* 3-Column Metallurgical Comparison Grid */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5 text-[11px]">
                  <div className="p-2.5 rounded bg-white border border-slate-200/80 space-y-1">
                    <span className="font-semibold text-slate-900 uppercase font-mono text-[10px] block">
                      Chemistry Comparison
                    </span>
                    <p className="text-slate-600 leading-relaxed">
                      {match.differencesSummary.chemistry}
                    </p>
                  </div>

                  <div className="p-2.5 rounded bg-white border border-slate-200/80 space-y-1">
                    <span className="font-semibold text-slate-900 uppercase font-mono text-[10px] block">
                      Mechanical Yield / Tensile
                    </span>
                    <p className="text-slate-600 leading-relaxed">
                      {match.differencesSummary.mechanical}
                    </p>
                  </div>

                  <div className="p-2.5 rounded bg-white border border-slate-200/80 space-y-1">
                    <span className="font-semibold text-slate-900 uppercase font-mono text-[10px] block">
                      Weldability &amp; WPS Notes
                    </span>
                    <p className="text-slate-600 leading-relaxed">
                      {match.differencesSummary.weldability}
                    </p>
                  </div>
                </div>

                {/* Engineering Advisory & Citation */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-2 border-t border-slate-200 text-[10px] text-slate-500">
                  <div className="flex items-center gap-1.5">
                    {match.eorApprovalRecommended ? (
                      <span className="text-amber-800 font-medium flex items-center gap-1">
                        <AlertTriangle className="w-3 h-3 text-amber-600" />
                        EOR (Engineer of Record) approval recommended for structural substitution.
                      </span>
                    ) : (
                      <span className="text-emerald-800 font-medium flex items-center gap-1">
                        <ShieldCheck className="w-3 h-3 text-emerald-600" />
                        Standard prequalified cross-standard equivalent.
                      </span>
                    )}
                  </div>
                  <div className="font-mono text-slate-400">
                    Source: {match.citation}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
