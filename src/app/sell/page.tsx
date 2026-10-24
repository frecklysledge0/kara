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
  ArrowRight, 
  RefreshCw,
  Scale,
  Check,
  Building2,
  Info
} from "lucide-react";
import { PageContainer } from "@/components/layout/PageContainer";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/Table";
import { ALL_GRADE_STANDARDS, GRADE_STANDARDS_REGISTRY } from "@/lib/data/standards";
import { ChemicalAnalysis, MechanicalResults, MTRQCSummary, GradeStandard } from "@/types/steel";

export default function SellPage() {
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
        body: JSON.stringify({ sampleId, standardGradeId: targetGradeId }),
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
              standardGradeId: targetGradeId,
            }),
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
          certificate: extractedData,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to publish listing");
      }

      setSuccessMessage("Material lot successfully certified and published to the active marketplace!");
      setPublishedListingId(data.listing.id);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to publish listing";
      setErrorMessage(msg);
    } finally {
      setIsPublishing(false);
    }
  }

  return (
    <PageContainer
      title="Sell Materials &amp; MTR Ingestion"
      description="Upload Mill Test Reports (EN 10204 3.1) for automated extraction and deterministic ASTM compliance auditing before publishing to buyers."
      badge={<Badge variant="outline" size="sm">Supplier Portal</Badge>}
    >
      <div className="space-y-8">
        {/* Step 1: Upload or Benchmark Sample Selection */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Upload Dropzone */}
          <div className="lg:col-span-6 space-y-4">
            <Card>
              <CardContent className="p-8 border-2 border-dashed border-slate-300 rounded text-center space-y-4 bg-slate-50/50">
                <div className="w-12 h-12 rounded bg-white border border-slate-200 flex items-center justify-center text-slate-700 mx-auto shadow-2xs">
                  <UploadCloud className="w-6 h-6" />
                </div>
                <div className="space-y-1">
                  <h3 className="text-sm font-semibold text-slate-900">
                    Upload Mill Test Certificate (PDF or Image)
                  </h3>
                  <p className="text-xs text-slate-500 max-w-xs mx-auto">
                    Supports EN 10204 3.1 &amp; 3.2 mill certificates and ladle analysis sheets up to 10MB.
                  </p>
                </div>
                <div>
                  <label className="cursor-pointer inline-flex items-center gap-2">
                    <Button type="button" variant="primary" size="sm">
                      <FileText className="w-3.5 h-3.5 mr-1" />
                      Select MTR Document
                    </Button>
                    <input
                      type="file"
                      accept="application/pdf,image/*"
                      onChange={handleFileUpload}
                      className="hidden"
                      disabled={isProcessing}
                    />
                  </label>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Quick Benchmark Samples */}
          <div className="lg:col-span-6 space-y-4">
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm">Or Test With Benchmark Samples</CardTitle>
                  <span className="text-[11px] text-slate-500 font-mono">Instant Demo Audit</span>
                </div>
                <CardDescription>
                  Select a pre-validated test certificate with realistic ladle analysis and tensile properties.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-2.5 pt-0">
                {/* Sample 1 */}
                <button
                  type="button"
                  onClick={() => loadSample("sample-a572-pass")}
                  className={`w-full p-3 rounded border text-left transition-colors ${
                    selectedSample === "sample-a572-pass"
                      ? "border-slate-900 bg-slate-100"
                      : "border-slate-200 bg-white hover:bg-slate-50"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-slate-900">
                      Burns Harbor ASTM A572 Gr 50 Plate
                    </span>
                    <Badge variant="success" size="sm">Compliant</Badge>
                  </div>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Heat H-784291 &bull; 0.750&quot; Plate &bull; Yield 54.8 ksi &bull; Low CEV 0.385
                  </p>
                </button>

                {/* Sample 2 */}
                <button
                  type="button"
                  onClick={() => loadSample("sample-a514-qt")}
                  className={`w-full p-3 rounded border text-left transition-colors ${
                    selectedSample === "sample-a514-qt"
                      ? "border-slate-900 bg-slate-100"
                      : "border-slate-200 bg-white hover:bg-slate-50"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-slate-900">
                      Coatesville ASTM A514 (T-1) Quenched &amp; Tempered
                    </span>
                    <Badge variant="secondary" size="sm">100 ksi Yield</Badge>
                  </div>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Heat H-643810 &bull; 0.500&quot; Plate &bull; Yield 108.5 ksi &bull; Full alloy Cr-Mo-B
                  </p>
                </button>

                {/* Sample 3 */}
                <button
                  type="button"
                  onClick={() => loadSample("sample-flagged")}
                  className={`w-full p-3 rounded border text-left transition-colors ${
                    selectedSample === "sample-flagged"
                      ? "border-rose-700 bg-rose-50"
                      : "border-slate-200 bg-white hover:bg-slate-50"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-slate-900">
                      Out-of-Spec Test Batch (Failure Demo)
                    </span>
                    <Badge variant="destructive" size="sm">QC Flags</Badge>
                  </div>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Carbon 0.27% exceeds 0.23% max &bull; Yield 48.2 ksi under 50 ksi &bull; Auto-flagged
                  </p>
                </button>

                <div className="pt-2 border-t border-slate-100">
                  <Select
                    label="Governing Specification:"
                    value={targetGradeId}
                    onChange={(e) => setTargetGradeId(e.target.value)}
                  >
                    {ALL_GRADE_STANDARDS.map((g) => (
                      <option key={g.id} value={g.id}>
                        {g.standard_org} {g.grade_name} ({g.category})
                      </option>
                    ))}
                  </Select>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Loading State */}
        {isProcessing && (
          <Card>
            <CardContent className="p-8 text-center space-y-3">
              <RefreshCw className="w-8 h-8 text-slate-700 animate-spin mx-auto" />
              <h4 className="text-sm font-semibold text-slate-900">Extracting &amp; Validating Material Certificate...</h4>
              <p className="text-xs text-slate-500">
                Running server-side OCR extraction &bull; Checking chemical bounds &bull; Validating mechanical pull tests
              </p>
            </CardContent>
          </Card>
        )}

        {/* Error Notice */}
        {errorMessage && (
          <div className="p-4 rounded border border-rose-200 bg-rose-50 text-rose-800 text-xs flex items-center gap-2">
            <XCircle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Success Notice */}
        {successMessage && (
          <div className="p-4 rounded border border-emerald-200 bg-emerald-50 text-emerald-900 text-xs space-y-2">
            <div className="flex items-center gap-2 font-semibold">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{successMessage}</span>
            </div>
            {publishedListingId && (
              <Link href={`/listings/${publishedListingId}`} className="text-emerald-800 font-bold underline block">
                View Published Listing Details
              </Link>
            )}
          </div>
        )}

        {/* Step 2: Interactive QC Workbench */}
        {extractedData && qcSummary && (
          <div className="space-y-6 animate-in fade-in duration-200">
            {/* Status Summary */}
            <Card>
              <CardHeader>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="flex items-center gap-3">
                    {qcSummary.status === "PASS" ? (
                      <div className="w-9 h-9 rounded bg-emerald-100 text-emerald-800 flex items-center justify-center">
                        <CheckCircle2 className="w-5 h-5" />
                      </div>
                    ) : (
                      <div className="w-9 h-9 rounded bg-rose-100 text-rose-800 flex items-center justify-center">
                        <AlertTriangle className="w-5 h-5" />
                      </div>
                    )}
                    <div>
                      <div className="flex items-center gap-2">
                        <CardTitle className="text-base">
                          {extractedData.millName} &bull; Heat {extractedData.heatNumber}
                        </CardTitle>
                        <Badge
                          variant={qcSummary.status === "PASS" ? "success" : "destructive"}
                          size="sm"
                        >
                          {qcSummary.status === "PASS" ? "ASTM Compliant" : "Out-of-Spec Flags"}
                        </Badge>
                      </div>
                      <CardDescription>
                        Specification: <strong>{extractedData.specification}</strong> against standard <strong>{activeStandard?.grade_name}</strong>
                      </CardDescription>
                    </div>
                  </div>

                  <div className="text-right">
                    <span className="text-[10px] text-slate-500 uppercase font-mono block">Carbon Equivalent</span>
                    <span className="text-base font-bold font-mono text-slate-900">
                      CEV {extractedData.chemicalAnalysis.CEV ?? "0.385"}
                    </span>
                  </div>
                </div>
              </CardHeader>

              {qcSummary.flags.length > 0 && (
                <CardContent className="pt-0">
                  <div className="p-3 rounded border border-rose-200 bg-rose-50 text-xs text-rose-900 space-y-1">
                    <span className="font-semibold block uppercase text-[10px] font-mono">Quality Control Flags:</span>
                    <ul className="space-y-0.5 text-[11px]">
                      {qcSummary.flags.map((flag, idx) => (
                        <li key={idx}>&bull; {flag}</li>
                      ))}
                    </ul>
                  </div>
                </CardContent>
              )}
            </Card>

            {/* Chemical Tolerances Table */}
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Chemical Ladle Analysis vs. ASTM Standard</CardTitle>
                <CardDescription>
                  Pure deterministic numerical boundary check against published standard specification.
                </CardDescription>
              </CardHeader>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <tr>
                      <TableHead>Element</TableHead>
                      <TableHead>MTR Measured %</TableHead>
                      <TableHead>Specified Min %</TableHead>
                      <TableHead>Specified Max %</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Audit Evaluation</TableHead>
                    </tr>
                  </TableHeader>
                  <TableBody>
                    {qcSummary.chemistry_checks?.map((check) => (
                      <TableRow key={check.element}>
                        <TableCell className="font-bold text-slate-900 font-mono">{check.element}</TableCell>
                        <TableCell className="font-mono font-semibold text-slate-900">{check.actual.toFixed(3)}%</TableCell>
                        <TableCell className="font-mono text-slate-500">{check.min !== undefined ? `${check.min.toFixed(3)}%` : "-"}</TableCell>
                        <TableCell className="font-mono text-slate-500">{check.max !== undefined ? `${check.max.toFixed(3)}%` : "-"}</TableCell>
                        <TableCell>
                          <Badge
                            variant={
                              check.status === "PASS"
                                ? "success"
                                : check.status === "MARGINAL"
                                ? "warning"
                                : "destructive"
                            }
                            size="sm"
                          >
                            {check.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-slate-600 text-[11px]">
                          {check.note || "Within specified ASTM tolerance band"}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>

            {/* Mechanical Results */}
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Mechanical Tension &amp; Elongation Pull Tests</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  {qcSummary.mechanical_checks?.map((check, idx) => (
                    <div key={idx} className="p-3.5 rounded border border-slate-200 bg-slate-50">
                      <div className="flex items-center justify-between text-xs text-slate-500 font-mono mb-1">
                        <span>{check.property}</span>
                        <Badge variant={check.status === "PASS" ? "success" : "destructive"} size="sm">
                          {check.status}
                        </Badge>
                      </div>
                      <div className="text-2xl font-bold font-mono text-slate-900">
                        {check.actual} <span className="text-xs font-normal text-slate-500">{check.unit}</span>
                      </div>
                      <p className="text-[11px] text-slate-500 font-mono mt-1">
                        Limit: {check.min !== undefined ? `${check.min} min` : ""} {check.max !== undefined ? `to ${check.max} max` : ""} {check.unit}
                      </p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Step 3: Marketplace Publication Card */}
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Publish Verified Lot to Marketplace</CardTitle>
                <CardDescription>
                  Enter commercial base pricing and inventory quantities. Delivered freight is calculated automatically for buyers.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                  <div>
                    <Input
                      label="Base Price ($ / cwt)"
                      type="number"
                      step="0.5"
                      value={pricePerCwt}
                      onChange={(e) => setPricePerCwt(parseFloat(e.target.value) || 0)}
                      helperText={`= $${(pricePerCwt * 20).toFixed(2)}/short ton`}
                    />
                  </div>
                  <div>
                    <Input
                      label="Available Pieces"
                      type="number"
                      min="1"
                      value={piecesAvailable}
                      onChange={(e) => setPiecesAvailable(parseInt(e.target.value, 10) || 1)}
                      helperText={`Total: ${(extractedData.dimensions.weight_lbs * piecesAvailable).toLocaleString()} lbs`}
                    />
                  </div>
                  <div>
                    <Input
                      label="Warehouse City"
                      value={warehouseCity}
                      onChange={(e) => setWarehouseCity(e.target.value)}
                    />
                  </div>
                  <div>
                    <Input
                      label="State"
                      value={warehouseState}
                      onChange={(e) => setWarehouseState(e.target.value)}
                    />
                  </div>
                </div>

                <div className="pt-3 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <label className="flex items-center gap-2.5 text-xs text-slate-700 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={confirmedReview}
                      onChange={(e) => setConfirmedReview(e.target.checked)}
                      className="w-4 h-4 rounded border-slate-300 text-slate-900 focus:ring-slate-900"
                    />
                    <span>
                      I confirm that I have reviewed the extracted ladle chemistry and mechanical test results against the manufacturer MTR document.
                    </span>
                  </label>

                  <Button
                    variant="primary"
                    size="md"
                    onClick={handlePublish}
                    disabled={!confirmedReview || isPublishing || qcSummary.status === "FAIL"}
                    isLoading={isPublishing}
                  >
                    <Check className="w-3.5 h-3.5 mr-1" />
                    <span>{qcSummary.status === "FAIL" ? "Cannot Publish (QC Violation)" : "Publish Material Lot"}</span>
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
