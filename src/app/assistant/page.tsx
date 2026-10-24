"use client";

import React, { useState, useEffect, useRef, Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { 
  Sparkles, 
  CheckCircle2, 
  AlertTriangle, 
  RefreshCw, 
  Info, 
  SlidersHorizontal,
  ShieldAlert,
  ChevronDown,
  ChevronUp,
  ArrowUpDown,
  X
} from "lucide-react";
import { PageContainer } from "@/components/layout/PageContainer";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Input } from "@/components/ui/Input";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/Table";
import { 
  AssistantResponse, 
  BuyerSpecification, 
  RankedListingCandidate 
} from "@/types/assistant";
import { ListingWithRelations } from "@/types/database";
import { QuoteRequestForm } from "@/components/marketplace/QuoteRequestForm";
import { AssistantNarrationButton } from "@/components/common/AssistantNarrationButton";

// Suggested requirement examples representing real functional industrial applications
const EXAMPLE_PRESETS = [
  {
    title: "Outdoor Coastal Structure (40t Plate)",
    tag: "Marine / Corrosion",
    prompt: "I need around 40 tons of steel for an outdoor structure near the coast. Corrosion resistance matters, and I need plate.",
  },
  {
    title: "Machine Drive Shaft (5t Round Bar)",
    tag: "High Torque / Machinery",
    prompt: "High torque rotating machine drive shaft, 5 tons of round bar requiring high surface hardenability and fatigue resistance.",
  },
  {
    title: "Sanitary Food Tank (15t Plate)",
    tag: "Food Contact / Passivated",
    prompt: "Sanitary food processing mixing tank, 15 tons of 0.25 inch plate. Must be food contact safe.",
  },
  {
    title: "Highway Bridge Girders (50t Beam)",
    tag: "Structural Civil / 50 ksi",
    prompt: "Commercial building structural columns and floor beams, 50 tons of wide flange beam requiring 50 ksi yield and AWS D1.1 weldability.",
  },
  {
    title: "Warehouse Storage Shelving (20t Sheet)",
    tag: "Low Budget / Carbon",
    prompt: "Low budget warehouse storage shelving brackets, 20 tons of carbon steel sheet. Cost-effective economy priority.",
  },
];

