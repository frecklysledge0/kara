import { z } from "zod";

// =====================================================================
// MillProof: AI Sourcing Assistant Types & Validation Schemas
// =====================================================================

export const BuyerSpecificationSchema = z.object({
  use_case: z.string().min(1, "Use case description is required"),
  environment: z.string().default("Standard indoor industrial"),
  required_properties: z.array(z.string()).default([]),
  prohibited_materials_or_constraints: z.array(z.string()).default([]),
  quantity_tons: z.number().positive().nullable().default(null),
  form: z.string().nullable().default(null), // e.g. "Plate", "Wide Flange Beam", "Round Bar", "Sheet"
  thickness_in: z.number().positive().nullable().default(null),
  buyer_city: z.string().nullable().default(null),
  state_or_country: z.string().nullable().default(null),
  budget_per_ton: z.number().positive().nullable().default(null),
  applicable_standard: z.string().nullable().default(null),
  explicit_requirements: z.array(z.string()).default([]),
  inferred_assumptions: z.array(z.string()).default([]),
  missing_information: z.array(z.string()).default([]),
});

export type BuyerSpecification = z.infer<typeof BuyerSpecificationSchema>;

export interface GradeSuitabilityResult {
  grade_id: string;
  canonical_name: string;
  material_family: string;
  applicable_standard: string;
  is_eligible: boolean;
  suitability_score: number; // 0.0 to 1.0
  fit_reasons: string[];
  limitations: string[];
  incompatibilities: string[];
  unresolved_engineering_requirements: string[];
  relative_cost_tier: number;
}

export interface ScoreWeightConfig {
  fit: number; // default 0.40
  quality: number; // default 0.30
  cost: number; // default 0.30
}

export interface RankedListingCandidate {
  listing_id: string;
  grade_id: string;
  grade_name: string;
  material_family: string;
  form: string;
  thickness_in: number;
  quantity_tons: number;
  price_per_ton: number;
  seller_name: string;
  seller_city: string;
  seller_state: string;
  mill_route: "EAF" | "BOF" | null;
  has_certificate: boolean;
  certificate_id: string | null;
  heat_number: string | null;
  is_demo: boolean;
  destination_city: string;
  destination_state: string;
  destination_zip: string;
  delivered_cost_per_ton: number | null;
  total_delivered_cost: number | null;
  freight_breakdown: {
    distance_miles: number;
    truckloads: number;
    freight_total: number;
    base_material_total: number;
  } | null;
  score_material_fit: number; // 0.0 to 1.0
  score_data_quality: number; // 0.0 to 1.0
  score_delivered_cost: number; // 0.0 to 1.0
  total_score: number; // 0 to 100
  effective_weights: ScoreWeightConfig;
  score_explanation: string;
  explanation?: CandidateExplanation;
}

export const CandidateExplanationSchema = z.object({
  listing_id: z.string(),
  why_matched: z.string(),
  key_trade_offs: z.array(z.string()),
  price_and_freight_assumptions: z.array(z.string()),
  relevant_limitations: z.array(z.string()),
  unknowns_requiring_confirmation: z.array(z.string()),
});

export type CandidateExplanation = z.infer<typeof CandidateExplanationSchema>;

export interface AssistantResponse {
  success: boolean;
  parsed_specification: BuyerSpecification;
  eligible_grades: GradeSuitabilityResult[];
  ineligible_grades: GradeSuitabilityResult[];
  ranked_listings: RankedListingCandidate[];
  clarification_questions: string[];
  summary_guidance: string;
  notice: string;
  error?: string;
}
