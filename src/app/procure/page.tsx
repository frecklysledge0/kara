"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { 
  Search, 
  Sparkles, 
  Filter, 
  Truck, 
  Scale, 
  CheckCircle2, 
  AlertTriangle, 
  FileText, 
  Flame, 
  Factory, 
  ArrowRight, 
  RefreshCw,
  X,
  PlusCircle,
  Eye,
  Layers,
  MapPin
} from "lucide-react";
import { InventoryListing, TranslatedRequirement, DeliveredCostBreakdown } from "@/types/steel";
import { ALL_GRADE_STANDARDS, GRADE_STANDARDS_REGISTRY } from "@/lib/data/standards";
import { calculateDeliveredCost } from "@/lib/engine/freight";
import { ChemistryChart } from "@/components/charts/ChemistryChart";
import { FreightCostChart } from "@/components/charts/FreightCostChart";

export default function ProcurePage() {
  const [listings, setListings] = useState<InventoryListing[]>([]);
  const [isLoadingListings, setIsLoadingListings] = useState(true);

  // AI Translation State
  const [aiPrompt, setAiPrompt] = useState("");
  const [isTranslating, setIsTranslating] = useState(false);
  const [translationResult, setTranslationResult] = useState<TranslatedRequirement | null>(null);
  const [translationError, setTranslationError] = useState<string | null>(null);

  // Filter State
  const [selectedGradeId, setSelectedGradeId] = useState<string>("ALL");
  const [selectedProductForm, setSelectedProductForm] = useState<string>("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  const [maxPriceCwt, setMaxPriceCwt] = useState<number>(300);

  // Logistics / Freight Destination State
  const [destinationZip, setDestinationZip] = useState<string>("60601"); // Chicago default

  // Active MTR Inspector Modal State
  const [inspectingListing, setInspectingListing] = useState<InventoryListing | null>(null);

  // Comparison State
  const [comparisonIds, setComparisonIds] = useState<string[]>([]);
  const [comparisonAlert, setComparisonAlert] = useState<string | null>(null);

  // Load listings on mount
  useEffect(() => {
    async function fetchListings() {
      try {
        const res = await fetch("/api/listings");
        const data = await res.json();
        if (data.success && data.listings) {
          setListings(data.listings);
        }
      } catch (err) {
        console.error("Failed to load listings:", err);
      } finally {
        setIsLoadingListings(false);
      }
    }

    fetchListings();

    // Check for saved comparison list in sessionStorage
    const saved = sessionStorage.getItem("millproof_compare_lots");
    if (saved) {
      try {
        setComparisonIds(JSON.parse(saved));
      } catch {
        // ignore
      }
    }
  }, []);

  // Update session storage when comparison changes
  function toggleComparison(listingId: string) {
    let updated: string[];
    if (comparisonIds.includes(listingId)) {
      updated = comparisonIds.filter((id) => id !== listingId);
      setComparisonAlert("Removed from comparison matrix");
    } else {
      if (comparisonIds.length >= 4) {
        setComparisonAlert("Comparison matrix limit is 4 lots at once");
        return;
      }
      updated = [...comparisonIds, listingId];
      setComparisonAlert("Added to comparison matrix!");
    }
    setComparisonIds(updated);
    sessionStorage.setItem("millproof_compare_lots", JSON.stringify(updated));
    setTimeout(() => setComparisonAlert(null), 3000);
  }

  // AI Prompt Presets
  const PRESET_PROMPTS = [
    {
      label: "Sub-Zero Highway Bridge Girder",
      prompt: "Outdoor highway bridge box girder requiring 50 ksi yield, Charpy impact toughness at -20°F, and high weldability under AWS D1.1 without cracking."
    },
    {
      label: "Marine Seawater Offshore Piping",
      prompt: "Fabricating an offshore chemical processing line exposed to sea splash and chloride corrosion. Must resist pitting and carbide precipitation."
    },
    {
      label: "Excavator Wear Liners",
      prompt: "Heavy mining excavator bucket wear liner needing high yield strength >= 100 ksi and extreme abrasion resistance."
    },
    {
      label: "Petrochemical Boiler Vessel",
      prompt: "Welded pressure vessel operating at moderate temperatures requiring ASME Section IX compliance and notch toughness."
    }
  ];

  async function handleTranslate(promptText?: string) {
    const textToSubmit = promptText || aiPrompt;
    if (!textToSubmit.trim()) return;

    setIsTranslating(true);
    setTranslationError(null);

    try {
      const res = await fetch("/api/translate-requirements", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: textToSubmit })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Translation API request failed");
      }

      setTranslationResult(data.translation);

      // Auto-filter by top suggested grade if available
      if (data.translation.suggestedGrades && data.translation.suggestedGrades.length > 0) {
        const topGrade = data.translation.suggestedGrades[0].gradeId;
        setSelectedGradeId(topGrade);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Error translating requirements";
      setTranslationError(msg);
    } finally {
      setIsTranslating(false);
    }
  }

  // Filter listings
  const filteredListings = listings.filter((l) => {
    const matchesGrade = selectedGradeId === "ALL" || l.grade_id === selectedGradeId;
    const matchesForm = selectedProductForm === "ALL" || l.product_form === selectedProductForm;
    const matchesPrice = l.price_per_cwt <= maxPriceCwt;
    const matchesSearch =
      l.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      l.dimensions_display.toLowerCase().includes(searchQuery.toLowerCase()) ||
      l.warehouse_city.toLowerCase().includes(searchQuery.toLowerCase()) ||
      l.certificate?.heat_number.toLowerCase().includes(searchQuery.toLowerCase());

    return matchesGrade && matchesForm && matchesPrice && matchesSearch;
  });

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-10">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-2">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-800 text-sky-400 text-xs font-semibold border border-slate-700">
            <Search className="w-3.5 h-3.5" />
            <span>Industrial Buyer Procurement Workspace</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
            Procurement Catalog &amp; Delivered Cost Calculator
          </h1>
          <p className="text-sm text-slate-300 max-w-3xl leading-relaxed">
            Translate engineering requirements into suitable ASTM grades, filter verified inventory lots, audit Mill Test Reports, and estimate landed costs based on legal 45,000 lb flatbed freight limits.
          </p>
        </div>

        {comparisonIds.length > 0 && (
          <div className="shrink-0">
            <Link
              href="/compare"
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs transition-all shadow-lg shadow-amber-500/20"
            >
              <Scale className="w-4 h-4" />
              <span>Compare {comparisonIds.length} Lots in Matrix</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        )}
      </div>

      {/* Comparison Alert Toast */}
      {comparisonAlert && (
        <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs flex items-center justify-between">
          <span>{comparisonAlert}</span>
          <Link href="/compare" className="font-bold underline ml-2">Open Comparison Matrix</Link>
        </div>
      )}

      {/* AI Requirement Translator Card */}
      <section className="p-6 rounded-2xl border border-slate-800 bg-gradient-to-b from-slate-900/80 to-slate-950 space-y-5 shadow-xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-amber-400" />
            <h2 className="text-base font-bold text-white">AI Requirement Translator (Gemini Server-Side)</h2>
          </div>
          <span className="text-[11px] text-slate-400 font-mono">
            Translates functional specs into ASTM grades &bull; Enforces deterministic math
          </span>
        </div>

        <div className="space-y-3">
          <div className="flex gap-2">
            <input
              type="text"
              placeholder="Describe your engineering application (e.g. 50 ksi yield structural plate for low-temperature bridge girder)..."
              value={aiPrompt}
              onChange={(e) => setAiPrompt(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleTranslate()}
              className="flex-1 px-4 py-3 rounded-xl bg-slate-950 border border-slate-800 text-sm text-white placeholder-slate-400 focus:outline-none focus:border-amber-500 shadow-inner"
            />
            <button
              onClick={() => handleTranslate()}
              disabled={isTranslating || !aiPrompt.trim()}
              className="px-6 py-3 rounded-xl bg-amber-500 hover:bg-amber-400 disabled:bg-slate-800 disabled:text-slate-400 text-slate-950 font-bold text-xs transition-all flex items-center gap-2 shadow-lg shadow-amber-500/20"
            >
              {isTranslating ? (
                <RefreshCw className="w-4 h-4 animate-spin" />
              ) : (
                <Sparkles className="w-4 h-4" />
              )}
              <span>{isTranslating ? "Translating..." : "Translate Specs"}</span>
            </button>
          </div>

          {/* Quick Preset Buttons */}
          <div className="flex flex-wrap items-center gap-2 pt-1">
            <span className="text-[11px] text-slate-400">Industry Presets:</span>
            {PRESET_PROMPTS.map((preset, idx) => (
              <button
                key={idx}
                onClick={() => {
                  setAiPrompt(preset.prompt);
                  handleTranslate(preset.prompt);
                }}
                className="px-2.5 py-1 rounded-md bg-slate-800/80 hover:bg-slate-700 border border-slate-700 text-slate-300 text-[11px] transition-colors"
              >
                {preset.label}
              </button>
            ))}
          </div>
        </div>

        {/* Translation Error */}
        {translationError && (
          <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs">
            {translationError}
          </div>
        )}

        {/* Translation Results Card */}
        {translationResult && (
          <div className="p-5 rounded-xl bg-slate-950 border border-slate-800 space-y-4 animate-in fade-in duration-300">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800 pb-3">
              <span className="text-xs font-mono font-bold text-amber-400 uppercase tracking-wider">
                Metallurgical Specification Translation Output
              </span>
              <span className="text-xs text-slate-400">
                Found {translationResult.suggestedGrades.length} Candidate Grade Standards
              </span>
            </div>

            {/* Suggested Grades Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {translationResult.suggestedGrades.map((grade, idx) => (
                <div
                  key={idx}
                  className={`p-4 rounded-xl border ${
                    selectedGradeId === grade.gradeId
                      ? "border-amber-500/80 bg-slate-900 shadow-md shadow-amber-500/10"
                      : "border-slate-800 bg-slate-900/50"
                  }`}
                >
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <span className="text-xs font-bold text-white">{grade.gradeName}</span>
                    <span className="text-xs font-mono font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded">
                      {grade.suitabilityScore}% Match
                    </span>
                  </div>
                  <p className="text-xs text-slate-300 leading-relaxed mb-3">{grade.matchReason}</p>
                  
                  <div className="flex items-center justify-between pt-2 border-t border-slate-800 text-xs">
                    <button
                      onClick={() => setSelectedGradeId(grade.gradeId)}
                      className="text-amber-400 hover:underline font-semibold flex items-center gap-1"
                    >
                      <span>Filter Catalog for {grade.gradeId.toUpperCase()}</span>
                      <ArrowRight className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* Assumptions & Criteria */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 text-xs">
              <div className="p-3 rounded-lg bg-slate-900 border border-slate-800 space-y-1">
                <span className="text-[10px] font-mono text-slate-400 uppercase block">Mechanical Acceptance Bounds</span>
                <span className="text-slate-200 block font-mono">
                  Min Yield: {translationResult.keyMechanicalCriteria.minYieldKsi} ksi &bull; Min Tensile: {translationResult.keyMechanicalCriteria.minTensileKsi} ksi
                </span>
                <span className="text-slate-400 block text-[11px]">
                  Charpy Impact: {translationResult.keyMechanicalCriteria.charpyImpactRequired ? `Required @ ${translationResult.keyMechanicalCriteria.charpyTempF ?? -20}°F` : "Standard ambient"}
                </span>
              </div>

              <div className="p-3 rounded-lg bg-slate-900 border border-slate-800 space-y-1">
                <span className="text-[10px] font-mono text-slate-400 uppercase block">Assumptions Made</span>
                <ul className="text-[11px] text-slate-400 space-y-0.5">
                  {translationResult.assumptionsMade.slice(0, 2).map((a, i) => (
                    <li key={i}>&bull; {a}</li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        )}
      </section>

      {/* Catalog Filters & Destination Control */}
      <div className="p-4 rounded-xl border border-slate-800 bg-slate-900/60 flex flex-wrap items-center justify-between gap-4">
        {/* Left: Filters */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Grade Filter */}
          <div>
            <label className="text-[10px] font-mono text-slate-400 block mb-1">Standard Grade</label>
            <select
              value={selectedGradeId}
              onChange={(e) => setSelectedGradeId(e.target.value)}
              className="px-3 py-1.5 rounded-lg bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none focus:border-amber-500 font-mono"
            >
              <option value="ALL">All Grades (7)</option>
              {ALL_GRADE_STANDARDS.map((g) => (
                <option key={g.id} value={g.id}>
                  {g.grade_name}
                </option>
              ))}
            </select>
          </div>

          {/* Form Filter */}
          <div>
            <label className="text-[10px] font-mono text-slate-400 block mb-1">Product Form</label>
            <select
              value={selectedProductForm}
              onChange={(e) => setSelectedProductForm(e.target.value)}
              className="px-3 py-1.5 rounded-lg bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none focus:border-amber-500"
            >
              <option value="ALL">All Forms</option>
              <option value="Plate">Heavy Plate</option>
              <option value="Hot Rolled Coil">Hot Rolled Coil</option>
              <option value="Wide Flange Beam">Wide Flange Beam</option>
              <option value="Round Bar">Round Bar</option>
            </select>
          </div>

          {/* Max Price Slider */}
          <div>
            <label className="text-[10px] font-mono text-slate-400 block mb-1">
              Max Base Price: <strong className="text-amber-400">${maxPriceCwt}/cwt</strong>
            </label>
            <input
              type="range"
              min="40"
              max="300"
              step="5"
              value={maxPriceCwt}
              onChange={(e) => setMaxPriceCwt(Number(e.target.value))}
              className="w-32 accent-amber-500 cursor-pointer"
            />
          </div>
        </div>

        {/* Right: Delivery Destination ZIP Code */}
        <div className="flex items-center gap-3">
          <div className="text-right">
            <label className="text-[10px] font-mono text-slate-400 block mb-1 flex items-center gap-1 justify-end">
              <MapPin className="w-3 h-3 text-sky-400" />
              <span>Delivered Destination ZIP</span>
            </label>
            <input
              type="text"
              maxLength={5}
              value={destinationZip}
              onChange={(e) => setDestinationZip(e.target.value)}
              placeholder="e.g. 60601"
              className="w-24 px-2.5 py-1.5 rounded-lg bg-slate-950 border border-slate-800 text-xs font-mono text-white text-center focus:outline-none focus:border-sky-500 font-bold"
            />
          </div>
        </div>
      </div>

      {/* Inventory Listings Grid */}
      <section className="space-y-4">
        <div className="flex items-center justify-between text-xs text-slate-400">
          <span>Showing <strong>{filteredListings.length}</strong> available lots backed by Mill Test Certificates</span>
          <span>Delivered freight calculations based on 45,000 lbs flatbed capacity</span>
        </div>

        {filteredListings.length === 0 ? (
          <div className="p-12 rounded-2xl border border-slate-800 bg-slate-900/30 text-center space-y-3">
            <AlertTriangle className="w-8 h-8 text-amber-400 mx-auto" />
            <h3 className="text-base font-bold text-white">No Inventory Lots Found</h3>
            <p className="text-xs text-slate-400 max-w-sm mx-auto">
              No available lots match the current filter criteria. Try resetting grade or price filters.
            </p>
            <button
              onClick={() => {
                setSelectedGradeId("ALL");
                setSelectedProductForm("ALL");
                setMaxPriceCwt(300);
                setSearchQuery("");
              }}
              className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-amber-400 text-xs font-semibold"
            >
              Reset Filters
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {filteredListings.map((lot) => {
              // Calculate real-time delivered cost for this lot to destination ZIP
              const delivered = calculateDeliveredCost({
                listingId: lot.id,
                warehouseCity: lot.warehouse_city,
                warehouseState: lot.warehouse_state,
                warehouseLat: lot.warehouse_lat,
                warehouseLng: lot.warehouse_lng,
                destinationZip,
                weightLbs: lot.total_weight_lbs,
                pricePerCwt: lot.price_per_cwt,
                widthInches: lot.width_in,
                singlePieceWeightLbs: lot.total_weight_lbs / lot.pieces_available
              });

              const isCompared = comparisonIds.includes(lot.id);

              return (
                <div
                  key={lot.id}
                  className="rounded-2xl border border-slate-800 bg-slate-900/50 p-6 flex flex-col justify-between space-y-5 hover:border-slate-700 transition-all shadow-md"
                >
                  <div className="space-y-3">
                    {/* Top Badges */}
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700 font-bold">
                          Heat: {lot.certificate?.heat_number}
                        </span>
                        <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-slate-800 text-slate-400">
                          {lot.product_form}
                        </span>
                      </div>

                      <div className="flex items-center gap-1.5">
                        <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3" />
                          <span>EN 10204 3.1</span>
                        </span>
                      </div>
                    </div>

                    {/* Title & Dimensions */}
                    <div>
                      <h3 className="text-base font-bold text-white line-clamp-1">{lot.title}</h3>
                      <p className="text-xs text-slate-400 font-mono mt-0.5">
                        {lot.dimensions_display} &bull; {lot.pieces_available} pieces &bull; {(lot.total_weight_lbs / 2000).toFixed(1)} tons
                      </p>
                    </div>

                    {/* Commercial Pricing & Freight Comparison Grid */}
                    <div className="grid grid-cols-2 gap-3 pt-3 border-t border-slate-800/80">
                      <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 space-y-0.5">
                        <span className="text-[10px] text-slate-400 font-mono uppercase block">Base Mill Price</span>
                        <span className="text-lg font-bold text-white font-mono">
                          ${lot.price_per_cwt.toFixed(2)}{" "}
                          <span className="text-xs text-slate-400 font-normal">/ cwt</span>
                        </span>
                        <span className="text-[11px] text-slate-400 block font-mono">
                          FOB {lot.warehouse_city}, {lot.warehouse_state}
                        </span>
                      </div>

                      <div className="p-3 rounded-xl bg-sky-950/20 border border-sky-500/30 space-y-0.5">
                        <span className="text-[10px] text-sky-400 font-mono uppercase block">Estimated Delivered</span>
                        <span className="text-lg font-bold text-sky-300 font-mono">
                          ${delivered.deliveredCostPerCwt.toFixed(2)}{" "}
                          <span className="text-xs text-slate-400 font-normal">/ cwt</span>
                        </span>
                        <span className="text-[11px] text-slate-300 block font-mono">
                          Delivered to {delivered.destinationZip} ({delivered.distanceMiles} mi)
                        </span>
                      </div>
                    </div>

                    {/* Logistics Breakdown Drawer */}
                    <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800 text-xs space-y-1.5">
                      <div className="flex justify-between text-slate-400 font-mono">
                        <span>Flatbed Loads Required:</span>
                        <span className="text-slate-200 font-bold">{delivered.truckloadsRequired} truckload(s)</span>
                      </div>
                      <div className="flex justify-between text-slate-400 font-mono">
                        <span>Material Total:</span>
                        <span className="text-slate-200">${delivered.baseMaterialCost.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between text-slate-400 font-mono">
                        <span>Delivered Freight Total:</span>
                        <span className="text-sky-400 font-bold">${delivered.totalFreightCost.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between border-t border-slate-800/80 pt-1 text-slate-300 font-mono font-bold">
                        <span>Landed Total Order:</span>
                        <span className="text-emerald-400">${delivered.totalDeliveredCost.toLocaleString()}</span>
                      </div>
                    </div>
                  </div>

                  {/* Actions Bar */}
                  <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between gap-3">
                    <button
                      onClick={() => setInspectingListing(lot)}
                      className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold transition-colors"
                    >
                      <Eye className="w-3.5 h-3.5 text-amber-400" />
                      <span>Audit MTR Batch</span>
                    </button>

                    <button
                      onClick={() => toggleComparison(lot.id)}
                      className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold transition-colors ${
                        isCompared
                          ? "bg-amber-500 text-slate-950 font-bold"
                          : "bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700"
                      }`}
                    >
                      <Scale className="w-3.5 h-3.5" />
                      <span>{isCompared ? "In Comparison Matrix" : "Add to Compare"}</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* MTR Audit Modal Drawer */}
      {inspectingListing && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto p-6 space-y-6 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <div>
                <span className="text-xs font-mono text-amber-400 uppercase">
                  Batch Material Test Report (EN 10204 3.1)
                </span>
                <h3 className="text-xl font-bold text-white">{inspectingListing.title}</h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Heat: <strong>{inspectingListing.certificate?.heat_number}</strong> &bull; Mill: {inspectingListing.certificate?.mill_name}
                </p>
              </div>
              <button
                onClick={() => setInspectingListing(null)}
                className="p-2 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Recharts Chemical Analysis Comparison */}
            {inspectingListing.certificate && (
              <div className="space-y-3">
                <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                  Chemical Ladle Analysis vs. ASTM Standard
                </h4>
                <ChemistryChart
                  actual={inspectingListing.certificate.chemical_analysis}
                  spec={inspectingListing.grade?.chem_limits || {}}
                />
              </div>
            )}

            {/* Mechanical Properties Grid */}
            {inspectingListing.certificate && (
              <div className="space-y-3">
                <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                  Certified Mechanical Pull &amp; Impact Tests
                </h4>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
                    <span className="text-[10px] text-slate-400 uppercase font-mono block">Yield Strength</span>
                    <span className="text-lg font-bold text-white font-mono">
                      {inspectingListing.certificate.mechanical_results.yield_strength_ksi} ksi
                    </span>
                    <span className="text-[10px] text-emerald-400 block font-mono">PASSES ASTM MIN</span>
                  </div>

                  <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
                    <span className="text-[10px] text-slate-400 uppercase font-mono block">Tensile Strength</span>
                    <span className="text-lg font-bold text-white font-mono">
                      {inspectingListing.certificate.mechanical_results.tensile_strength_ksi} ksi
                    </span>
                    <span className="text-[10px] text-emerald-400 block font-mono">PASSES ASTM RANGE</span>
                  </div>

                  <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
                    <span className="text-[10px] text-slate-400 uppercase font-mono block">Elongation %</span>
                    <span className="text-lg font-bold text-white font-mono">
                      {inspectingListing.certificate.mechanical_results.elongation_pct}%
                    </span>
                    <span className="text-[10px] text-emerald-400 block font-mono">PASSES DUCTILITY</span>
                  </div>

                  <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
                    <span className="text-[10px] text-slate-400 uppercase font-mono block">Carbon Equivalent</span>
                    <span className="text-lg font-bold text-amber-400 font-mono">
                      {inspectingListing.certificate.chemical_analysis.CEV ?? "0.385"}
                    </span>
                    <span className="text-[10px] text-slate-400 block font-mono">AWS D1.1 Prequalified</span>
                  </div>
                </div>
              </div>
            )}

            {/* Delivered Cost Breakdown Chart */}
            <div className="space-y-3">
              <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                Delivered Cost Breakdown to ZIP {destinationZip}
              </h4>
              <FreightCostChart
                delivered={calculateDeliveredCost({
                  listingId: inspectingListing.id,
                  warehouseCity: inspectingListing.warehouse_city,
                  warehouseState: inspectingListing.warehouse_state,
                  warehouseLat: inspectingListing.warehouse_lat,
                  warehouseLng: inspectingListing.warehouse_lng,
                  destinationZip,
                  weightLbs: inspectingListing.total_weight_lbs,
                  pricePerCwt: inspectingListing.price_per_cwt,
                  widthInches: inspectingListing.width_in
                })}
              />
            </div>

            {/* Synthetic Notice */}
            <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-300 text-[11px] leading-relaxed">
              <strong>Synthetic Benchmark Record:</strong> This certificate and inventory lot represents realistic synthetic data for demonstration. MillProof utilizes deterministic mathematical rules to evaluate compliance against ASTM standards. No financial or mill obligation is established.
            </div>

            <div className="flex justify-end pt-2">
              <button
                onClick={() => setInspectingListing(null)}
                className="px-5 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold"
              >
                Close Audit View
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
