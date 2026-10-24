"use client";

import React, { useState } from "react";
import Link from "next/link";
import { 
  UploadCloud, 
  FileText, 
  CheckCircle2, 
  AlertTriangle, 
  XCircle, 
  Sparkles, 
  ShieldAlert, 
  Layers, 
  Flame, 
  ArrowRight, 
  RefreshCw,
  Building,
  Scale,
  Eye,
  Check
} from "lucide-react";
import { ALL_GRADE_STANDARDS, GRADE_STANDARDS_REGISTRY } from "@/lib/data/standards";
import { ChemicalAnalysis, MechanicalResults, MTRQCSummary, GradeStandard } from "@/types/steel";

export default function SellerPage() {
  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [publishedListingId, setPublishedListingId] = useState<string | null>(null);

  // Extracted Data State
  const [selectedSample, setSelectedSample] = useState<string | null>(null);
  const [targetGradeId, setTargetGradeId] = useState<string>("astm-a572-50");
  const [extractedData, setExtractedData] = useState<{
    heatNumber: string;
    certNumber: string;
    millName: string;
    millCountry: string;
    specification: string;
    productForm: string;
    dimensions: {
      thickness_in: number;
      width_in: number;
      length_in: number;
      weight_lbs: number;
    };
    chemicalAnalysis: ChemicalAnalysis;
    mechanicalResults: MechanicalResults;
    heatTreatment: string;
    en10204Type: string;
    notes?: string;
  } | null>(null);

  const [qcSummary, setQcSummary] = useState<MTRQCSummary | null>(null);
  const [activeStandard, setActiveStandard] = useState<GradeStandard | null>(null);

  // Publishing form state
  const [pricePerCwt, setPricePerCwt] = useState<number>(52.0);
  const [piecesAvailable, setPiecesAvailable] = useState<number>(6);
  const [warehouseCity, setWarehouseCity] = useState<string>("Gary");
  const [warehouseState, setWarehouseState] = useState<string>("IN");
  const [confirmedReview, setConfirmedReview] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);

  // Trigger sample extraction
  async function loadSample(sampleId: string) {
    setIsProcessing(true);
    setErrorMessage(null);
    setSuccessMessage(null);
    setSelectedSample(sampleId);

    try {
      const res = await fetch("/api/extract-mtr", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sampleId, standardGradeId: targetGradeId })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to process sample MTR");
      }

      setExtractedData(data.extractedData);
      setQcSummary(data.qcSummary);
      setActiveStandard(data.targetGrade);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Error extracting sample MTR";
      setErrorMessage(msg);
    } finally {
      setIsProcessing(false);
    }
  }

  // Handle custom file upload
  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsProcessing(true);
    setErrorMessage(null);
    setSuccessMessage(null);
    setSelectedSample(null);

    try {
      const reader = new FileReader();
      reader.onload = async () => {
        const base64Data = reader.result as string;

        try {
          const res = await fetch("/api/extract-mtr", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              fileData: base64Data,
              mimeType: file.type || "application/pdf",
              standardGradeId: targetGradeId
            })
          });

          const data = await res.json();
          if (!res.ok) {
            throw new Error(data.error || "Failed to process document");
          }

          setExtractedData(data.extractedData);
          setQcSummary(data.qcSummary);
          setActiveStandard(data.targetGrade);
        } catch (postErr: unknown) {
          const msg = postErr instanceof Error ? postErr.message : "Extraction API error";
          setErrorMessage(msg);
        } finally {
          setIsProcessing(false);
        }
      };

      reader.readAsDataURL(file);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Error reading file";
      setErrorMessage(msg);
      setIsProcessing(false);
    }
  }

  // Publish listing
  async function handlePublish() {
    if (!extractedData || !confirmedReview) return;

    setIsPublishing(true);
    setErrorMessage(null);

    try {
      const totalWeight = extractedData.dimensions.weight_lbs * piecesAvailable;
      const res = await fetch("/api/listings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: `${extractedData.dimensions.thickness_in.toFixed(3)}" ${activeStandard?.grade_name || "Steel Plate"} (Heat ${extractedData.heatNumber})`,
          grade_id: targetGradeId,
          product_form: extractedData.productForm,
          thickness_in: extractedData.dimensions.thickness_in,
          width_in: extractedData.dimensions.width_in,
          length_in: extractedData.dimensions.length_in,
          pieces_available: piecesAvailable,
          total_weight_lbs: totalWeight,
          price_per_cwt: pricePerCwt,
          warehouse_city: warehouseCity,
          warehouse_state: warehouseState,
          certificate: extractedData
        })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to publish listing");
      }

      setSuccessMessage("Listing successfully certified and published to the active marketplace!");
      setPublishedListingId(data.listing.id);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to publish listing";
      setErrorMessage(msg);
    } finally {
      setIsPublishing(false);
    }
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-10">
      {/* Title & Banner */}
      <div className="space-y-3">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-800 text-amber-400 text-xs font-semibold border border-slate-700">
          <UploadCloud className="w-3.5 h-3.5" />
          <span>Seller Hub &amp; MTR Ingestion Workbench</span>
        </div>
        <h1 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
          Material Test Report (MTR) Ingestion &amp; QC Audit
        </h1>
        <p className="text-sm text-slate-300 max-w-3xl leading-relaxed">
          Upload raw mill test certificates (EN 10204 3.1) or test benchmark samples. Server-side Gemini parses chemical heats and tensile pulls; MillProof&apos;s deterministic ASTM rule engine evaluates numerical compliance before listing publication.
        </p>
      </div>

      {/* Step 1: Ingestion Area & Quick Test Samples */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Upload Dropzone */}
        <div className="lg:col-span-6 space-y-4">
          <div className="p-6 rounded-2xl border-2 border-dashed border-slate-700 bg-slate-900/50 hover:border-amber-500/60 transition-colors flex flex-col items-center justify-center text-center space-y-4 py-12">
            <div className="w-16 h-16 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
              <UploadCloud className="w-8 h-8" />
            </div>
            <div className="space-y-1">
              <h3 className="text-base font-bold text-white">Upload Mill Test Certificate (PDF or Image)</h3>
              <p className="text-xs text-slate-400 max-w-xs">
                Supports EN 10204 3.1 &amp; 3.2 mill certificates, ladle analysis sheets, and CMTR scans up to 10MB.
              </p>
            </div>
            <div>
              <label className="cursor-pointer inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold transition-all shadow-md">
                <FileText className="w-4 h-4" />
                <span>Select MTR Document</span>
                <input
                  type="file"
                  accept="application/pdf,image/*"
                  onChange={handleFileUpload}
                  className="hidden"
                  disabled={isProcessing}
                />
              </label>
            </div>
          </div>
        </div>

        {/* Quick Test Benchmark Samples */}
        <div className="lg:col-span-6 space-y-4">
          <div className="p-6 rounded-2xl border border-slate-800 bg-slate-900/40 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-amber-400" />
                <span>Or Select a Pre-Loaded Benchmark Sample</span>
              </h3>
              <span className="text-[10px] text-slate-400">Instant Demo Audit</span>
            </div>

            <div className="space-y-3">
              {/* Sample 1 */}
              <div
                onClick={() => loadSample("sample-a572-pass")}
                className={`p-3.5 rounded-xl border cursor-pointer transition-all ${
                  selectedSample === "sample-a572-pass"
                    ? "border-amber-500 bg-slate-800/80 shadow-md shadow-amber-500/10"
                    : "border-slate-800 bg-slate-950/60 hover:border-slate-700 hover:bg-slate-900"
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-white">Burns Harbor A572 Gr 50 Plate</span>
                  <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                    Compliant Benchmark
                  </span>
                </div>
                <p className="text-[11px] text-slate-400 mt-1">
                  Heat H-784291 &bull; 0.750&quot; x 96&quot; x 240&quot; &bull; Yield 54.8 ksi &bull; Low CEV 0.385
                </p>
              </div>

              {/* Sample 2 */}
              <div
                onClick={() => loadSample("sample-a514-qt")}
                className={`p-3.5 rounded-xl border cursor-pointer transition-all ${
                  selectedSample === "sample-a514-qt"
                    ? "border-amber-500 bg-slate-800/80 shadow-md shadow-amber-500/10"
                    : "border-slate-800 bg-slate-950/60 hover:border-slate-700 hover:bg-slate-900"
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-white">Coatesville A514 T-1 Quenched &amp; Tempered</span>
                  <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                    High Yield (100 ksi)
                  </span>
                </div>
                <p className="text-[11px] text-slate-400 mt-1">
                  Heat H-643810 &bull; 0.500&quot; Plate &bull; 108.5 ksi Yield &bull; Full alloy Cr-Mo-B chemistry
                </p>
              </div>

              {/* Sample 3: Out-of-Spec */}
              <div
                onClick={() => loadSample("sample-flagged")}
                className={`p-3.5 rounded-xl border cursor-pointer transition-all ${
                  selectedSample === "sample-flagged"
                    ? "border-rose-500 bg-slate-800/80 shadow-md shadow-rose-500/10"
                    : "border-slate-800 bg-slate-950/60 hover:border-slate-700 hover:bg-slate-900"
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-white">Out-of-Spec Test Batch (Failure Demo)</span>
                  <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-rose-500/10 text-rose-400 border border-rose-500/20">
                    Deterministic Flags
                  </span>
                </div>
                <p className="text-[11px] text-slate-400 mt-1">
                  Carbon 0.27% exceeds 0.23% max &bull; Yield 48.2 ksi under 50 ksi min &bull; Automatic QC halt
                </p>
              </div>
            </div>

            {/* Target Specification Selector */}
            <div className="pt-2 border-t border-slate-800">
              <label className="text-[11px] font-mono text-slate-400 block mb-1">
                Target Auditing Specification:
              </label>
              <select
                value={targetGradeId}
                onChange={(e) => setTargetGradeId(e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none focus:border-amber-500 font-mono"
              >
                {ALL_GRADE_STANDARDS.map((g) => (
                  <option key={g.id} value={g.id}>
                    {g.standard_org} {g.grade_name} ({g.category})
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Loading Indicator */}
      {isProcessing && (
        <div className="p-8 rounded-2xl border border-slate-800 bg-slate-900/60 flex flex-col items-center justify-center space-y-3">
          <RefreshCw className="w-8 h-8 text-amber-400 animate-spin" />
          <h4 className="text-sm font-bold text-white">Extracting &amp; Auditing Material Certificate...</h4>
          <p className="text-xs text-slate-400">
            Running server-side Gemini OCR extraction &bull; Calculating Carbon Equivalent &bull; Validating ASTM tolerances
          </p>
        </div>
      )}

      {/* Error Banner */}
      {errorMessage && (
        <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-3">
          <XCircle className="w-5 h-5 text-rose-400 shrink-0" />
          <div>
            <span className="font-bold block">Extraction or Audit Notice:</span>
            <span>{errorMessage}</span>
          </div>
        </div>
      )}

      {/* Success Banner */}
      {successMessage && (
        <div className="p-6 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-200 text-xs space-y-3">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
            <span className="text-sm font-bold text-white">{successMessage}</span>
          </div>
          <div className="flex items-center gap-3 pt-2">
            <Link
              href={`/procure?selected=${publishedListingId}`}
              className="px-4 py-2 rounded-lg bg-emerald-500 text-slate-950 font-bold text-xs hover:bg-emerald-400 transition-colors"
            >
              View Published Listing in Buyer Catalog
            </Link>
          </div>
        </div>
      )}

      {/* Step 2: Interactive QC Workbench (Visible once data is loaded) */}
      {extractedData && qcSummary && (
        <div className="space-y-8 animate-in fade-in duration-300">
          {/* QC Status Banner */}
          <div className={`p-6 rounded-2xl border ${
            qcSummary.status === "PASS"
              ? "bg-emerald-950/30 border-emerald-500/40"
              : qcSummary.status === "REVIEW_REQUIRED"
              ? "bg-amber-950/30 border-amber-500/40"
              : "bg-rose-950/30 border-rose-500/40"
          }`}>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-start gap-4">
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${
                  qcSummary.status === "PASS"
                    ? "bg-emerald-500/20 text-emerald-400"
                    : qcSummary.status === "REVIEW_REQUIRED"
                    ? "bg-amber-500/20 text-amber-400"
                    : "bg-rose-500/20 text-rose-400"
                }`}>
                  {qcSummary.status === "PASS" ? (
                    <CheckCircle2 className="w-7 h-7" />
                  ) : qcSummary.status === "REVIEW_REQUIRED" ? (
                    <AlertTriangle className="w-7 h-7" />
                  ) : (
                    <XCircle className="w-7 h-7" />
                  )}
                </div>
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono uppercase tracking-wider text-slate-400">Deterministic QC Engine:</span>
                    <span className={`px-2 py-0.5 rounded text-xs font-black uppercase ${
                      qcSummary.status === "PASS"
                        ? "bg-emerald-500/20 text-emerald-300"
                        : qcSummary.status === "REVIEW_REQUIRED"
                        ? "bg-amber-500/20 text-amber-300"
                        : "bg-rose-500/20 text-rose-300"
                    }`}>
                      {qcSummary.status === "PASS" ? "ALL ASTM LIMITS MET" : qcSummary.status === "REVIEW_REQUIRED" ? "MARGINAL / REVIEW" : "SPECIFICATION VIOLATION"}
                    </span>
                  </div>
                  <h3 className="text-xl font-bold text-white">
                    {extractedData.millName} &bull; Heat {extractedData.heatNumber}
                  </h3>
                  <p className="text-xs text-slate-300">
                    Governing Specification: <strong>{extractedData.specification}</strong> against standard <strong>{activeStandard?.grade_name}</strong>
                  </p>
                </div>
              </div>

              {/* CEV pill */}
              <div className="text-right sm:border-l sm:border-slate-800 sm:pl-6 space-y-1">
                <span className="text-[10px] text-slate-400 uppercase font-mono block">Carbon Equivalent</span>
                <span className="text-lg font-bold text-white font-mono">
                  {extractedData.chemicalAnalysis.CEV ?? "Calculated"}
                </span>
                <span className="text-[11px] text-amber-400 block font-mono">
                  {qcSummary.weldability}
                </span>
              </div>
            </div>

            {/* Quality Flags List */}
            {qcSummary.flags.length > 0 && (
              <div className="mt-4 pt-4 border-t border-slate-800/80 space-y-1.5">
                <span className="text-xs font-semibold text-rose-300 uppercase tracking-wider block">
                  Quality Audit Flags ({qcSummary.flags.length}):
                </span>
                <ul className="space-y-1">
                  {qcSummary.flags.map((flag, idx) => (
                    <li key={idx} className="text-xs text-rose-300/90 flex items-center gap-2">
                      <XCircle className="w-3.5 h-3.5 text-rose-400 shrink-0" />
                      <span>{flag}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          {/* Side-by-Side: Extracted Header & Dimensions */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 space-y-1">
              <span className="text-[10px] text-slate-400 font-mono uppercase">Heat Number</span>
              <span className="text-base font-bold text-white font-mono block">{extractedData.heatNumber}</span>
              <span className="text-[11px] text-slate-400">Cert: {extractedData.certNumber}</span>
            </div>

            <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 space-y-1">
              <span className="text-[10px] text-slate-400 font-mono uppercase">Product Dimensions</span>
              <span className="text-base font-bold text-white font-mono block">
                {extractedData.dimensions.thickness_in.toFixed(3)}&quot; x {extractedData.dimensions.width_in}&quot; x {extractedData.dimensions.length_in ? `${extractedData.dimensions.length_in}"` : "Coil"}
              </span>
              <span className="text-[11px] text-slate-400">Form: {extractedData.productForm}</span>
            </div>

            <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 space-y-1">
              <span className="text-[10px] text-slate-400 font-mono uppercase">Piece Weight</span>
              <span className="text-base font-bold text-white font-mono block">
                {extractedData.dimensions.weight_lbs.toLocaleString()} lbs
              </span>
              <span className="text-[11px] text-slate-400">{(extractedData.dimensions.weight_lbs / 2000).toFixed(2)} short tons/piece</span>
            </div>

            <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 space-y-1">
              <span className="text-[10px] text-slate-400 font-mono uppercase">Heat Treatment</span>
              <span className="text-base font-bold text-white block">{extractedData.heatTreatment}</span>
              <span className="text-[11px] text-slate-400">EN 10204 Type: {extractedData.en10204Type}</span>
            </div>
          </div>

          {/* Chemical Analysis Comparison Table */}
          <div className="p-6 rounded-2xl border border-slate-800 bg-slate-900/40 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Flame className="w-5 h-5 text-amber-400" />
                <span>Chemical Ladle Analysis vs. ASTM Standard Limits</span>
              </h3>
              <span className="text-xs text-slate-400 font-mono">
                Pure deterministic numerical comparison
              </span>
            </div>

            <div className="overflow-x-auto rounded-lg border border-slate-800 bg-slate-950">
              <table className="w-full text-left text-xs font-mono">
                <thead className="bg-slate-900 border-b border-slate-800 text-slate-400">
                  <tr>
                    <th className="p-2.5">Element</th>
                    <th className="p-2.5">MTR Ladle Actual %</th>
                    <th className="p-2.5">Specified Min %</th>
                    <th className="p-2.5">Specified Max %</th>
                    <th className="p-2.5">Compliance Status</th>
                    <th className="p-2.5">Audit Evaluation</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {qcSummary.chemistry_checks?.map((check) => (
                    <tr key={check.element} className="hover:bg-slate-900/40">
                      <td className="p-2.5 font-bold text-amber-400">{check.element}</td>
                      <td className="p-2.5 font-bold text-white">{check.actual.toFixed(3)}%</td>
                      <td className="p-2.5 text-slate-400">{check.min !== undefined ? `${check.min.toFixed(3)}%` : "-"}</td>
                      <td className="p-2.5 text-slate-400">{check.max !== undefined ? `${check.max.toFixed(3)}%` : "-"}</td>
                      <td className="p-2.5">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                          check.status === "PASS"
                            ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                            : check.status === "MARGINAL"
                            ? "bg-amber-500/10 text-amber-400 border border-amber-500/20"
                            : "bg-rose-500/10 text-rose-400 border border-rose-500/20"
                        }`}>
                          {check.status}
                        </span>
                      </td>
                      <td className="p-2.5 text-slate-300 font-sans text-[11px]">
                        {check.note || "Within specified ASTM tolerance band"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Mechanical Pull Test Verification */}
          <div className="p-6 rounded-2xl border border-slate-800 bg-slate-900/40 space-y-4">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <Scale className="w-5 h-5 text-amber-400" />
              <span>Mechanical Tension &amp; Toughness Test Results</span>
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {qcSummary.mechanical_checks?.map((check, idx) => (
                <div key={idx} className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-mono text-slate-400 uppercase">{check.property}</span>
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                      check.status === "PASS"
                        ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                        : "bg-rose-500/10 text-rose-400 border border-rose-500/20"
                    }`}>
                      {check.status}
                    </span>
                  </div>

                  <div className="flex items-baseline gap-2 font-mono">
                    <span className="text-2xl font-bold text-white">{check.actual}</span>
                    <span className="text-xs text-slate-400">{check.unit}</span>
                  </div>

                  <p className="text-[11px] text-slate-400 font-mono">
                    Required: {check.min !== undefined ? `${check.min} min` : ""} {check.max !== undefined ? `to ${check.max} max` : ""} {check.unit}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* Step 3: Marketplace Listing Publishing Drawer */}
          <div className="p-6 rounded-2xl border border-amber-500/30 bg-slate-900/60 space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-4">
              <div className="space-y-1">
                <h3 className="text-lg font-bold text-white">Publish Lot to Active Marketplace</h3>
                <p className="text-xs text-slate-400">
                  Set commercial pricing and stock availability. Buyers can instantly calculate delivered flatbed logistics.
                </p>
              </div>
              <div className="text-xs text-amber-400 font-mono font-semibold">
                FOB Origin Warehouse
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
              <div>
                <label className="text-xs font-mono text-slate-400 block mb-1">Base Price ($ / cwt)</label>
                <div className="relative">
                  <span className="absolute left-3 top-2.5 text-xs text-slate-400">$</span>
                  <input
                    type="number"
                    step="0.5"
                    value={pricePerCwt}
                    onChange={(e) => setPricePerCwt(parseFloat(e.target.value) || 0)}
                    className="w-full pl-7 pr-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-xs font-mono text-white focus:outline-none focus:border-amber-500"
                  />
                </div>
                <span className="text-[10px] text-slate-400 mt-1 block">
                  = ${(pricePerCwt * 20).toFixed(2)} / short ton
                </span>
              </div>

              <div>
                <label className="text-xs font-mono text-slate-400 block mb-1">Available Pieces</label>
                <input
                  type="number"
                  min="1"
                  value={piecesAvailable}
                  onChange={(e) => setPiecesAvailable(parseInt(e.target.value, 10) || 1)}
                  className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-xs font-mono text-white focus:outline-none focus:border-amber-500"
                />
                <span className="text-[10px] text-slate-400 mt-1 block">
                  Total Weight: {(extractedData.dimensions.weight_lbs * piecesAvailable).toLocaleString()} lbs
                </span>
              </div>

              <div>
                <label className="text-xs font-mono text-slate-400 block mb-1">Warehouse City</label>
                <input
                  type="text"
                  value={warehouseCity}
                  onChange={(e) => setWarehouseCity(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <label className="text-xs font-mono text-slate-400 block mb-1">State</label>
                <input
                  type="text"
                  value={warehouseState}
                  onChange={(e) => setWarehouseState(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none focus:border-amber-500"
                />
              </div>
            </div>

            {/* Human in the loop confirmation */}
            <div className="pt-4 border-t border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <label className="flex items-center gap-3 cursor-pointer select-none text-xs text-slate-300">
                <input
                  type="checkbox"
                  checked={confirmedReview}
                  onChange={(e) => setConfirmedReview(e.target.checked)}
                  className="w-4 h-4 rounded bg-slate-950 border-slate-700 text-amber-500 focus:ring-amber-500"
                />
                <span>
                  I confirm that I have reviewed the extracted ladle chemistry and mechanical test results against the manufacturer MTR document.
                </span>
              </label>

              <button
                onClick={handlePublish}
                disabled={!confirmedReview || isPublishing || qcSummary.status === "FAIL"}
                className={`px-6 py-3 rounded-xl font-bold text-xs transition-all flex items-center gap-2 ${
                  !confirmedReview || qcSummary.status === "FAIL"
                    ? "bg-slate-800 text-slate-400 cursor-not-allowed"
                    : "bg-amber-500 hover:bg-amber-400 text-slate-950 shadow-lg shadow-amber-500/20"
                }`}
              >
                {isPublishing ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : (
                  <Check className="w-4 h-4" />
                )}
                <span>
                  {qcSummary.status === "FAIL" ? "Cannot Publish (QC Violation)" : "Confirm & Publish Listing"}
                </span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
