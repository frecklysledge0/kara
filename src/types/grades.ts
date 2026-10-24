import { z } from "zod";

// =====================================================================
// MillProof: Curated Steel Grade Knowledge Base Schema (Zod & TypeScript)
// =====================================================================

export const ElementLimitSchema = z.object({
  min: z.number().nullable(),
  max: z.number().nullable(),
  unit: z.string().default("% by weight"),
  note: z.string().optional()
}).refine(
  (data) => {
    if (data.min !== null && data.max !== null) {
      return data.min <= data.max;
    }
    return true;
  },
  { message: "Element minimum cannot exceed maximum" }
);

export const ChemistryLimitsSchema = z.object({
  elements: z.record(z.string(), ElementLimitSchema),
  source: z.string()
});

export const StrengthPropertySchema = z.object({
  min: z.number().nullable(),
  max: z.number().nullable(),
  typical: z.number().nullable(),
  unit: z.enum(["ksi", "MPa"]),
  condition: z.string()
}).refine(
  (data) => {
    if (data.min !== null && data.max !== null) {
      return data.min <= data.max;
    }
    return true;
  },
  { message: "Strength property minimum cannot exceed maximum" }
);

export const ElongationPropertySchema = z.object({
  min: z.number().nullable(),
  gauge_length: z.string()
});

export const HardnessPropertySchema = z.object({
  max: z.number().nullable(),
  typical: z.number().nullable(),
  scale: z.enum(["HBW", "HRB", "HRC"]).nullable()
});

export const CharpyImpactPropertySchema = z.object({
  min_avg_ft_lbs: z.number().nullable(),
  test_temp_f: z.number().nullable(),
  note: z.string().nullable()
});

export const MechanicalPropertiesSchema = z.object({
  yield_strength: StrengthPropertySchema,
  tensile_strength: StrengthPropertySchema,
  elongation_pct: ElongationPropertySchema,
  hardness: HardnessPropertySchema,
  charpy_impact: CharpyImpactPropertySchema.optional()
});

export const EnvironmentalSuitabilitySchema = z.object({
  indoor_dry: z.string(),
  outdoor_atmospheric: z.string(),
  marine_offshore: z.string(),
  sub_zero: z.string(),
  high_temperature: z.string()
});

export const CorrosionResistanceSchema = z.object({
  category: z.enum([
    "Negligible (Requires Protective Coating)",
    "Atmospheric Weathering (Patina Forming)",
    "Moderate High-Temperature / Exhaust",
    "High General Corrosion Resistance",
    "Superior Chloride & Pitting Resistance"
  ]),
  pren: z.number().nullable(),
  details: z.string()
});

export const WeldabilitySchema = z.object({
  rating: z.enum([
    "Prequalified / Excellent (AWS D1.1)",
    "Good with Standard Preheat",
    "Moderate (Preheat & Low-Hydrogen Required)",
    "Strict WPS & Hydrogen Control Required",
    "Excellent (Standard Austenitic Procedures)",
    "Specialized (Ferritic Grain Coarsening Risk)",
    "Good (Requires Controlled Heat Input & Phase Balance)"
  ]),
  recommended_processes: z.array(z.string()).min(1),
  notes: z.string()
});

export const RelativeCostTierSchema = z.object({
  tier: z.union([z.literal(1), z.literal(2), z.literal(3), z.literal(4), z.literal(5)]),
  cost_factor_vs_a36: z.number().positive(),
  description: z.string()
});

export const LimitationsAndGuidanceSchema = z.object({
  known_limitations: z.array(z.string()).min(1),
  avoid_for: z.array(z.string()).min(1)
});

export const CrossStandardEquivalentSchema = z.object({
  designation: z.string(),
  standard_org: z.string(),
  confidence: z.enum(["Direct Equivalent", "Close Substitute", "Partial Match"]),
  source_notes: z.string()
});

export const SourceReferenceSchema = z.object({
  title: z.string(),
  publisher: z.string(),
  url_or_identifier: z.string()
});

export const ReviewMetadataSchema = z.object({
  status: z.enum(["fully_checked", "needs_review"]),
  last_reviewed: z.string(),
  reviewer_notes: z.string()
});

export const SteelGradeEntrySchema = z.object({
  id: z.string().min(2),
  canonical_name: z.string().min(2),
  applicable_standard: z.string().min(2),
  uns_number: z.string().nullable(),
  en_designation: z.string().nullable(),
  material_family: z.enum([
    "Structural Carbon Steel",
    "High-Strength Low-Alloy (HSLA)",
    "Weathering Steel (HSLA)",
    "Low-Carbon Engineering / Machinery Steel",
    "Medium-Carbon Machinery Steel",
    "Low-Alloy Quenched & Tempered Steel",
    "Austenitic Stainless Steel",
    "Ferritic Stainless Steel",
    "Duplex Stainless Steel"
  ]),
  description: z.string().min(10),
  chemistry_limits: ChemistryLimitsSchema,
  mechanical_properties: MechanicalPropertiesSchema,
  typical_uses: z.array(z.string()).min(1),
  environmental_suitability: EnvironmentalSuitabilitySchema,
  corrosion_resistance: CorrosionResistanceSchema,
  weldability: WeldabilitySchema,
  relative_cost_tier: RelativeCostTierSchema,
  limitations_and_guidance: LimitationsAndGuidanceSchema,
  cross_standard_equivalents: z.array(CrossStandardEquivalentSchema),
  source_references: z.array(SourceReferenceSchema).min(1),
  review_metadata: ReviewMetadataSchema,
  disclaimer: z.string()
});

export const SteelGradeKnowledgeBaseSchema = z.array(SteelGradeEntrySchema);

// TypeScript Inferred Types
export type ElementLimit = z.infer<typeof ElementLimitSchema>;
export type ChemistryLimits = z.infer<typeof ChemistryLimitsSchema>;
export type StrengthProperty = z.infer<typeof StrengthPropertySchema>;
export type MechanicalProperties = z.infer<typeof MechanicalPropertiesSchema>;
export type EnvironmentalSuitability = z.infer<typeof EnvironmentalSuitabilitySchema>;
export type CorrosionResistance = z.infer<typeof CorrosionResistanceSchema>;
export type Weldability = z.infer<typeof WeldabilitySchema>;
export type RelativeCostTier = z.infer<typeof RelativeCostTierSchema>;
export type LimitationsAndGuidance = z.infer<typeof LimitationsAndGuidanceSchema>;
export type CrossStandardEquivalent = z.infer<typeof CrossStandardEquivalentSchema>;
export type SourceReference = z.infer<typeof SourceReferenceSchema>;
export type ReviewMetadata = z.infer<typeof ReviewMetadataSchema>;
export type SteelGradeEntry = z.infer<typeof SteelGradeEntrySchema>;
export type SteelGradeKnowledgeBase = z.infer<typeof SteelGradeKnowledgeBaseSchema>;