function AssistantContent() {
  const searchParams = useSearchParams();
  const [prompt, setPrompt] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [assistantData, setAssistantData] = useState<AssistantResponse | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const initialTriggered = useRef(false);

  // Editable specification state for refinement
  const [isEditingSpec, setIsEditingSpec] = useState(false);
  const [editableSpec, setEditableSpec] = useState<BuyerSpecification | null>(null);

  // Expandable reasoning state (listing_id -> boolean)
  const [expandedReasoning, setExpandedReasoning] = useState<Record<string, boolean>>({});

  // Side-by-side comparison state (array of listing_ids)
  const [comparedIds, setComparedIds] = useState<string[]>([]);
  const [showComparisonModal, setShowComparisonModal] = useState(false);

  // Quotation modal state
  const [quoteCandidate, setQuoteCandidate] = useState<RankedListingCandidate | null>(null);

  // Auto-trigger search if query prompt is present in URL
  useEffect(() => {
    const queryPrompt = searchParams.get("prompt") || searchParams.get("q");
    if (queryPrompt && queryPrompt.trim() && !initialTriggered.current) {
      initialTriggered.current = true;
      setPrompt(queryPrompt);
      handleSearch(queryPrompt);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  // Initial prompt submission
  async function handleSearch(overridePrompt?: string) {
    const text = overridePrompt || prompt;
    if (!text.trim()) return;

    setIsLoading(true);
    setErrorMessage(null);

    try {
      const res = await fetch("/api/assistant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: text }),
      });

      const data: AssistantResponse = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to process sourcing inquiry.");
      }

      setAssistantData(data);
      setEditableSpec(data.parsed_specification);
      // Auto-expand reasoning for top candidate
      if (data.ranked_listings.length > 0) {
        setExpandedReasoning({ [data.ranked_listings[0].listing_id]: true });
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Error executing assistant inquiry.";
      setErrorMessage(msg);
    } finally {
      setIsLoading(false);
    }
  }

  // Refine specification and deterministic re-match
  async function handleRefineSpec() {
    if (!editableSpec) return;

    setIsLoading(true);
    setErrorMessage(null);

    try {
      const res = await fetch("/api/assistant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ specification: editableSpec }),
      });

      const data: AssistantResponse = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to re-match refined specifications.");
      }

      setAssistantData(data);
      setEditableSpec(data.parsed_specification);
      setIsEditingSpec(false);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Error refining requirements.";
      setErrorMessage(msg);
    } finally {
      setIsLoading(false);
    }
  }

  function toggleReasoning(listingId: string) {
    setExpandedReasoning((prev) => ({
      ...prev,
      [listingId]: !prev[listingId],
    }));
  }

  function toggleCompare(listingId: string) {
    setComparedIds((prev) => {
      if (prev.includes(listingId)) {
        return prev.filter((id) => id !== listingId);
      }
      if (prev.length >= 3) {
        return [prev[1], prev[2], listingId];
      }
      return [...prev, listingId];
    });
  }

  // Convert RankedListingCandidate to compatible ListingWithRelations for QuoteRequestForm
  function candidateToListing(cand: RankedListingCandidate): ListingWithRelations {
    return {
      id: cand.listing_id,
      seller_id: "seller-1",
      grade: cand.grade_name,
      form: cand.form,
      thickness_in: cand.thickness_in,
      quantity_tons: cand.quantity_tons,
      price_per_ton: cand.price_per_ton,
      certificate_id: cand.certificate_id,
      status: "active",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      seller: {
        id: "seller-1",
        name: cand.seller_name,
        city: cand.seller_city,
        state: cand.seller_state,
        country: "USA",
        latitude: 41.5934,
        longitude: -87.3464,
        mill_route: cand.mill_route,
        description: null,
        demo_status: cand.is_demo ? "synthetic_demo" : "live",
        created_at: new Date().toISOString(),
      },
      certificate: cand.has_certificate
        ? {
            id: cand.certificate_id || "cert-1",
            seller_id: "seller-1",
            file_path: "certs/document.pdf",
            original_filename: "Certified_MTR.pdf",
            document_sha256: "sha256-verified",
            heat_number: cand.heat_number || "Certified Heat",
            mill_name: cand.seller_name,
            grade: cand.grade_name,
            melt_pour_country: "USA",
            chemistry: {},
            mechanical: {},
            extraction_status: "completed",
            review_status: "approved",
            risk_score: 5.0,
            flags: [],
            extraction_metadata: {},
            created_at: new Date().toISOString(),
          }
        : null,
    };
  }

  return (
    <PageContainer
      title="AI Sourcing Assistant"
      description="Translate engineering requirements and environmental operating conditions into standardized ASTM/EN grades, verified batch passports, and landed cost rankings."
      breadcrumbs={[
        { label: "Procurement", href: "/dashboard" },
        { label: "Sourcing Assistant" },
      ]}
      badge={
        <div className="flex items-center gap-1.5">
          <Badge variant="outline" size="sm">Deterministic Knowledge Base</Badge>
          <Badge variant="secondary" size="sm">Multi-Factor Ranking</Badge>
        </div>
      }
    >
      <div className="space-y-8 max-w-6xl mx-auto">
        {/* Step 1: Chat-like Natural Language Input */}
        <Card className="border-slate-300/80 shadow-xs bg-white">
          <CardHeader className="pb-3 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-slate-800" />
              <CardTitle className="text-base font-semibold text-slate-900">
                Describe Your Engineering Application or Structural Bill of Materials
              </CardTitle>
            </div>
            <CardDescription className="text-xs text-slate-600">
              Provide application context, required load or yield strength, operating atmosphere (e.g. coastal, food sanitary, sub-zero), desired form, and tonnage.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-4 space-y-4">
            <div className="space-y-2">
              <textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="e.g. I need around 40 tons of steel for an outdoor structure near the coast. Corrosion resistance matters, and I need plate."
                rows={3}
                className="w-full text-sm font-sans p-3 rounded border border-slate-300 focus:outline-hidden focus:ring-1 focus:ring-slate-800 resize-none placeholder:text-slate-400 bg-slate-50/50"
              />
              <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
                <span className="text-[11px] text-slate-500">
                  Application specifications are evaluated strictly against curated ASTM/EN metallurgical constraints.
                </span>
                <Button
                  onClick={() => handleSearch()}
                  disabled={isLoading || !prompt.trim()}
                  className="w-full sm:w-auto h-9 px-5 bg-slate-900 text-white hover:bg-slate-800 text-xs font-medium"
                >
                  {isLoading ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 mr-2 animate-spin" />
                      Evaluating Metallurgy &amp; Inventory...
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-3.5 h-3.5 mr-2 text-slate-300" />
                      Evaluate &amp; Match Inventory
                    </>
                  )}
                </Button>
              </div>
            </div>

            {/* Suggested Requirement Examples */}
            <div className="pt-2 border-t border-slate-100 space-y-2">
              <span className="text-[11px] font-mono uppercase tracking-wider text-slate-500 block">
                Suggested Application Scenarios
              </span>
              <div className="flex flex-wrap gap-2">
                {EXAMPLE_PRESETS.map((p, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => {
                      setPrompt(p.prompt);
                      handleSearch(p.prompt);
                    }}
                    className="text-xs text-left px-2.5 py-1.5 rounded border border-slate-200 bg-slate-50 hover:bg-slate-100 hover:border-slate-300 text-slate-800 transition-colors flex items-center gap-1.5"
                  >
                    <span className="font-medium">{p.title}</span>
                    <Badge variant="outline" size="sm" className="text-[10px] py-0 px-1 border-slate-300 text-slate-600">
                      {p.tag}
                    </Badge>
                  </button>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Error Banner */}
        {errorMessage && (
          <div className="p-4 rounded border border-rose-200 bg-rose-50 text-rose-900 text-xs flex items-start gap-2.5">
            <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <span className="font-semibold block">Inquiry Processing Notice</span>
              <p>{errorMessage}</p>
            </div>
          </div>
        )}

        {/* Results Workspace */}
        {assistantData && (
          <div className="space-y-6">
            {/* Step Progression Bar */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
              <div className="p-2.5 rounded border border-emerald-300 bg-emerald-50 text-emerald-950 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <div>
                  <span className="font-semibold block">1. Requirements</span>
                  <span className="text-[10px] text-emerald-800">Application Parsed</span>
                </div>
              </div>
              <div className="p-2.5 rounded border border-emerald-300 bg-emerald-50 text-emerald-950 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <div>
                  <span className="font-semibold block">2. ASTM Gating</span>
                  <span className="text-[10px] text-emerald-800">{assistantData.eligible_grades.length} Grades Eligible</span>
                </div>
              </div>
              <div className="p-2.5 rounded border border-slate-900 bg-slate-900 text-white flex items-center gap-2 shadow-xs">
                <Sparkles className="w-4 h-4 text-slate-300 shrink-0" />
                <div>
                  <span className="font-semibold block">3. Inventory Ranking</span>
                  <span className="text-[10px] text-slate-300">{assistantData.ranked_listings.length} Lots Evaluated</span>
                </div>
              </div>
              <div className="p-2.5 rounded border border-slate-200 bg-slate-50 text-slate-600 flex items-center gap-2">
                <span className="w-4 h-4 rounded-full border border-slate-400 flex items-center justify-center text-[10px] font-mono font-bold text-slate-600">4</span>
                <div>
                  <span className="font-semibold block text-slate-800">4. Reservation RFQ</span>
                  <span className="text-[10px] text-slate-500">48-Hr Hold Available</span>
                </div>
              </div>
            </div>

            {/* Audio Briefing Narration (Optional ElevenLabs / Local Speech Synthesis) */}
            <Card className="border-slate-200 bg-linear-to-r from-slate-50 to-white shadow-2xs">
              <CardContent className="p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold text-slate-900">
                      Procurement Audio Briefing
                    </span>
                    <Badge variant="outline" size="sm" className="text-[10px] py-0 px-1.5 border-slate-300">
                      Verbatim Read-Only
                    </Badge>
                  </div>
                  <p className="text-[11px] text-slate-500">
                    Listen to a synthesized executive summary of eligible ASTM grades, top ranked lots, and metallurgical trade-offs.
                  </p>
                </div>
                <div className="shrink-0">
                  <AssistantNarrationButton data={assistantData} />
                </div>
              </CardContent>
            </Card>

            {/* Step 1 & 2: Parsed Specification & Refinement Workspace */}
            <Card className="border-slate-200 bg-white shadow-2xs">
              <CardHeader className="pb-3 border-b border-slate-100">
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <CardTitle className="text-sm font-semibold text-slate-900 flex items-center gap-2">
                      <SlidersHorizontal className="w-4 h-4 text-slate-700" />
                      Parsed Engineering Specification &amp; Assumptions
                    </CardTitle>
                    <CardDescription className="text-xs">
                      Distinguishing explicit customer requirements from AI-inferred operating conditions.
                    </CardDescription>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setIsEditingSpec(!isEditingSpec)}
                    className="text-xs h-7"
                  >
                    {isEditingSpec ? "Cancel Editing" : "Refine Requirements"}
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="p-4 space-y-4">
                {/* Visual Category Chips */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
                  {/* Explicit Buyer Requirements */}
                  <div className="p-3 rounded bg-slate-50 border border-slate-200 space-y-2">
                    <span className="font-mono text-[11px] font-semibold text-slate-800 uppercase block">
                      Explicit Requirements
                    </span>
                    {assistantData.parsed_specification.explicit_requirements.length > 0 ? (
                      <div className="flex flex-wrap gap-1.5">
                        {assistantData.parsed_specification.explicit_requirements.map((req, i) => (
                          <Badge key={i} variant="secondary" size="sm" className="text-[11px] font-normal">
                            {req}
                          </Badge>
                        ))}
                      </div>
                    ) : (
                      <span className="text-slate-400 italic">None explicitly identified</span>
                    )}
                  </div>

                  {/* Inferred Assumptions */}
                  <div className="p-3 rounded bg-amber-50/50 border border-amber-200/80 space-y-2">
                    <span className="font-mono text-[11px] font-semibold text-amber-900 uppercase block">
                      Inferred Assumptions
                    </span>
                    {assistantData.parsed_specification.inferred_assumptions.length > 0 ? (
                      <div className="space-y-1">
                        {assistantData.parsed_specification.inferred_assumptions.map((asm, i) => (
                          <div key={i} className="text-[11px] text-amber-950 flex items-start gap-1">
                            <span>&bull;</span>
                            <span>{asm}</span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <span className="text-slate-400 italic">No assumptions inferred</span>
                    )}
                  </div>

                  {/* Missing Information / Unknowns */}
                  <div className="p-3 rounded bg-slate-50/70 border border-slate-200 space-y-2">
                    <span className="font-mono text-[11px] font-semibold text-slate-600 uppercase block">
                      Missing / Unknown Data
                    </span>
                    {assistantData.parsed_specification.missing_information.length > 0 ? (
                      <div className="space-y-1">
                        {assistantData.parsed_specification.missing_information.map((mis, i) => (
                          <div key={i} className="text-[11px] text-slate-600 flex items-start gap-1">
                            <span className="text-slate-400">&bull;</span>
                            <span>{mis}</span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <span className="text-emerald-700 text-[11px] font-medium flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3 text-emerald-600" /> All key specifications provided
                      </span>
                    )}
                  </div>
                </div>

                {/* Inline Specification Editor (when user clicks Refine Requirements) */}
                {isEditingSpec && editableSpec && (
                  <div className="p-4 rounded border border-slate-300 bg-slate-50 space-y-4 pt-4 mt-2">
                    <div className="flex items-center justify-between pb-2 border-b border-slate-200">
                      <span className="font-semibold text-xs text-slate-900">
                        Edit Specification Parameters
                      </span>
                      <span className="text-[11px] text-slate-500">
                        Adjust numbers or constraints to re-run deterministic grade matching.
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 text-xs">
                      <div>
                        <label className="text-[11px] font-mono text-slate-600 uppercase block mb-1">
                          Product Form
                        </label>
                        <select
                          value={editableSpec.form || ""}
                          onChange={(e) => setEditableSpec({ ...editableSpec, form: e.target.value || null })}
                          className="w-full text-xs p-1.5 rounded border border-slate-300 bg-white"
                        >
                          <option value="">Any / Unspecified</option>
                          <option value="Plate">Plate</option>
                          <option value="Wide Flange Beam">Wide Flange Beam</option>
                          <option value="Round Bar">Round Bar</option>
                          <option value="Sheet">Sheet</option>
                        </select>
                      </div>

                      <div>
                        <label className="text-[11px] font-mono text-slate-600 uppercase block mb-1">
                          Quantity (Tons)
                        </label>
                        <Input
                          type="number"
                          value={editableSpec.quantity_tons || ""}
                          onChange={(e) => setEditableSpec({ ...editableSpec, quantity_tons: e.target.value ? parseFloat(e.target.value) : null })}
                          placeholder="e.g. 40"
                          className="h-8 text-xs"
                        />
                      </div>

                      <div>
                        <label className="text-[11px] font-mono text-slate-600 uppercase block mb-1">
                          Thickness (Inches)
                        </label>
                        <Input
                          type="number"
                          step="0.0625"
                          value={editableSpec.thickness_in || ""}
                          onChange={(e) => setEditableSpec({ ...editableSpec, thickness_in: e.target.value ? parseFloat(e.target.value) : null })}
                          placeholder="e.g. 0.75"
                          className="h-8 text-xs"
                        />
                      </div>

                      <div>
                        <label className="text-[11px] font-mono text-slate-600 uppercase block mb-1">
                          Destination City, State
                        </label>
                        <Input
                          value={editableSpec.buyer_city ? `${editableSpec.buyer_city}, ${editableSpec.state_or_country || "IL"}` : ""}
                          onChange={(e) => {
                            const parts = e.target.value.split(",");
                            setEditableSpec({
                              ...editableSpec,
                              buyer_city: parts[0]?.trim() || null,
                              state_or_country: parts[1]?.trim() || null,
                            });
                          }}
                          placeholder="e.g. Chicago, IL"
                          className="h-8 text-xs"
                        />
                      </div>
                    </div>

                    <div className="flex justify-end gap-2 pt-2">
                      <Button size="sm" variant="outline" onClick={() => setIsEditingSpec(false)} className="text-xs h-8">
                        Cancel
                      </Button>
                      <Button size="sm" onClick={handleRefineSpec} disabled={isLoading} className="text-xs h-8 bg-slate-900 text-white hover:bg-slate-800">
                        {isLoading ? "Re-evaluating..." : "Apply & Re-Match Inventory"}
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Step 2: Deterministic Grade Suitability Summary */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Eligible Candidates */}
              <Card className="border-slate-200 bg-white shadow-2xs">
                <CardHeader className="pb-2 border-b border-slate-100">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-xs font-semibold text-slate-900 flex items-center gap-1.5">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                      Eligible Steel Grades ({assistantData.eligible_grades.length})
                    </CardTitle>
                    <span className="text-[11px] font-mono text-slate-500">ASTM Standards</span>
                  </div>
                </CardHeader>
                <CardContent className="p-3 divide-y divide-slate-100 text-xs">
                  {assistantData.eligible_grades.length > 0 ? (
                    assistantData.eligible_grades.map((eg) => (
                      <div key={eg.grade_id} className="py-2.5 first:pt-1 last:pb-1 space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="font-semibold text-slate-900">{eg.canonical_name}</span>
                          <Badge variant="secondary" size="sm">
                            {(eg.suitability_score * 100).toFixed(0)}% Fit Score
                          </Badge>
                        </div>
                        <p className="text-[11px] text-slate-600 leading-relaxed">
                          {eg.fit_reasons[0] || eg.material_family}
                        </p>
                        {eg.limitations.length > 0 && (
                          <div className="text-[10px] text-amber-800 font-mono">
                            Caution: {eg.limitations[0]}
                          </div>
                        )}
                      </div>
                    ))
                  ) : (
                    <div className="py-4 text-center text-slate-500 text-xs">
                      No curated grades safely satisfy all combined criteria without violating standard limits.
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Incompatible / Excluded Candidates */}
              <Card className="border-slate-200 bg-white shadow-2xs">
                <CardHeader className="pb-2 border-b border-slate-100">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-xs font-semibold text-slate-900 flex items-center gap-1.5">
                      <ShieldAlert className="w-4 h-4 text-slate-500" />
                      Excluded / Incompatible Grades ({assistantData.ineligible_grades.length})
                    </CardTitle>
                    <span className="text-[11px] font-mono text-slate-500">Hard Suitability Gating</span>
                  </div>
                </CardHeader>
                <CardContent className="p-3 divide-y divide-slate-100 text-xs">
                  {assistantData.ineligible_grades.map((ig) => (
                    <div key={ig.grade_id} className="py-2 first:pt-1 last:pb-1 space-y-0.5">
                      <div className="flex items-center justify-between">
                        <span className="font-medium text-slate-800">{ig.canonical_name}</span>
                        <Badge variant="outline" size="sm" className="text-[10px] text-slate-500 border-slate-200">
                          Excluded
                        </Badge>
                      </div>
                      <p className="text-[11px] text-slate-500 leading-snug">
                        {ig.incompatibilities[0] || "Incompatible with environmental or mechanical requirements."}
                      </p>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </div>

            {/* Clarification Questions (if any) */}
            {assistantData.clarification_questions.length > 0 && (
              <div className="p-4 rounded border border-amber-200 bg-amber-50/60 text-xs text-amber-950 space-y-2">
                <div className="flex items-center gap-2 font-semibold">
                  <Info className="w-4 h-4 text-amber-700 shrink-0" />
                  <span>Engineering Clarification Inquiries</span>
                </div>
                <ul className="space-y-1 list-disc list-inside text-slate-700 pl-1 leading-relaxed">
                  {assistantData.clarification_questions.map((q, idx) => (
                    <li key={idx}>{q}</li>
                  ))}
                </ul>
              </div>
            )}

            {/* Step 3 & 4: Ranked Mill Inventory Candidates */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-semibold text-slate-900">
                    Ranked Available Inventory ({assistantData.ranked_listings.length})
                  </h3>
                  <p className="text-xs text-slate-500">
                    Ranked by 40% Material Fit &bull; 30% MTR Data Completeness &bull; 30% Delivered Landed Cost
                  </p>
                </div>

                {comparedIds.length >= 2 && (
                  <Button
                    size="sm"
                    onClick={() => setShowComparisonModal(true)}
                    className="h-8 text-xs bg-slate-900 text-white hover:bg-slate-800 flex items-center gap-1.5"
                  >
                    <ArrowUpDown className="w-3.5 h-3.5" />
                    Compare {comparedIds.length} Batches Side-by-Side
                  </Button>
                )}
              </div>

              {assistantData.ranked_listings.length > 0 ? (
                <div className="space-y-4">
                  {assistantData.ranked_listings.map((candidate, rankIdx) => {
                    const isExpanded = Boolean(expandedReasoning[candidate.listing_id]);
                    const isCompared = comparedIds.includes(candidate.listing_id);

                    return (
                      <Card
                        key={candidate.listing_id}
                        className={`border transition-all ${
                          rankIdx === 0
                            ? "border-slate-400 bg-white shadow-xs"
                            : "border-slate-200 bg-white shadow-2xs hover:border-slate-300"
                        }`}
                      >
                        <CardContent className="p-4 sm:p-5 space-y-4">
                          {/* Card Header Line */}
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-100">
                            <div className="flex items-center gap-3">
                              {/* Total Score Badge */}
                              <div className="flex flex-col items-center justify-center w-12 h-12 rounded bg-slate-900 text-white font-mono font-bold shrink-0">
                                <span className="text-base leading-none">{candidate.total_score}</span>
                                <span className="text-[9px] font-sans text-slate-300 font-normal">Score</span>
                              </div>

                              <div>
                                <div className="flex items-center gap-2">
                                  <h4 className="text-sm font-bold text-slate-900">{candidate.grade_name}</h4>
                                  {rankIdx === 0 && (
                                    <Badge variant="default" size="sm" className="bg-slate-800 text-white text-[10px]">
                                      Top Recommendation
                                    </Badge>
                                  )}
                                  {candidate.is_demo && (
                                    <Badge variant="demo" size="sm">Demo Listing</Badge>
                                  )}
                                  <Badge variant={candidate.has_certificate ? "secondary" : "outline"} size="sm">
                                    {candidate.has_certificate ? "QC checks passed" : "Review required"}
                                  </Badge>
                                </div>
                                <span className="text-xs text-slate-600 block">
                                  {candidate.thickness_in.toFixed(3)}&quot; {candidate.form} &bull; {candidate.quantity_tons.toFixed(1)} tons available &bull; {candidate.material_family}
                                </span>
                              </div>
                            </div>

                            {/* Pricing & Delivered Cost Column */}
                            <div className="text-right sm:self-center">
                              {candidate.delivered_cost_per_ton ? (
                                <div>
                                  <span className="text-sm font-mono font-bold text-slate-900 block">
                                    ${candidate.delivered_cost_per_ton.toFixed(0)}
                                    <span className="text-xs font-normal text-slate-500 font-sans"> /ton landed</span>
                                  </span>
                                  <span className="text-[11px] text-slate-500 block">
                                    FOB ${candidate.price_per_ton.toFixed(0)}/ton &bull; to {candidate.destination_city}, {candidate.destination_state}
                                  </span>
                                </div>
                              ) : (
                                <div>
                                  <span className="text-sm font-mono font-bold text-slate-900 block">
                                    ${candidate.price_per_ton.toFixed(0)}
                                    <span className="text-xs font-normal text-slate-500 font-sans"> /ton FOB</span>
                                  </span>
                                  <span className="text-[11px] text-slate-500">Destination freight pending</span>
                                </div>
                              )}
                            </div>
                          </div>

                          {/* Seller & Score Breakdown Grid */}
                          <div className="grid grid-cols-1 md:grid-cols-4 gap-3 text-xs bg-slate-50 p-3 rounded border border-slate-200/80">
                            <div>
                              <span className="text-[10px] font-mono uppercase text-slate-500 block">Producing Seller</span>
                              <span className="font-medium text-slate-900">{candidate.seller_name}</span>
                              <span className="text-[11px] text-slate-500 block">
                                {candidate.seller_city}, {candidate.seller_state} {candidate.mill_route ? `(${candidate.mill_route})` : ""}
                              </span>
                            </div>

                            <div>
                              <span className="text-[10px] font-mono uppercase text-slate-500 block">Material Fit (40%)</span>
                              <span className="font-mono font-semibold text-slate-900">
                                {(candidate.score_material_fit * 100).toFixed(0)}%
                              </span>
                              <span className="text-[11px] text-slate-500 block">Yield &amp; standard alignment</span>
                            </div>

                            <div>
                              <span className="text-[10px] font-mono uppercase text-slate-500 block">Data Quality (30%)</span>
                              <span className="font-mono font-semibold text-slate-900">
                                {(candidate.score_data_quality * 100).toFixed(0)}%
                              </span>
                              <span className="text-[11px] text-slate-500 block">
                                {candidate.has_certificate ? "Complete ladle MTR verified" : "Missing MTR doc"}
                              </span>
                            </div>

                            <div>
                              <span className="text-[10px] font-mono uppercase text-slate-500 block">Cost Efficiency (30%)</span>
                              <span className="font-mono font-semibold text-slate-900">
                                {(candidate.score_delivered_cost * 100).toFixed(0)}%
                              </span>
                              <span className="text-[11px] text-slate-500 block">
                                {candidate.freight_breakdown ? `${candidate.freight_breakdown.distance_miles} highway miles` : "Benchmarked"}
                              </span>
                            </div>
                          </div>

                          {/* Expandable Reasoning Accordion */}
                          <div>
                            <button
                              type="button"
                              onClick={() => toggleReasoning(candidate.listing_id)}
                              className="w-full flex items-center justify-between text-xs text-slate-700 py-1 font-medium hover:text-slate-900"
                            >
                              <span className="flex items-center gap-1.5">
                                <Info className="w-3.5 h-3.5 text-slate-500" />
                                {isExpanded ? "Collapse Technical Reasoning & Assumptions" : "Expand Metallurgical Rationale & Trade-Offs"}
                              </span>
                              {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                            </button>

                            {isExpanded && candidate.explanation && (
                              <div className="mt-3 p-3.5 rounded border border-slate-200 bg-white space-y-3 text-xs">
                                <div>
                                  <span className="font-semibold text-slate-900 block mb-0.5">Why This Batch Matched</span>
                                  <p className="text-slate-700 leading-relaxed">{candidate.explanation.why_matched}</p>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2 border-t border-slate-100">
                                  <div className="p-2.5 rounded bg-amber-50/50 border border-amber-200/70">
                                    <div className="flex items-center gap-1.5 mb-1.5">
                                      <AlertTriangle className="w-3.5 h-3.5 text-amber-700 shrink-0" />
                                      <span className="font-semibold text-amber-950 text-xs">Key Trade-Offs &amp; Considerations</span>
                                    </div>
                                    <ul className="space-y-1 list-disc list-inside text-amber-900 text-xs leading-relaxed">
                                      {candidate.explanation.key_trade_offs.map((t, i) => (
                                        <li key={i}>{t}</li>
                                      ))}
                                    </ul>
                                  </div>

                                  <div>
                                    <span className="font-semibold text-slate-900 block mb-1">Delivered Cost &amp; Logistics Breakdown</span>
                                    <div className="space-y-1 text-slate-700 bg-slate-50 p-2 rounded border border-slate-200/60 mb-2">
                                      <div className="flex justify-between">
                                        <span>Material Subtotal:</span>
                                        <span className="font-mono font-medium">${(candidate.price_per_ton * candidate.quantity_tons).toLocaleString()}</span>
                                      </div>
                                      <div className="flex justify-between">
                                        <span>Estimated Freight:</span>
                                        <span className="font-mono font-medium">
                                          {candidate.freight_breakdown?.freight_total ? `$${candidate.freight_breakdown.freight_total.toLocaleString()} ($${(candidate.freight_breakdown.freight_total / candidate.quantity_tons).toFixed(0)}/ton)` : "Pending"}
                                        </span>
                                      </div>
                                      <div className="flex justify-between font-semibold text-slate-900 pt-1 border-t border-slate-200/60">
                                        <span>Delivered Landed Total:</span>
                                        <span className="font-mono text-sky-950">
                                          {candidate.delivered_cost_per_ton ? `$${(candidate.delivered_cost_per_ton * candidate.quantity_tons).toLocaleString()} ($${candidate.delivered_cost_per_ton.toFixed(0)}/ton)` : "Pending"}
                                        </span>
                                      </div>
                                      <div className="flex justify-between text-[11px] text-slate-500 pt-0.5">
                                        <span>Approximate Lead Time:</span>
                                        <span className="font-mono">
                                          {candidate.freight_breakdown?.distance_miles ? (candidate.freight_breakdown.distance_miles < 150 ? "1–2 business days" : "2–4 business days") : "Location pending"}
                                        </span>
                                      </div>
                                    </div>
                                    <span className="font-semibold text-slate-900 block mb-1">Estimate Assumptions Disclosure</span>
                                    <ul className="space-y-1 list-disc list-inside text-slate-600">
                                      {candidate.explanation.price_and_freight_assumptions.map((p, i) => (
                                        <li key={i}>{p}</li>
                                      ))}
                                      <li className="text-[11px] text-slate-500 italic">
                                        Includes 1.15x commercial road circuity factor and 45,000 lb trailer limits. Heuristic transit estimate; not a guaranteed delivery date.
                                      </li>
                                    </ul>
                                  </div>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2 border-t border-slate-100 text-[11px]">
                                  <div>
                                    <span className="font-semibold text-slate-800 block mb-0.5">Standard Limitations</span>
                                    <p className="text-slate-600">{candidate.explanation.relevant_limitations.join("; ")}</p>
                                  </div>

                                  <div>
                                    <span className="font-semibold text-slate-800 block mb-0.5">Unknowns Requiring Sign-off</span>
                                    <p className="text-slate-600">{candidate.explanation.unknowns_requiring_confirmation.join("; ")}</p>
                                  </div>
                                </div>
                              </div>
                            )}
                          </div>

                          {/* Card Action Buttons */}
                          <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-100">
                            <div className="flex items-center gap-2">
                              <label className="flex items-center gap-1.5 text-xs text-slate-600 cursor-pointer select-none">
                                <input
                                  type="checkbox"
                                  checked={isCompared}
                                  onChange={() => toggleCompare(candidate.listing_id)}
                                  className="rounded border-slate-300 text-slate-900 focus:ring-0"
                                />
                                <span>Compare ({comparedIds.length}/3)</span>
                              </label>
                            </div>

                            <div className="flex items-center gap-2">
                              <Link href={`/listings/${candidate.listing_id}`}>
                                <Button size="sm" variant="outline" className="text-xs h-8">
                                  View Batch Passport
                                </Button>
                              </Link>
                              <Button
                                size="sm"
                                onClick={() => setQuoteCandidate(candidate)}
                                className="text-xs h-8 bg-slate-900 text-white hover:bg-slate-800"
                              >
                                Request Official Quote
                              </Button>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              ) : (
                <div className="p-8 text-center border border-dashed border-slate-300 rounded bg-slate-50 space-y-2">
                  <span className="text-sm font-semibold text-slate-800 block">No Active Inventory Matching Refined Criteria</span>
                  <p className="text-xs text-slate-600 max-w-md mx-auto">
                    Try broadening your thickness or form constraints, or submit an RFQ to producing mills for forward production lots.
                  </p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Side-by-Side Comparison Modal */}
        {showComparisonModal && (
          <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-white rounded border border-slate-300 max-w-4xl w-full max-h-[90vh] overflow-y-auto shadow-lg space-y-4 p-5">
              <div className="flex items-center justify-between pb-3 border-b border-slate-200">
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Side-by-Side Candidate Evaluation</h3>
                  <p className="text-xs text-slate-500">Comparing {comparedIds.length} candidate batches against your engineering specification.</p>
                </div>
                <button
                  type="button"
                  onClick={() => setShowComparisonModal(false)}
                  className="text-slate-400 hover:text-slate-700"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-slate-50">
                      <TableHead className="w-40">Attribute</TableHead>
                      {comparedIds.map((id) => {
                        const cand = assistantData?.ranked_listings.find((c) => c.listing_id === id);
                        return (
                          <TableHead key={id} className="min-w-56 font-bold text-slate-900">
                            {cand?.grade_name} ({cand?.total_score}/100)
                          </TableHead>
                        );
                      })}
                    </TableRow>
                  </TableHeader>
                  <TableBody className="text-xs">
                    <TableRow>
                      <TableCell className="font-semibold text-slate-700">Material Family</TableCell>
                      {comparedIds.map((id) => (
                        <TableCell key={id}>{assistantData?.ranked_listings.find((c) => c.listing_id === id)?.material_family}</TableCell>
                      ))}
                    </TableRow>
                    <TableRow>
                      <TableCell className="font-semibold text-slate-700">Dimensions &amp; Form</TableCell>
                      {comparedIds.map((id) => {
                        const cand = assistantData?.ranked_listings.find((c) => c.listing_id === id);
                        return <TableCell key={id}>{cand?.thickness_in.toFixed(3)}&quot; {cand?.form}</TableCell>;
                      })}
                    </TableRow>
                    <TableRow>
                      <TableCell className="font-semibold text-slate-700">Available Tonnage</TableCell>
                      {comparedIds.map((id) => (
                        <TableCell key={id}>{assistantData?.ranked_listings.find((c) => c.listing_id === id)?.quantity_tons.toFixed(1)} tons</TableCell>
                      ))}
                    </TableRow>
                    <TableRow>
                      <TableCell className="font-semibold text-slate-700">Base FOB Price</TableCell>
                      {comparedIds.map((id) => (
                        <TableCell key={id} className="font-mono">${assistantData?.ranked_listings.find((c) => c.listing_id === id)?.price_per_ton.toFixed(0)}/ton</TableCell>
                      ))}
                    </TableRow>
                    <TableRow>
                      <TableCell className="font-semibold text-slate-700">Delivered Landed Cost</TableCell>
                      {comparedIds.map((id) => (
                        <TableCell key={id} className="font-mono font-bold text-slate-900">
                          ${assistantData?.ranked_listings.find((c) => c.listing_id === id)?.delivered_cost_per_ton?.toFixed(0) || "N/A"}/ton
                        </TableCell>
                      ))}
                    </TableRow>
                    <TableRow>
                      <TableCell className="font-semibold text-slate-700">MTR Quality Score</TableCell>
                      {comparedIds.map((id) => (
                        <TableCell key={id}>
                          {((assistantData?.ranked_listings.find((c) => c.listing_id === id)?.score_data_quality || 0) * 100).toFixed(0)}%
                        </TableCell>
                      ))}
                    </TableRow>
                    <TableRow>
                      <TableCell className="font-semibold text-slate-700">Origin / Route</TableCell>
                      {comparedIds.map((id) => {
                        const cand = assistantData?.ranked_listings.find((c) => c.listing_id === id);
                        return <TableCell key={id}>{cand?.seller_city}, {cand?.seller_state} ({cand?.mill_route || "Route N/A"})</TableCell>;
                      })}
                    </TableRow>
                    <TableRow>
                      <TableCell className="font-semibold text-slate-700">Actions</TableCell>
                      {comparedIds.map((id) => {
                        const cand = assistantData?.ranked_listings.find((c) => c.listing_id === id);
                        if (!cand) return <TableCell key={id} />;
                        return (
                          <TableCell key={id}>
                            <div className="flex gap-2">
                              <Link href={`/listings/${cand.listing_id}`}>
                                <Button size="sm" variant="outline" className="text-xs h-7">Passport</Button>
                              </Link>
                              <Button
                                size="sm"
                                onClick={() => {
                                  setShowComparisonModal(false);
                                  setQuoteCandidate(cand);
                                }}
                                className="text-xs h-7 bg-slate-900 text-white hover:bg-slate-800"
                              >
                                Quote
                              </Button>
                            </div>
                          </TableCell>
                        );
                      })}
                    </TableRow>
                  </TableBody>
                </Table>
              </div>
            </div>
          </div>
        )}

        {/* Embedded Quotation Modal */}
        {quoteCandidate && (
          <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-white rounded border border-slate-300 max-w-xl w-full max-h-[90vh] overflow-y-auto shadow-lg p-5">
              <QuoteRequestForm
                listing={candidateToListing(quoteCandidate)}
                onClose={() => setQuoteCandidate(null)}
                onSuccess={() => {
                  setTimeout(() => setQuoteCandidate(null), 3000);
                }}
              />
            </div>
          </div>
        )}
      </div>
    </PageContainer>
  );
}

export default function AssistantPage() {
  return (
    <Suspense
      fallback={
        <PageContainer
          title="AI Sourcing Assistant"
          description="Translating engineering intent into verifiable ASTM inventory..."
          breadcrumbs={[
            { label: "Marketplace", href: "/listings" },
            { label: "Sourcing Assistant" },
          ]}
        >
          <div className="py-20 text-center font-mono text-xs text-slate-500">
            Initializing metallurgical knowledge base and assistant models...
          </div>
        </PageContainer>
      }
    >
      <AssistantContent />
    </Suspense>
  );
}
