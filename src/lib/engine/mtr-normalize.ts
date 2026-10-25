import { MTRExtractionSchema, type MTRExtraction } from "@/types/mtr";

/**
 * Turns whatever the OCR model returned into a safe, fully-shaped MTRExtraction.
 *
 * Why: photos and scans often come back with gaps — `yield_strength: null`, chemistry values as text
 * ("0.18", "<0.005", "36 ksi"), or missing sections. The QC engine expects every property to be an
 * object with a numeric-or-null `value`, so unnormalized output crashed with
 * "Cannot read properties of null (reading 'value')". Missing data stays `null` (never invented).
 */

type Obj = Record<string, unknown>;
const isObj = (v: unknown): v is Obj => typeof v === "object" && v !== null && !Array.isArray(v);

/** Number, numeric string ("0.18", "36 ksi", "<0.005", "1,200") or null. */
export function toNumberOrNull(v: unknown): number | null {
  if (typeof v === "number") return Number.isFinite(v) ? v : null;
  if (typeof v === "string") {
    const match = v.replace(/,/g, "").match(/-?\d+(\.\d+)?/);
    if (!match) return null;
    const n = Number(match[0]);
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

const toStringOrNull = (v: unknown): string | null =>
  typeof v === "string" && v.trim() ? v.trim() : typeof v === "number" ? String(v) : null;

/** Accepts `0.18`, `"0.18"`, `{ value: "0.18" }`, `null` → `{ value: number | null, ...extras }`. */
function valueObject(v: unknown, defaults: Obj): Obj {
  if (isObj(v)) {
    const out: Obj = { ...defaults, value: toNumberOrNull(v.value) };
    for (const key of Object.keys(defaults)) {
      if (key !== "value" && v[key] !== undefined && v[key] !== null) out[key] = v[key];
    }
    if (typeof v.test_context === "string") out.test_context = v.test_context;
    if (v.test_temp_f !== undefined) out.test_temp_f = toNumberOrNull(v.test_temp_f);
    return out;
  }
  return { ...defaults, value: toNumberOrNull(v) };
}

export function normalizeMTRExtraction(raw: unknown, recoveredNote?: string): MTRExtraction {
  const r: Obj = isObj(raw) ? raw : {};

  const chemistry: Record<string, { value: number | null; unit: string }> = {};
  if (isObj(r.chemistry)) {
    for (const [element, v] of Object.entries(r.chemistry)) {
      const obj = valueObject(v, { value: null, unit: "% by weight" });
      chemistry[element] = { value: obj.value as number | null, unit: String(obj.unit ?? "% by weight") };
    }
  }

  const mech: Obj = isObj(r.mechanical_properties) ? r.mechanical_properties : {};
  const dims: Obj = isObj(r.dimensions) ? r.dimensions : {};

  const evidence: Obj = {};
  if (isObj(r.field_evidence)) {
    for (const [field, v] of Object.entries(r.field_evidence)) {
      if (!isObj(v)) continue;
      const confidence = ["high", "medium", "low", "uncertain"].includes(String(v.confidence)) ? v.confidence : "medium";
      evidence[field] = { quote: toStringOrNull(v.quote), page: toNumberOrNull(v.page), confidence };
    }
  }

  const confidence = ["high", "medium", "low"].includes(String(r.overall_confidence))
    ? (r.overall_confidence as "high" | "medium" | "low")
    : "medium";

  return MTRExtractionSchema.parse({
    mill_name: toStringOrNull(r.mill_name),
    heat_number: toStringOrNull(r.heat_number),
    grade: toStringOrNull(r.grade),
    standard: toStringOrNull(r.standard),
    product_form: toStringOrNull(r.product_form),
    melt_and_pour_country: toStringOrNull(r.melt_and_pour_country),
    chemistry,
    mechanical_properties: {
      yield_strength: valueObject(mech.yield_strength, { value: null, unit: "ksi" }),
      tensile_strength: valueObject(mech.tensile_strength, { value: null, unit: "ksi" }),
      elongation_pct: valueObject(mech.elongation_pct, { value: null, unit: "%" }),
      hardness: valueObject(mech.hardness, { value: null, scale: null }),
      charpy_impact: valueObject(mech.charpy_impact, { value: null, unit: "ft-lbs" }),
    },
    dimensions: {
      thickness_in: toNumberOrNull(dims.thickness_in),
      width_in: toNumberOrNull(dims.width_in),
      length_in: toNumberOrNull(dims.length_in),
      weight_lbs: toNumberOrNull(dims.weight_lbs),
    },
    printed_cev: toNumberOrNull(r.printed_cev),
    unreadable_or_missing_fields: Array.isArray(r.unreadable_or_missing_fields)
      ? r.unreadable_or_missing_fields.filter((f): f is string => typeof f === "string")
      : [],
    field_evidence: evidence,
    overall_confidence: recoveredNote ? (confidence === "high" ? "medium" : confidence) : confidence,
    confidence_notes: recoveredNote ?? toStringOrNull(r.confidence_notes),
  });
}
