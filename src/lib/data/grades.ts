// =====================================================================
// MillProof: Curated Steel Grade Knowledge Base Repository
// Provides typed retrieval, schema validation, and multi-factor filtering.
// =====================================================================

import {
  SteelGradeEntry,
  SteelGradeKnowledgeBaseSchema,
  SteelGradeEntrySchema,
  SteelGradeKnowledgeBase,
} from "@/types/grades";
import rawGrades from "../../../data/grades.json";

// Validate data at module initialization
const parseResult = SteelGradeKnowledgeBaseSchema.safeParse(rawGrades);

if (!parseResult.success) {
  console.error("FATAL: data/grades.json failed schema validation:", parseResult.error.format());
}

export const CURATED_GRADES: SteelGradeEntry[] = parseResult.success
  ? parseResult.data
  : (rawGrades as unknown as SteelGradeEntry[]);

/**
 * Validates any arbitrary steel grade object against the strict Zod schema.
 */
export function validateGradeEntry(data: unknown): {
  valid: boolean;
  errors: string[];
  parsed?: SteelGradeEntry;
} {
  const result = SteelGradeEntrySchema.safeParse(data);
  if (result.success) {
    return { valid: true, errors: [], parsed: result.data };
  }
  const issues = result.error.issues || (result.error as unknown as { errors: typeof result.error.issues }).errors || [];
  const errors = issues.map((e) => `${e.path.join(".")}: ${e.message}`);
  return { valid: false, errors };
}

/**
 * Validates the entire knowledge base array.
 */
export function validateKnowledgeBase(data: unknown): {
  valid: boolean;
  errors: string[];
  parsed?: SteelGradeKnowledgeBase;
} {
  const result = SteelGradeKnowledgeBaseSchema.safeParse(data);
  if (result.success) {
    return { valid: true, errors: [], parsed: result.data };
  }
  const issues = result.error.issues || (result.error as unknown as { errors: typeof result.error.issues }).errors || [];
  const errors = issues.map((e) => `${e.path.join(".")}: ${e.message}`);
  return { valid: false, errors };
}

/**
 * Returns all active steel grade entries in the knowledge base.
 */
export function getAllGrades(): SteelGradeEntry[] {
  return CURATED_GRADES;
}

/**
 * Retrieves a single grade by its unique ID (slug).
 */
export function getGradeById(id: string): SteelGradeEntry | undefined {
  const cleanId = id.toLowerCase().trim();
  return CURATED_GRADES.find((g) => g.id.toLowerCase() === cleanId);
}

/**
 * Filters grades by material family (e.g. "Structural Carbon Steel", "Austenitic Stainless Steel").
 */
export function getGradesByFamily(family: string): SteelGradeEntry[] {
  if (!family || family === "ALL") return CURATED_GRADES;
  const target = family.toLowerCase().trim();
  return CURATED_GRADES.filter((g) => g.material_family.toLowerCase() === target);
}

/**
 * Filters grades by corrosion resistance category.
 */
export function getGradesByCorrosionResistance(category: string): SteelGradeEntry[] {
  if (!category || category === "ALL") return CURATED_GRADES;
  const target = category.toLowerCase().trim();
  return CURATED_GRADES.filter((g) => g.corrosion_resistance.category.toLowerCase() === target);
}

/**
 * Filters grades capable of delivering at least the specified minimum yield strength (ksi).
 */
export function getGradesByMinYield(minYieldKsi: number): SteelGradeEntry[] {
  return CURATED_GRADES.filter((g) => {
    const minYield = g.mechanical_properties.yield_strength.min;
    return minYield !== null && minYield >= minYieldKsi;
  });
}

/**
 * Searches grades by typical applications or keywords.
 */
export function getGradesByUseCase(keyword: string): SteelGradeEntry[] {
  if (!keyword || keyword.trim() === "") return CURATED_GRADES;
  const term = keyword.toLowerCase().trim();
  return CURATED_GRADES.filter(
    (g) =>
      g.canonical_name.toLowerCase().includes(term) ||
      g.description.toLowerCase().includes(term) ||
      g.typical_uses.some((use) => use.toLowerCase().includes(term)) ||
      g.material_family.toLowerCase().includes(term)
  );
}

/**
 * Provides aggregate summary statistics for the curated knowledge base.
 */
export function getKnowledgeBaseSummary() {
  const families = Array.from(new Set(CURATED_GRADES.map((g) => g.material_family)));
  const fullyCheckedCount = CURATED_GRADES.filter((g) => g.review_metadata.status === "fully_checked").length;
  const needsReviewCount = CURATED_GRADES.filter((g) => g.review_metadata.status === "needs_review").length;

  return {
    totalGrades: CURATED_GRADES.length,
    families,
    fullyCheckedCount,
    needsReviewCount,
    lastAuditDate: "2026-10-24",
    notice: "Informational guidance only. Not intended as engineering certification or WPS qualification."
  };
}
