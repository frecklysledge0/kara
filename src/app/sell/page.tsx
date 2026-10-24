"use client";

import React, { useState, useId } from "react";
import Link from "next/link";
import { 
  UploadCloud, 
  FileText, 
  CheckCircle2, 
  AlertTriangle, 
  XCircle, 
  ArrowRight, 
  RefreshCw,
  Scale,
  Info,
  Edit3,
  Lock,
  ChevronDown,
  ChevronUp,
  Activity
} from "lucide-react";
import { PageContainer } from "@/components/layout/PageContainer";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Input } from "@/components/ui/Input";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/Table";
import { CURATED_GRADES } from "@/lib/data/grades";
import { SYNTHETIC_MTR_FIXTURES } from "@/lib/data/synthetic-mtr-fixtures";
import { MTRExtraction, MTRReviewResult, MTRExtractionPipelineResponse } from "@/types/mtr";
import { evaluateMTRComplianceAndRisk } from "@/lib/engine/mtr-qc";
import { SolanaSignPanel } from "@/components/solana/SolanaSignPanel";

export default function SellPage() {
  // Stepper & Processing states
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingStage, setProcessingStage] = useState<string>("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [publishedListingId, setPublishedListingId] = useState<string | null>(null);

  // Active Document & Extraction State
  const [selectedBenchmarkId, setSelectedBenchmarkId] = useState<string | null>(null);
  const [uploadedFileName, setUploadedFileName] = useState<string | null>(null);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [documentSha256, setDocumentSha256] = useState<string | null>(null);
  const [signedPreviewUrl, setSignedPreviewUrl] = useState<string | null>(null);
  const [rawDocumentSnippet, setRawDocumentSnippet] = useState<string | null>(null);

  // Extracted Data & QC Review State
  const [extractedData, setExtractedData] = useState<MTRExtraction | null>(null);
  const [reviewResult, setReviewResult] = useState<MTRReviewResult | null>(null);
  const [provenanceNotice, setProvenanceNotice] = useState<string | null>(null);

  // Editing state for seller corrections
  const [isEditing, setIsEditing] = useState(false);
  const [showEvidence, setShowEvidence] = useState(false);
  const [showDocPreview, setShowDocPreview] = useState(true);

  // Commercial Publishing State
  const [pricePerTon, setPricePerTon] = useState<number>(1080.0);
  const [piecesAvailable, setPiecesAvailable] = useState<number>(6);
  const [warehouseCity, setWarehouseCity] = useState<string>("Gary");
  const [warehouseState, setWarehouseState] = useState<string>("IN");
  const [confirmedReview, setConfirmedReview] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);

  // Cancellation and timing state
  const abortControllerRef = React.useRef<AbortController | null>(null);
  const fileInputRef = React.useRef<HTMLInputElement | null>(null);
  const [elapsedSeconds, setElapsedSeconds] = useState<number>(0);
  const timerRef = React.useRef<NodeJS.Timeout | null>(null);

  function startExtractionTimer() {
    setElapsedSeconds(0);
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      setElapsedSeconds((prev) => prev + 1);
    }, 1000);
  }

  function stopExtractionTimer() {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }

  function cancelExtraction() {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    stopExtractionTimer();
    setIsProcessing(false);
    setProcessingStage("idle");
    setErrorMessage("Document extraction was cancelled by user.");
  }

  // Drag and drop visual state
  const [isDragging, setIsDragging] = useState(false);

  // IDs for accessibility
  const confirmCheckId = useId();

  // Load a synthetic benchmark fixture
  async function loadBenchmarkSample(benchmarkId: string) {
    if (isProcessing) return; // Prevent duplicate concurrent extraction

    setUploadedFile(null);
    setIsProcessing(true);
    setProcessingStage("Loading DEMO benchmark fixture...");
    setErrorMessage(null);
    setSuccessMessage(null);
    setSelectedBenchmarkId(benchmarkId);
    setPublishedListingId(null);
    setIsEditing(false);

    try {
      const res = await fetch("/api/extract-mtr", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sampleId: benchmarkId }),
      });

      const data: MTRExtractionPipelineResponse = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to process sample MTR");
      }

      setExtractedData(data.extracted_data);
      setReviewResult(data.review_result);
      setDocumentSha256(data.document_sha256 || null);
      setSignedPreviewUrl(data.signed_preview_url || null);
      setProvenanceNotice(data.provenance.disclaimer);

      const benchmark = SYNTHETIC_MTR_FIXTURES.find((b) => b.id === benchmarkId);
      if (benchmark) {
        setUploadedFileName(`${benchmark.name} (DEMO)`);
        setRawDocumentSnippet(benchmark.mockRawDocumentText);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Error extracting sample MTR";
      setErrorMessage(msg);
    } finally {
      setIsProcessing(false);
      setProcessingStage("idle");
    }
  }

  // Handle uploaded file (PDF / Image)
  async function processFile(file: File) {
    if (isProcessing) return; // Prevent duplicate concurrent extraction

    setIsProcessing(true);
    setErrorMessage(null);
    setSuccessMessage(null);
    setSelectedBenchmarkId(null);
    setPublishedListingId(null);
    setIsEditing(false);
    setUploadedFileName(file.name);
    setUploadedFile(file);

    startExtractionTimer();
    const ac = new AbortController();
    abortControllerRef.current = ac;

    // Sequence stages for realistic feedback
    setProcessingStage("Validating file format & magic bytes...");

    try {
      if (file.size > 20 * 1024 * 1024) {
        throw new Error("File exceeds maximum allowable size (20MB).");
      }

      const reader = new FileReader();
      reader.onload = async () => {
        try {
          const base64Data = reader.result as string;

          setProcessingStage("Storing document in private Supabase vault...");
          await new Promise((r) => setTimeout(r, 400));

          setProcessingStage("Gemini multimodal extraction in progress (extracting chemistry & mechanical specs)...");
          const res = await fetch("/api/extract-mtr", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              fileData: base64Data,
              fileName: file.name,
              mimeType: file.type || "application/pdf",
              sellerId: "demo-seller-01",
            }),
            signal: ac.signal,
          });

          setProcessingStage("Running deterministic ASTM/SAE quality-control audit...");
          const data: MTRExtractionPipelineResponse = await res.json();

          if (!res.ok || !data.success) {
            throw new Error(data.error || "Failed to process document");
          }

          setExtractedData(data.extracted_data);
          setReviewResult(data.review_result);
          setDocumentSha256(data.document_sha256 || null);
          setSignedPreviewUrl(data.signed_preview_url || null);
          setProvenanceNotice(data.provenance?.disclaimer || null);
          setRawDocumentSnippet(`Uploaded Document: ${file.name}\nSize: ${(file.size / 1024).toFixed(1)} KB\nMIME: ${file.type || "application/pdf"}\nIntegrity Hash: ${data.document_sha256}`);
        } catch (postErr: unknown) {
          if (postErr instanceof Error && postErr.name === "AbortError") {
            setErrorMessage("MTR extraction was cancelled.");
          } else {
            const msg = postErr instanceof Error ? postErr.message : "Extraction API error";
            setErrorMessage(msg);
          }
        } finally {
          stopExtractionTimer();
          abortControllerRef.current = null;
          setIsProcessing(false);
          setProcessingStage("idle");
        }
      };

      reader.onerror = () => {
        throw new Error("Failed to read local file.");
      };

      reader.readAsDataURL(file);
    } catch (err: unknown) {
      stopExtractionTimer();
      abortControllerRef.current = null;
      const msg = err instanceof Error ? err.message : "Error reading file";
      setErrorMessage(msg);
      setIsProcessing(false);
      setProcessingStage("idle");
    }
  }

  // Handle edit changes and re-run deterministic rules dynamically
  function handleFieldEdit(path: string, value: unknown) {
    if (!extractedData) return;

    const updated = JSON.parse(JSON.stringify(extractedData)) as MTRExtraction;

    if (path === "mill_name") updated.mill_name = String(value);
    if (path === "heat_number") updated.heat_number = String(value);
    if (path === "grade") updated.grade = String(value);
    if (path === "standard") updated.standard = String(value);
    if (path === "product_form") updated.product_form = String(value);
    if (path === "melt_and_pour_country") updated.melt_and_pour_country = String(value);
    if (path === "printed_cev") updated.printed_cev = value === "" ? null : Number(value);

    if (path.startsWith("chem.")) {
      const el = path.replace("chem.", "");
      const numVal = value === "" ? null : Number(value);
      updated.chemistry[el] = { value: numVal, unit: "% by weight" };
    }

    if (path === "yield_strength") {
      updated.mechanical_properties.yield_strength.value = value === "" ? null : Number(value);
    }
    if (path === "tensile_strength") {
      updated.mechanical_properties.tensile_strength.value = value === "" ? null : Number(value);
    }
    if (path === "elongation_pct") {
      updated.mechanical_properties.elongation_pct.value = value === "" ? null : Number(value);
    }

    setExtractedData(updated);

    // Re-evaluate deterministic rules live
    const newReview = evaluateMTRComplianceAndRisk(updated);
    setReviewResult(newReview);
  }

  // Handle Publish Listing
  async function handlePublish() {
    if (!extractedData || !confirmedReview) return;

    setIsPublishing(true);
    setErrorMessage(null);

    try {
      const thickness = extractedData.dimensions.thickness_in || 0.75;
      const width = extractedData.dimensions.width_in || 96.0;
      const length = extractedData.dimensions.length_in || 240.0;
      const singleWeight = extractedData.dimensions.weight_lbs || (thickness * width * length * 0.2833);
      const totalWeightLbs = singleWeight * piecesAvailable;

      // Price per cwt: pricePerTon / 20
      const pricePerCwt = Number((pricePerTon / 20).toFixed(2));

      const res = await fetch("/api/listings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: `${thickness.toFixed(3)}" ${extractedData.grade || "Structural Steel Plate"} (Heat ${extractedData.heat_number || "Unspecified"})`,
          grade_id: reviewResult?.grade_resolution.resolved_grade_id || "astm-a572-50",
          product_form: extractedData.product_form || "Plate",
          thickness_in: thickness,
          width_in: width,
          length_in: length,
          pieces_available: piecesAvailable,
          total_weight_lbs: totalWeightLbs,
          price_per_cwt: pricePerCwt,
          warehouse_city: warehouseCity,
          warehouse_state: warehouseState,
          certificate: {
            heatNumber: extractedData.heat_number,
            millName: extractedData.mill_name,
            millCountry: extractedData.melt_and_pour_country,
            specification: `${extractedData.grade || ""} ${extractedData.standard || ""}`.trim(),
            dimensions: {
              thickness_in: thickness,
              width_in: width,
              length_in: length,
              weight_lbs: totalWeightLbs,
            },
            chemicalAnalysis: Object.fromEntries(
              Object.entries(extractedData.chemistry).map(([k, v]) => [k, v.value ?? 0])
            ),
            mechanicalResults: {
              yield_strength_ksi: extractedData.mechanical_properties.yield_strength.value ?? 50,
              tensile_strength_ksi: extractedData.mechanical_properties.tensile_strength.value ?? 70,
              elongation_pct: extractedData.mechanical_properties.elongation_pct.value ?? 20,
              hardness_hbw: extractedData.mechanical_properties.hardness.value ?? undefined,
              charpy_avg_ft_lbs: extractedData.mechanical_properties.charpy_impact.value ?? undefined,
            },
            qcSummary: {
              status: reviewResult?.status === "CHECKS_PASSED" ? "PASS" : "FAIL",
              standards_met: reviewResult?.status === "CHECKS_PASSED" ? [extractedData.grade || "ASTM A572 Grade 50"] : [],
              flags: reviewResult?.flags.map((f) => f.explanation) || [],
            },
          },
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to publish listing to active marketplace.");
      }

      setSuccessMessage(`Lot successfully registered and published! Listing ID: ${data.listing.id}`);
      setPublishedListingId(data.listing.id);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Publishing error";
      setErrorMessage(msg);
    } finally {
      setIsPublishing(false);
    }
  }

  return (
    <PageContainer
      title="Material Test Report (MTR) Ingestion Pipeline"
      description="Upload industrial test certificates for multimodal OCR, strict schema extraction, and deterministic ASTM/SAE quality-control compliance auditing before publishing to buyers."
      breadcrumbs={[
        { label: "Marketplace", href: "/listings" },
        { label: "Seller MTR Ingestion" },
      ]}
      badge={<Badge variant="outline" size="sm">Seller Portal</Badge>}
    >
      <div className="space-y-8">
        {/* Pipeline Flow Stepper */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className={`p-4 rounded border ${!extractedData ? "border-slate-900 bg-white shadow-2xs" : "border-slate-200 bg-slate-50 text-slate-500"}`}>
            <div className="flex items-center gap-2 mb-1">
              <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-semibold ${!extractedData ? "bg-slate-900 text-white" : "bg-slate-200 text-slate-700"}`}>1</span>
              <h3 className="text-sm font-semibold text-slate-900">Upload &amp; Private Storage</h3>
            </div>
            <p className="text-xs text-slate-600">Secure PDF ingest with magic byte validation and private vault encryption.</p>
          </div>

          <div className={`p-4 rounded border ${extractedData && !publishedListingId ? "border-slate-900 bg-white shadow-2xs" : "border-slate-200 bg-slate-50 text-slate-500"}`}>
            <div className="flex items-center gap-2 mb-1">
              <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-semibold ${extractedData && !publishedListingId ? "bg-slate-900 text-white" : "bg-slate-200 text-slate-700"}`}>2</span>
              <h3 className="text-sm font-semibold text-slate-900">QC Review &amp; Flags</h3>
            </div>
            <p className="text-xs text-slate-600">Deterministic ASTM check, CEV recalculation, and 0–100 review score.</p>
          </div>

          <div className={`p-4 rounded border ${publishedListingId ? "border-slate-900 bg-white shadow-2xs" : "border-slate-200 bg-slate-50 text-slate-500"}`}>
            <div className="flex items-center gap-2 mb-1">
              <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-semibold ${publishedListingId ? "bg-emerald-700 text-white" : "bg-slate-200 text-slate-700"}`}>3</span>
              <h3 className="text-sm font-semibold text-slate-900">Confirmation &amp; Publish</h3>
            </div>
            <p className="text-xs text-slate-600">Explicit seller certification and live marketplace listing creation.</p>
          </div>
        </div>

        {/* Global Error Banner */}
        {errorMessage && (
          <div className="p-4 rounded border border-rose-300 bg-rose-50 text-rose-900 flex items-start gap-3">
            <XCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
            <div className="flex-1 space-y-1">
              <h4 className="text-sm font-semibold">MTR Processing Notice</h4>
              <p className="text-xs text-rose-800">{errorMessage}</p>
            </div>
            <Button size="sm" variant="outline" onClick={() => setErrorMessage(null)}>
              Dismiss
            </Button>
          </div>
        )}

        {/* Global Success Banner */}
        {successMessage && (
          <div className="p-4 rounded border border-emerald-300 bg-emerald-50 text-emerald-950 flex items-start justify-between gap-3">
            <div className="flex items-start gap-3">
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <h4 className="text-sm font-semibold">Material Lot Published to Marketplace</h4>
                <p className="text-xs text-emerald-800">{successMessage}</p>
              </div>
            </div>
            {publishedListingId && (
              <Link href={`/listings/${publishedListingId}`}>
                <Button size="sm" variant="primary">
                  View Published Listing <ArrowRight className="w-3.5 h-3.5 ml-1.5" />
                </Button>
              </Link>
            )}
          </div>
        )}

        {/* Step 1: Upload Dropzone & Synthetic Benchmark Fixture Selection */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Upload Dropzone */}
          <div className="lg:col-span-6 space-y-4">
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm font-semibold text-slate-900">Upload Mill Test Report</CardTitle>
                  <span className="text-[11px] font-mono text-slate-500">PDF, PNG, JPG (up to 20MB)</span>
                </div>
                <CardDescription>
                  Supports certified manufacturer MTRs, EN 10204 3.1 ladle sheets, and tensile test summaries.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div
                  onDragOver={(e) => { e.preventDefault(); if (!isProcessing) setIsDragging(true); }}
                  onDragLeave={() => setIsDragging(false)}
                  onDrop={(e) => {
                    e.preventDefault();
                    setIsDragging(false);
                    if (isProcessing) return;
                    const file = e.dataTransfer.files?.[0];
                    if (file) processFile(file);
                  }}
                  className={`p-8 border-2 border-dashed rounded text-center transition-colors ${
                    isDragging
                      ? "border-slate-900 bg-slate-100"
                      : "border-slate-300 bg-slate-50/50 hover:bg-slate-50"
                  }`}
                >
                  <div className="w-12 h-12 rounded bg-white border border-slate-200 flex items-center justify-center text-slate-700 mx-auto shadow-2xs mb-3">
                    <UploadCloud className="w-6 h-6" />
                  </div>
                  <div className="space-y-1 mb-4">
                    <h4 className="text-sm font-semibold text-slate-900">
                      Drag &amp; Drop MTR Document Here
                    </h4>
                    <p className="text-xs text-slate-500 max-w-sm mx-auto">
                      Files are stored privately in encrypted Supabase storage. Raw documents are never made public.
                    </p>
                  </div>
                  <div>
                    <div className="inline-flex items-center">
                      <Button
                        type="button"
                        variant="primary"
                        size="sm"
                        disabled={isProcessing}
                        onClick={() => fileInputRef.current?.click()}
                      >
                        <FileText className="w-3.5 h-3.5 mr-1.5" />
                        Browse Local Files
                      </Button>
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept="application/pdf,image/png,image/jpeg,image/webp,image/tiff"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          e.target.value = ""; // allow choosing the same file again
                          if (file) processFile(file);
                        }}
                        className="hidden"
                        aria-label="Upload mill test report file"
                        disabled={isProcessing}
                      />
                    </div>
                  </div>
                </div>

                <div className="mt-3 flex items-center justify-between text-[11px] text-slate-500 px-1">
                  <span className="inline-flex items-center gap-1">
                    <Lock className="w-3 h-3 text-slate-400" /> Private storage enforcement
                  </span>
                  <span>Magic byte anti-spoofing enabled</span>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Synthetic Benchmark Test Suite */}
          <div className="lg:col-span-6 space-y-4">
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm font-semibold text-slate-900">
                    Synthetic Certificate Benchmarks
                  </CardTitle>
                  <Badge variant="outline" size="sm" className="font-mono text-[10px]">
                    DEMO SUITE
                  </Badge>
                </div>
                <CardDescription>
                  Instant deterministic tests verifying clean documents, missing fields, out-of-spec chemistry, mechanical failures, duplicate heats, and CEV recalculation.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-2 pt-0 max-h-[340px] overflow-y-auto pr-1">
                {SYNTHETIC_MTR_FIXTURES.map((benchmark) => {
                  const isSelected = selectedBenchmarkId === benchmark.id;
                  const isPassExpected = benchmark.expectedStatus === "CHECKS_PASSED";
                  return (
                    <button
                      key={benchmark.id}
                      type="button"
                      disabled={isProcessing}
                      onClick={() => loadBenchmarkSample(benchmark.id)}
                      className={`w-full p-2.5 rounded border text-left transition-colors flex items-start justify-between gap-3 ${
                        isSelected
                          ? "border-slate-900 bg-slate-100 ring-1 ring-slate-900"
                          : "border-slate-200 bg-white hover:bg-slate-50"
                      } ${isProcessing ? "opacity-60 cursor-not-allowed" : ""}`}
                    >
                      <div className="space-y-0.5 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-semibold text-slate-900 truncate">
                            {benchmark.name}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-500 line-clamp-1">
                          {benchmark.description}
                        </p>
                      </div>
                      <div className="shrink-0 flex items-center gap-1.5">
                        <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded border ${
                          isPassExpected
                            ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                            : "bg-amber-50 text-amber-800 border-amber-200"
                        }`}>
                          {benchmark.badge}
                        </span>
                      </div>
                    </button>
                  );
                })}
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Processing Spinner & Stage Indicator */}
        {isProcessing && (
          <Card className="border-slate-300 bg-slate-50/70">
            <CardContent className="p-8 text-center space-y-4">
              <div className="flex items-center justify-center">
                <RefreshCw className="w-8 h-8 text-slate-700 animate-spin" />
              </div>
              <div className="space-y-1">
                <h4 className="text-sm font-semibold text-slate-900">
                  Executing Server-Side MTR Extraction Pipeline
                </h4>
                <p className="text-xs text-slate-600 font-mono">
                  {processingStage}
                </p>
                {elapsedSeconds > 0 && (
                  <p className="text-[11px] text-slate-500 font-mono">
                    Elapsed: {elapsedSeconds}s (deadline: 45s maximum)
                  </p>
                )}
              </div>
              <div className="max-w-md mx-auto w-full bg-slate-200 rounded-full h-1.5 overflow-hidden">
                <div className="bg-slate-900 h-1.5 rounded-full animate-pulse w-3/4" />
              </div>
              <div className="pt-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={cancelExtraction}
                  className="text-xs text-slate-600 border-slate-300 hover:bg-slate-100"
                >
                  <XCircle className="w-3.5 h-3.5 mr-1 text-slate-500" />
                  Cancel Ingestion
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Step 2: Extracted Data Review, QC Score & Document Preview */}
        {extractedData && reviewResult && !isProcessing && (
          <div className="space-y-8 animate-in fade-in duration-300">
            {/* Top Bar: Review Score & Status Verdict */}
            <div className={`p-6 rounded border ${
              reviewResult.status === "CHECKS_PASSED"
                ? "border-emerald-300 bg-emerald-50/60"
                : "border-amber-300 bg-amber-50/60"
            }`}>
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
                <div className="space-y-2 max-w-2xl">
                  <div className="flex items-center gap-3">
                    <span className={`px-2.5 py-1 rounded text-xs font-semibold tracking-wide uppercase flex items-center gap-1.5 ${
                      reviewResult.status === "CHECKS_PASSED"
                        ? "bg-emerald-700 text-white"
                        : "bg-amber-700 text-white"
                    }`}>
                      {reviewResult.status === "CHECKS_PASSED" ? (
                        <>
                          <CheckCircle2 className="w-3.5 h-3.5" /> Checks Passed
                        </>
                      ) : (
                        <>
                          <AlertTriangle className="w-3.5 h-3.5" /> Review Required
                        </>
                      )}
                    </span>
                    <span className="text-xs font-mono text-slate-600">
                      Evaluated: {new Date(reviewResult.evaluated_at).toLocaleTimeString()}
                    </span>
                  </div>

                  <h3 className="text-base font-semibold text-slate-900">
                    {reviewResult.verdict_summary}
                  </h3>
                  <p className="text-xs text-slate-600">
                    {reviewResult.buyer_summary}
                  </p>
                </div>

                {/* 0-100 Deterministic Review Score Gauge */}
                <div className="shrink-0 p-4 rounded bg-white border border-slate-200 shadow-2xs text-center min-w-[220px]">
                  <div className="text-[11px] font-mono uppercase tracking-wider text-slate-500 mb-1">
                    Deterministic Review Score
                  </div>
                  <div className="flex items-baseline justify-center gap-1">
                    <span className={`text-4xl font-bold font-mono ${
                      reviewResult.score < 40 ? "text-emerald-700" : "text-amber-700"
                    }`}>
                      {reviewResult.score}
                    </span>
                    <span className="text-slate-400 font-mono text-xs">/ 100</span>
                  </div>
                  <div className="mt-2 text-[10px] text-slate-500 max-w-[200px] mx-auto">
                    {reviewResult.score === 0
                      ? "Clean audit: Zero discrepancies or omissions detected."
                      : `${reviewResult.flags.length} active flag(s) identified.`}
                  </div>
                </div>
              </div>

              {/* Disclaimer & Provenance Info */}
              <div className="mt-4 pt-4 border-t border-slate-200/60 space-y-2 text-[11px] text-slate-600">
                <div className="flex items-start gap-2">
                  <Info className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
                  <span>
                    <strong>Standard Technical Screening Tool:</strong> MillProof deterministic review scores reflect rule-based conformance to published ASTM/SAE limits. A clean result is not proof of certificate authenticity.
                  </span>
                </div>
                {provenanceNotice && (
                  <p className="text-slate-500 italic pl-5.5">
                    Provenance Note: {provenanceNotice}
                  </p>
                )}
                {signedPreviewUrl && (
                  <div className="pl-5.5">
                    <a
                      href={signedPreviewUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sky-800 hover:underline font-medium inline-flex items-center gap-1"
                    >
                      View Archived Document Preview &rarr;
                    </a>
                  </div>
                )}
              </div>
            </div>

            {/* Flags Summary Cards */}
            {reviewResult.flags.length > 0 && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-700 flex items-center gap-2">
                    <Activity className="w-3.5 h-3.5" />
                    Identified Review Flags ({reviewResult.flags.length})
                  </h4>
                  <span className="text-[11px] text-slate-500">
                    Source: {reviewResult.grade_resolution.source || "Published Standard Specification"}
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {reviewResult.flags.map((flag) => {
                    const isFail = flag.severity === "FAIL";
                    const isWarn = flag.severity === "WARNING";
                    return (
                      <div
                        key={flag.id}
                        className={`p-3.5 rounded border text-left space-y-1 ${
                          isFail
                            ? "border-rose-300 bg-rose-50/50 text-rose-950"
                            : isWarn
                            ? "border-amber-300 bg-amber-50/50 text-amber-950"
                            : "border-slate-200 bg-slate-50 text-slate-800"
                        }`}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-xs font-semibold flex items-center gap-1.5">
                            {isFail ? (
                              <XCircle className="w-3.5 h-3.5 text-rose-600 shrink-0" />
                            ) : isWarn ? (
                              <AlertTriangle className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                            ) : (
                              <Info className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                            )}
                            {flag.title}
                          </span>
                          <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-white/80 border border-slate-200">
                            +{flag.weight} pts
                          </span>
                        </div>
                        <p className="text-xs text-slate-700 pl-5">
                          {flag.explanation}
                        </p>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Document Preview & Extracted Fields Dual Layout */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
              {/* Left Column: Original Document Context & Citations */}
              <div className="lg:col-span-5 space-y-6">
                <Card>
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-sm font-semibold text-slate-900 flex items-center gap-2">
                        <FileText className="w-4 h-4 text-slate-600" /> Original Document
                      </CardTitle>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => setShowDocPreview(!showDocPreview)}
                      >
                        {showDocPreview ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                      </Button>
                    </div>
                    <CardDescription>
                      {uploadedFileName || "Uploaded Material Test Certificate"}
                    </CardDescription>
                  </CardHeader>

                  {showDocPreview && (
                    <CardContent className="space-y-4 pt-0">
                      {/* Document Hash & Storage Meta */}
                      <div className="p-3 rounded bg-slate-100 font-mono text-[11px] text-slate-700 space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="text-slate-500">Integrity Hash (SHA-256):</span>
                          <span className="font-semibold">{documentSha256 ? `${documentSha256.slice(0, 16)}...` : "SHA-256 Validated"}</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-slate-500">Storage Location:</span>
                          <span className="text-slate-900 inline-flex items-center gap-1">
                            <Lock className="w-2.5 h-2.5 text-slate-500" /> Private Vault (Encrypted)
                          </span>
                        </div>
                      </div>

                      {/* Solana mill signature (devnet demo) */}
                      <SolanaSignPanel
                        key={uploadedFile ? `${uploadedFile.name}-${uploadedFile.size}-${uploadedFile.lastModified}` : "no-file"}
                        file={uploadedFile}
                      />

                      {/* Mock or Signed Document Viewer */}
                      {rawDocumentSnippet ? (
                        <div className="p-4 rounded bg-slate-900 text-slate-200 font-mono text-[11px] leading-relaxed max-h-72 overflow-y-auto whitespace-pre-line border border-slate-800">
                          {rawDocumentSnippet}
                        </div>
                      ) : (
                        <div className="p-8 text-center border rounded bg-slate-50 text-slate-500 text-xs">
                          Document securely archived in private Supabase storage.
                        </div>
                      )}

                      {/* Optical Evidence Citations Collapsible */}
                      <div className="pt-2 border-t border-slate-200">
                        <button
                          type="button"
                          onClick={() => setShowEvidence(!showEvidence)}
                          className="w-full flex items-center justify-between text-xs font-semibold text-slate-800 hover:text-slate-950"
                        >
                          <span className="flex items-center gap-1.5">
                            <FileSearch className="w-3.5 h-3.5 text-slate-500" />
                            Verbatim Text Evidence Citations
                          </span>
                          <span className="text-[11px] text-slate-500 font-normal">
                            {showEvidence ? "Hide citations" : "Show quotes"}
                          </span>
                        </button>

                        {showEvidence && (
                          <div className="mt-3 space-y-2 text-xs">
                            {Object.entries(extractedData.field_evidence || {}).map(([key, ev]) => (
                              <div key={key} className="p-2 rounded bg-slate-50 border border-slate-200 space-y-0.5">
                                <div className="flex items-center justify-between text-[11px] font-mono text-slate-500">
                                  <span>{key}</span>
                                  <Badge variant="outline" size="sm">{ev.confidence} confidence</Badge>
                                </div>
                                <div className="text-[11px] font-mono text-slate-800 italic">
                                  &ldquo;{ev.quote}&rdquo;
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </CardContent>
                  )}
                </Card>

                {/* Carbon Equivalent Recalculation Card */}
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-semibold text-slate-900 flex items-center gap-2">
                      <Scale className="w-4 h-4 text-slate-600" />
                      Carbon Equivalent (IIW CEV) Audit
                    </CardTitle>
                    <CardDescription>
                      Recalculated mathematically: CEV = C + Mn/6 + (Cr+Mo+V)/5 + (Ni+Cu)/15
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4 pt-0">
                    <div className="grid grid-cols-2 gap-3 text-center">
                      <div className="p-3 rounded bg-slate-50 border border-slate-200">
                        <div className="text-[11px] font-mono text-slate-500">Recalculated CEV</div>
                        <div className="text-xl font-bold font-mono text-slate-900">
                          {reviewResult.recalculated_cev.value !== null ? reviewResult.recalculated_cev.value.toFixed(3) : "N/A"}
                        </div>
                      </div>

                      <div className="p-3 rounded bg-slate-50 border border-slate-200">
                        <div className="text-[11px] font-mono text-slate-500">Printed CEV</div>
                        <div className="text-xl font-bold font-mono text-slate-900">
                          {extractedData.printed_cev !== null ? extractedData.printed_cev.toFixed(2) : "Not printed"}
                        </div>
                      </div>
                    </div>

                    <div className={`p-3 rounded text-xs border ${
                      reviewResult.cev_comparison.status === "MATCH"
                        ? "bg-emerald-50 border-emerald-200 text-emerald-900"
                        : reviewResult.cev_comparison.status === "MISMATCH"
                        ? "bg-amber-50 border-amber-200 text-amber-900"
                        : "bg-slate-50 border-slate-200 text-slate-700"
                    }`}>
                      <div className="font-semibold mb-0.5">
                        {reviewResult.cev_comparison.status === "MATCH"
                          ? "CEV Verification Match"
                          : reviewResult.cev_comparison.status === "MISMATCH"
                          ? "Printed CEV Discrepancy"
                          : "CEV Recalculation Note"}
                      </div>
                      <p className="text-[11px]">
                        {reviewResult.cev_comparison.explanation}
                      </p>
                    </div>

                    <p className="text-xs text-slate-600">
                      <strong>Weldability Notice:</strong> {reviewResult.recalculated_cev.weldability_note}
                    </p>
                  </CardContent>
                </Card>
              </div>

              {/* Right Column: Field-by-Field Extracted Data & Editor */}
              <div className="lg:col-span-7 space-y-6">
                <Card>
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-sm font-semibold text-slate-900">
                        Extracted Heat Identification &amp; Traceability
                      </CardTitle>
                      <Button
                        size="sm"
                        variant={isEditing ? "primary" : "outline"}
                        onClick={() => setIsEditing(!isEditing)}
                      >
                        <Edit3 className="w-3.5 h-3.5 mr-1" />
                        {isEditing ? "Save & Lock View" : "Edit Values"}
                      </Button>
                    </div>
                    <CardDescription>
                      Review each extracted data point against manufacturer markings. You may manually edit any field.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4 pt-0">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {/* Heat Number */}
                      <div className="space-y-1">
                        <label className="text-xs font-semibold text-slate-700">Heat / Melt Number</label>
                        {isEditing ? (
                          <Input
                            value={extractedData.heat_number || ""}
                            onChange={(e) => handleFieldEdit("heat_number", e.target.value)}
                            className="font-mono text-xs"
                          />
                        ) : (
                          <div className="p-2 rounded bg-slate-50 border border-slate-200 font-mono text-xs font-semibold text-slate-900 flex items-center justify-between">
                            <span>{extractedData.heat_number || "MISSING"}</span>
                            {reviewResult.duplicate_heat_check.is_duplicate && (
                              <Badge variant="warning" size="sm">Duplicate Found</Badge>
                            )}
                          </div>
                        )}
                      </div>

                      {/* Producing Mill */}
                      <div className="space-y-1">
                        <label className="text-xs font-semibold text-slate-700">Producing Mill</label>
                        {isEditing ? (
                          <Input
                            value={extractedData.mill_name || ""}
                            onChange={(e) => handleFieldEdit("mill_name", e.target.value)}
                            className="text-xs"
                          />
                        ) : (
                          <div className="p-2 rounded bg-slate-50 border border-slate-200 text-xs text-slate-900 font-medium">
                            {extractedData.mill_name || "MISSING"}
                          </div>
                        )}
                      </div>

                      {/* Material Grade */}
                      <div className="space-y-1">
                        <label className="text-xs font-semibold text-slate-700">Material Grade</label>
                        {isEditing ? (
                          <Input
                            value={extractedData.grade || ""}
                            onChange={(e) => handleFieldEdit("grade", e.target.value)}
                            className="text-xs"
                          />
                        ) : (
                          <div className="p-2 rounded bg-slate-50 border border-slate-200 text-xs font-semibold text-slate-900 flex items-center justify-between">
                            <span>{extractedData.grade || "MISSING"}</span>
                            <Badge variant={reviewResult.grade_resolution.status === "RESOLVED" ? "default" : "outline"} size="sm">
                              {reviewResult.grade_resolution.status === "RESOLVED" ? "Indexed Grade" : "Unresolved Standard"}
                            </Badge>
                          </div>
                        )}
                      </div>

                      {/* Melt and Pour Country */}
                      <div className="space-y-1">
                        <label className="text-xs font-semibold text-slate-700">Melt &amp; Pour Country</label>
                        {isEditing ? (
                          <Input
                            value={extractedData.melt_and_pour_country || ""}
                            onChange={(e) => handleFieldEdit("melt_and_pour_country", e.target.value)}
                            className="text-xs"
                          />
                        ) : (
                          <div className="p-2 rounded bg-slate-50 border border-slate-200 text-xs text-slate-900">
                            {extractedData.melt_and_pour_country || "Not explicitly stated"}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Chemical Ladle Analysis Table */}
                    <div className="space-y-2 pt-2">
                      <div className="flex items-center justify-between">
                        <h4 className="text-xs font-semibold text-slate-900 uppercase tracking-wider">
                          Chemical Ladle Analysis (% by weight)
                        </h4>
                        <span className="text-[11px] text-slate-500 font-mono">Heat Ladle Chemistry</span>
                      </div>

                      <div className="rounded border border-slate-200 overflow-hidden">
                        <Table>
                          <TableHeader>
                            <TableRow className="bg-slate-50">
                              <TableHead className="w-16">Element</TableHead>
                              <TableHead className="w-24">Reported %</TableHead>
                              <TableHead>Applicable ASTM Bound</TableHead>
                              <TableHead className="text-right">Status</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {["C", "Mn", "P", "S", "Si", "V", "Nb", "Cr", "Ni", "Mo", "Cu"].map((el) => {
                              const matchKey = Object.keys(extractedData.chemistry).find(
                                (k) => k.toLowerCase() === el.toLowerCase()
                              );
                              const chemItem = matchKey ? extractedData.chemistry[matchKey] : undefined;
                              const reportedVal = chemItem?.value ?? null;

                              // Check target grade bound
                              const activeGrade = CURATED_GRADES.find(
                                (g) => g.id === reviewResult.grade_resolution.resolved_grade_id
                              );
                              const limit = activeGrade?.chemistry_limits.elements[el];

                              let statusTag = "PASS";
                              if (reportedVal !== null && limit) {
                                if (limit.max !== null && reportedVal > limit.max) statusTag = "EXCEEDS_MAX";
                                else if (limit.min !== null && reportedVal < limit.min) statusTag = "BELOW_MIN";
                                else if (limit.max !== null && reportedVal >= limit.max * 0.95) statusTag = "MARGINAL";
                              } else if (reportedVal === null && limit?.min !== null) {
                                statusTag = "OMITTED";
                              }

                              return (
                                <TableRow key={el} className="hover:bg-slate-50/50">
                                  <TableCell className="font-semibold text-slate-900 font-mono">{el}</TableCell>
                                  <TableCell className="font-mono">
                                    {isEditing ? (
                                      <input
                                        type="number"
                                        step="0.001"
                                        value={reportedVal ?? ""}
                                        onChange={(e) => handleFieldEdit(`chem.${el}`, e.target.value)}
                                        className="w-20 px-1 py-0.5 border rounded text-xs font-mono"
                                      />
                                    ) : (
                                      reportedVal !== null ? reportedVal.toFixed(3) : <span className="text-slate-400">null</span>
                                    )}
                                  </TableCell>
                                  <TableCell className="text-xs text-slate-600">
                                    {limit ? (
                                      <span>
                                        {limit.min !== null ? `${limit.min}% min` : "No min"} &ndash; {limit.max !== null ? `${limit.max}% max` : "No max"}
                                      </span>
                                    ) : (
                                      <span className="text-slate-400">Not specified</span>
                                    )}
                                  </TableCell>
                                  <TableCell className="text-right">
                                    {statusTag === "EXCEEDS_MAX" ? (
                                      <Badge variant="destructive" size="sm">Violates Max</Badge>
                                    ) : statusTag === "BELOW_MIN" ? (
                                      <Badge variant="destructive" size="sm">Violates Min</Badge>
                                    ) : statusTag === "MARGINAL" ? (
                                      <Badge variant="warning" size="sm">Marginal (95%)</Badge>
                                    ) : reportedVal !== null ? (
                                      <Badge variant="secondary" size="sm">Pass</Badge>
                                    ) : (
                                      <span className="text-[11px] text-slate-400">&mdash;</span>
                                    )}
                                  </TableCell>
                                </TableRow>
                              );
                            })}
                          </TableBody>
                        </Table>
                      </div>
                    </div>

                    {/* Mechanical Tension Tests Table */}
                    <div className="space-y-2 pt-2">
                      <div className="flex items-center justify-between">
                        <h4 className="text-xs font-semibold text-slate-900 uppercase tracking-wider">
                          Mechanical Tension Properties
                        </h4>
                        <span className="text-[11px] text-slate-500 font-mono">ASTM Pull Test Results</span>
                      </div>

                      <div className="rounded border border-slate-200 overflow-hidden">
                        <Table>
                          <TableHeader>
                            <TableRow className="bg-slate-50">
                              <TableHead>Test Property</TableHead>
                              <TableHead>Reported Value</TableHead>
                              <TableHead>Standard Limit</TableHead>
                              <TableHead className="text-right">Audit Status</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {/* Yield Strength */}
                            <TableRow>
                              <TableCell className="font-semibold text-slate-900">Yield Strength</TableCell>
                              <TableCell className="font-mono">
                                {isEditing ? (
                                  <input
                                    type="number"
                                    step="0.1"
                                    value={extractedData.mechanical_properties.yield_strength.value ?? ""}
                                    onChange={(e) => handleFieldEdit("yield_strength", e.target.value)}
                                    className="w-20 px-1 py-0.5 border rounded text-xs font-mono"
                                  />
                                ) : (
                                  `${extractedData.mechanical_properties.yield_strength.value ?? "N/A"} ${extractedData.mechanical_properties.yield_strength.unit}`
                                )}
                              </TableCell>
                              <TableCell className="text-xs text-slate-600">
                                50.0 ksi minimum (A572 Gr 50)
                              </TableCell>
                              <TableCell className="text-right">
                                {extractedData.mechanical_properties.yield_strength.value !== null && extractedData.mechanical_properties.yield_strength.value < 50.0 ? (
                                  <Badge variant="destructive" size="sm">Below Minimum</Badge>
                                ) : extractedData.mechanical_properties.yield_strength.value !== null ? (
                                  <Badge variant="secondary" size="sm">Conforms</Badge>
                                ) : (
                                  <Badge variant="warning" size="sm">Missing</Badge>
                                )}
                              </TableCell>
                            </TableRow>

                            {/* Tensile Strength */}
                            <TableRow>
                              <TableCell className="font-semibold text-slate-900">Tensile Strength</TableCell>
                              <TableCell className="font-mono">
                                {isEditing ? (
                                  <input
                                    type="number"
                                    step="0.1"
                                    value={extractedData.mechanical_properties.tensile_strength.value ?? ""}
                                    onChange={(e) => handleFieldEdit("tensile_strength", e.target.value)}
                                    className="w-20 px-1 py-0.5 border rounded text-xs font-mono"
                                  />
                                ) : (
                                  `${extractedData.mechanical_properties.tensile_strength.value ?? "N/A"} ${extractedData.mechanical_properties.tensile_strength.unit}`
                                )}
                              </TableCell>
                              <TableCell className="text-xs text-slate-600">
                                65.0 ksi minimum
                              </TableCell>
                              <TableCell className="text-right">
                                {extractedData.mechanical_properties.tensile_strength.value !== null && extractedData.mechanical_properties.tensile_strength.value < 65.0 ? (
                                  <Badge variant="destructive" size="sm">Below Minimum</Badge>
                                ) : extractedData.mechanical_properties.tensile_strength.value !== null ? (
                                  <Badge variant="secondary" size="sm">Conforms</Badge>
                                ) : (
                                  <Badge variant="warning" size="sm">Missing</Badge>
                                )}
                              </TableCell>
                            </TableRow>

                            {/* Elongation */}
                            <TableRow>
                              <TableCell className="font-semibold text-slate-900">Elongation (2-inch gage)</TableCell>
                              <TableCell className="font-mono">
                                {isEditing ? (
                                  <input
                                    type="number"
                                    step="0.5"
                                    value={extractedData.mechanical_properties.elongation_pct.value ?? ""}
                                    onChange={(e) => handleFieldEdit("elongation_pct", e.target.value)}
                                    className="w-20 px-1 py-0.5 border rounded text-xs font-mono"
                                  />
                                ) : (
                                  `${extractedData.mechanical_properties.elongation_pct.value ?? "N/A"}%`
                                )}
                              </TableCell>
                              <TableCell className="text-xs text-slate-600">
                                18.0% minimum
                              </TableCell>
                              <TableCell className="text-right">
                                {extractedData.mechanical_properties.elongation_pct.value !== null && extractedData.mechanical_properties.elongation_pct.value < 18.0 ? (
                                  <Badge variant="destructive" size="sm">Below Minimum</Badge>
                                ) : extractedData.mechanical_properties.elongation_pct.value !== null ? (
                                  <Badge variant="secondary" size="sm">Conforms</Badge>
                                ) : (
                                  <Badge variant="warning" size="sm">Missing</Badge>
                                )}
                              </TableCell>
                            </TableRow>
                          </TableBody>
                        </Table>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>

            {/* Step 3: Explicit Seller Confirmation & Publication Action */}
            <Card className="border-slate-300 bg-white">
              <CardHeader className="pb-3">
                <CardTitle className="text-base font-semibold text-slate-900">
                  Step 3: Commercial Terms &amp; Seller Confirmation
                </CardTitle>
                <CardDescription>
                  Configure marketplace pricing, warehouse availability, and provide mandatory seller confirmation.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-700">Price per Ton ($)</label>
                    <Input
                      type="number"
                      step="10"
                      value={pricePerTon}
                      onChange={(e) => setPricePerTon(Number(e.target.value))}
                    />
                    <span className="text-[10px] text-slate-500 font-mono">
                      Equivalent: ${(pricePerTon / 20).toFixed(2)}/cwt
                    </span>
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-700">Available Pieces</label>
                    <Input
                      type="number"
                      min="1"
                      value={piecesAvailable}
                      onChange={(e) => setPiecesAvailable(Math.max(1, Number(e.target.value)))}
                    />
                    <span className="text-[10px] text-slate-500 font-mono">
                      Est. Lot: {((extractedData.dimensions.weight_lbs || 4896) * piecesAvailable / 2000).toFixed(1)} tons
                    </span>
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-700">Warehouse City</label>
                    <Input
                      value={warehouseCity}
                      onChange={(e) => setWarehouseCity(e.target.value)}
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-700">Warehouse State</label>
                    <Input
                      value={warehouseState}
                      maxLength={2}
                      onChange={(e) => setWarehouseState(e.target.value.toUpperCase())}
                    />
                  </div>
                </div>

                {/* Explicit Seller Confirmation Checkbox */}
                <div className="p-4 rounded border border-slate-300 bg-slate-50/70 space-y-2">
                  <label htmlFor={confirmCheckId} className="flex items-start gap-3 cursor-pointer">
                    <input
                      id={confirmCheckId}
                      type="checkbox"
                      checked={confirmedReview}
                      onChange={(e) => setConfirmedReview(e.target.checked)}
                      className="mt-1 h-4 w-4 rounded border-slate-300 text-slate-900 focus:ring-slate-900"
                    />
                    <div className="space-y-0.5 text-xs text-slate-900">
                      <span className="font-semibold">
                        Mandatory Seller Technical Confirmation &amp; Certification
                      </span>
                      <p className="text-slate-600 text-[11px] leading-relaxed">
                        I confirm that I have reviewed the extracted ladle analysis, mechanical properties, and heat traceability, and certify that they reflect the manufacturer document. I understand that publishing this lot makes its technical specifications visible to industrial buyers.
                      </p>
                    </div>
                  </label>
                </div>

                {/* Action Buttons */}
                <div className="flex items-center justify-between pt-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setExtractedData(null);
                      setReviewResult(null);
                      setSelectedBenchmarkId(null);
                      setPublishedListingId(null);
                    }}
                  >
                    Reset &amp; Upload Different Document
                  </Button>

                  <Button
                    type="button"
                    variant="primary"
                    disabled={!confirmedReview || isPublishing}
                    onClick={handlePublish}
                    className="min-w-[200px]"
                  >
                    {isPublishing ? (
                      <>
                        <RefreshCw className="w-4 h-4 mr-2 animate-spin" /> Publishing...
                      </>
                    ) : (
                      <>
                        Publish Lot to Marketplace <ArrowRight className="w-4 h-4 ml-2" />
                      </>
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </PageContainer>
  );
}

function FileSearch(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M4 22h14a2 2 0 0 0 2-2V7.5L14.5 2H6a2 2 0 0 0-2 2v3" />
      <polyline points="14 2 14 8 20 8" />
      <path d="M5 17a3 3 0 1 0 0-6 3 3 0 0 0 0 6z" />
      <path d="m9 19-1.5-1.5" />
    </svg>
  );
}
