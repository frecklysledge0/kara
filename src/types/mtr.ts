import { z } from "zod";

// =====================================================================
// MillProof: MTR (Material Test Report) Types & Validation Schemas
// Follows EN 10204 3.1 / ASTM A6 / ASME Section II specifications.
// =====================================================================

export const ChemicalElementValueSchema = z.object({
  value: z.number().nullable(),
  unit: z.string().default("% by weight"),
});
export type ChemicalElementValue = z.infer<typeof ChemicalElementValueSchema>;

export const MechanicalPropertyValueSchema = z.object({
  value: z.number().nullable(),
  unit: z.string().default("ksi"),
  test_context: z.string().nullable().optional(),
});
export type MechanicalPropertyValue = z.infer<typeof MechanicalPropertyValueSchema>;

export const FieldEvidenceSchema = z.object({
  quote: z.string().nullable().optional(),
  page: z.number().nullable().optional(),
  confidence: z.enum(["high", "medium", "low", "uncertain"]).default("high"),
});
export type FieldEvidence = z.infer<typeof FieldEvidenceSchema>;

export const MTRExtractionSchema = z.object({
  mill_name: z.string().nullable(),
  heat_number: z.string().nullable(),
  grade: z.string().nullable(),
  standard: z.string().nullable(),
  product_form: z.string().nullable(),
  melt_and_pour_country: z.string().nullable(),
  chemistry: z.record(z.string(), ChemicalElementValueSchema).default({}),
  mechanical_properties: z.object({
    yield_strength: MechanicalPropertyValueSchema.default({ value: null, unit: "ksi" }),
    tensile_strength: MechanicalPropertyValueSchema.default({ value: null, unit: "ksi" }),
    elongation_pct: MechanicalPropertyValueSchema.default({ value: null, unit: "%" }),
    hardness: z.object({
      value: z.number().nullable().default(null),
      scale: z.string().nullable().default(null),
      test_context: z.string().nullable().optional(),
    }).default({ value: null, scale: null }),
    charpy_impact: z.object({
      value: z.number().nullable().default(null),
      unit: z.string().nullable().default("ft-lbs"),
      test_temp_f: z.number().nullable().optional(),
      test_context: z.string().nullable().optional(),
    }).default({ value: null, unit: "ft-lbs" }),
  }).default({
    yield_strength: { value: null, unit: "ksi" },
    tensile_strength: { value: null, unit: "ksi" },
    elongation_pct: { value: null, unit: "%" },
    hardness: { value: null, scale: null },
    charpy_impact: { value: null, unit: "ft-lbs" },
  }),
  dimensions: z.object({
    thickness_in: z.number().nullable().default(null),
    width_in: z.number().nullable().default(null),
    length_in: z.number().nullable().default(null),
    weight_lbs: z.number().nullable().default(null),
  }).default({
    thickness_in: null,
    width_in: null,
    length_in: null,
    weight_lbs: null,
  }),
  printed_cev: z.number().nullable().default(null),
  unreadable_or_missing_fields: z.array(z.string()).default([]),
  field_evidence: z.record(z.string(), FieldEvidenceSchema).default({}),
  overall_confidence: z.enum(["high", "medium", "low"]).default("high"),
  confidence_notes: z.string().nullable().optional(),
});
export type MTRExtraction = z.infer<typeof MTRExtractionSchema>;

export type QCFlagCategory =
  | "DATA_COMPLETENESS"
  | "SPEC_INCONSISTENCY"
  | "REVIEW_WARNING"
  | "CHECK_UNAVAILABLE";

export type QCFlagSeverity = "PASS" | "INFO" | "WARNING" | "FAIL";

export interface MTRQCFlag {
  id: string;
  category: QCFlagCategory;
  severity: QCFlagSeverity;
  title: string;
  explanation: string;
  field: string;
  weight: number;
  evidence?: string | null;
}

export interface CEVRecalculationResult {
  value: number | null;
  formula: "IIW" | "PCM" | null;
  is_applicable: boolean;
  elements_used: string[];
  missing_elements: string[];
  weldability_note: string;
}

export interface CEVComparisonResult {
  printed_value: number | null;
  recalculated_value: number | null;
  discrepancy: number | null;
  tolerance: number;
  status: "MATCH" | "MISMATCH" | "NOT_APPLICABLE";
  explanation: string;
}

export interface DuplicateHeatCheckResult {
  is_duplicate: boolean;
  conflicting_mill?: string | null;
  conflicting_grade?: string | null;
  prior_certificate_id?: string | null;
  explanation: string;
}

export interface GradeResolutionResult {
  resolved_grade_id: string | null;
  grade_name: string | null;
  applicable_standard: string | null;
  status: "RESOLVED" | "UNRESOLVED_STANDARD";
  source?: string | null;
}

export type ReviewStatusVerdict = "CHECKS_PASSED" | "REVIEW_REQUIRED";

export interface MTRReviewResult {
  score: number; // 0 to 100
  status: ReviewStatusVerdict;
  verdict_summary: string;
  flags: MTRQCFlag[];
  recalculated_cev: CEVRecalculationResult;
  cev_comparison: CEVComparisonResult;
  duplicate_heat_check: DuplicateHeatCheckResult;
  grade_resolution: GradeResolutionResult;
  buyer_summary?: string;
  evaluated_at: string;
}

export interface MTRExtractionPipelineResponse {
  success: boolean;
  certificate_id?: string;
  document_sha256?: string;
  file_path?: string;
  signed_preview_url?: string;
  extracted_data: MTRExtraction;
  review_result: MTRReviewResult;
  provenance: {
    ocr_model: string;
    engine: string;
    rules_version: string;
    disclaimer: string;
  };
  error?: string;
}
