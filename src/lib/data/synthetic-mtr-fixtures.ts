// =====================================================================
// MillProof: Synthetic Material Test Certificate Benchmark Fixtures
// All fixtures are synthetic test cases labeled as DEMO for audit testing.
// Covers clean documents, missing fields, chemical & mechanical inconsistencies,
// unreadable fields, duplicate heat conflicts, and CEV tolerance checks.
// =====================================================================

import { MTRExtraction } from "@/types/mtr";

export interface SyntheticMTRBenchmark {
  id: string;
  name: string;
  badge: string;
  description: string;
  category: "CLEAN" | "MISSING_FIELDS" | "CHEMISTRY_INCONSISTENCY" | "MECHANICAL_FAILURE" | "UNREADABLE_FIELD" | "DUPLICATE_CONFLICT" | "CEV_MISMATCH" | "UNSUPPORTED_STANDARD";
  expectedStatus: "CHECKS_PASSED" | "REVIEW_REQUIRED";
  data: MTRExtraction;
  mockRawDocumentText: string;
}

export const SYNTHETIC_MTR_FIXTURES: SyntheticMTRBenchmark[] = [
  {
    id: "demo-clean-a572",
    name: "DEMO: Compliant Structural Bridge Plate (ASTM A572 Gr 50)",
    badge: "Clean Document",
    description: "Fully compliant high-strength low-alloy plate. Complete ladle chemistry, tensile pull tests, and verified CEV.",
    category: "CLEAN",
    expectedStatus: "CHECKS_PASSED",
    data: {
      mill_name: "Burns Harbor Heavy Plate Works",
      heat_number: "H-882194",
      grade: "ASTM A572 Grade 50",
      standard: "ASTM A572/A572M-21",
      product_form: "Plate",
      melt_and_pour_country: "USA",
      chemistry: {
        C: { value: 0.17, unit: "% by weight" },
        Mn: { value: 1.18, unit: "% by weight" },
        P: { value: 0.014, unit: "% by weight" },
        S: { value: 0.006, unit: "% by weight" },
        Si: { value: 0.26, unit: "% by weight" },
        V: { value: 0.038, unit: "% by weight" },
        Nb: { value: 0.024, unit: "% by weight" },
        Cr: { value: 0.04, unit: "% by weight" },
        Ni: { value: 0.03, unit: "% by weight" },
        Mo: { value: 0.01, unit: "% by weight" },
        Cu: { value: 0.14, unit: "% by weight" },
      },
      mechanical_properties: {
        yield_strength: { value: 54.6, unit: "ksi", test_context: "0.2% offset monotonic tension" },
        tensile_strength: { value: 73.2, unit: "ksi", test_context: "Full section plate specimen" },
        elongation_pct: { value: 23.5, unit: "%", test_context: "2-inch [50mm] gage length" },
        hardness: { value: 149, scale: "HBW", test_context: "Surface Brinell 10mm ball / 3000kg" },
        charpy_impact: { value: 36, unit: "ft-lbs", test_temp_f: 0, test_context: "Transverse CVN average of 3 specimens" },
      },
      dimensions: {
        thickness_in: 0.75,
        width_in: 96.0,
        length_in: 240.0,
        weight_lbs: 4896.0,
      },
      printed_cev: 0.39,
      unreadable_or_missing_fields: [],
      field_evidence: {
        heat_number: { quote: "HEAT NO: H-882194 (LADLE ANALYSIS)", page: 1, confidence: "high" },
        mill_name: { quote: "BURNS HARBOR HEAVY ROLLING WORKS - CHESTERTON, IN", page: 1, confidence: "high" },
        grade: { quote: "SPECIFICATION: ASTM A572-21 GRADE 50 / AASHTO M223", page: 1, confidence: "high" },
        melt_and_pour_country: { quote: "MELTED AND MANUFACTURED IN THE UNITED STATES OF AMERICA", page: 1, confidence: "high" },
        yield_strength: { quote: "YIELD STRENGTH (0.2% OFFSET): 54.6 KSI", page: 1, confidence: "high" },
        tensile_strength: { quote: "TENSILE STRENGTH: 73.2 KSI", page: 1, confidence: "high" },
      },
      overall_confidence: "high",
      confidence_notes: "Clean laser-printed EN 10204 3.1 mill certificate with high optical clarity.",
    },
    mockRawDocumentText: `
      BURNS HARBOR HEAVY ROLLING WORKS
      MATERIAL TEST REPORT (EN 10204 3.1)
      CERTIFICATE NO: MTR-2026-BH-882194
      CUSTOMER: GREAT LAKES STEEL SERVICE
      SPECIFICATION: ASTM A572-21 GRADE 50 / AASHTO M223
      MELTED AND MANUFACTURED IN THE UNITED STATES OF AMERICA
      HEAT NO: H-882194
      PRODUCT FORM: HEAVY STRUCTURAL STEEL PLATE
      DIMENSIONS: 0.750" x 96.0" x 240.0" | WEIGHT: 4,896 LBS
      LADLE CHEMICAL ANALYSIS (%):
      C: 0.17 | Mn: 1.18 | P: 0.014 | S: 0.006 | Si: 0.26 | V: 0.038 | Nb: 0.024 | Cr: 0.04 | Ni: 0.03 | Mo: 0.01 | Cu: 0.14
      PRINTED CEV (IIW): 0.39
      MECHANICAL TENSION TEST RESULTS:
      YIELD STRENGTH (0.2% OFFSET): 54.6 KSI (MIN 50.0 KSI)
      TENSILE STRENGTH: 73.2 KSI (MIN 65.0 KSI)
      ELONGATION IN 2" (50MM): 23.5% (MIN 18.0%)
      SURFACE BRINELL HARDNESS: 149 HBW
      CHARPY V-NOTCH IMPACT (0°F): 36 FT-LBS AVERAGE
      CERTIFIED BY QC METALLURGICAL LAB: APPROVED FOR STRUCTURAL SERVICE.
    `,
  },

  {
    id: "demo-missing-fields",
    name: "DEMO: Missing Heat & Mechanical Pull Tests",
    badge: "Missing Fields",
    description: "Incomplete certificate missing mandatory heat/ladle identification and tensile property pull tests.",
    category: "MISSING_FIELDS",
    expectedStatus: "REVIEW_REQUIRED",
    data: {
      mill_name: "Midwest Steel Staging Facility",
      heat_number: null, // MISSING
      grade: "ASTM A36",
      standard: "ASTM A36/A36M",
      product_form: "Plate",
      melt_and_pour_country: null,
      chemistry: {
        C: { value: 0.21, unit: "% by weight" },
        Mn: { value: 0.90, unit: "% by weight" },
      },
      mechanical_properties: {
        yield_strength: { value: null, unit: "ksi" }, // MISSING
        tensile_strength: { value: null, unit: "ksi" }, // MISSING
        elongation_pct: { value: null, unit: "%" }, // MISSING
        hardness: { value: null, scale: null },
        charpy_impact: { value: null, unit: null },
      },
      dimensions: {
        thickness_in: 0.5,
        width_in: 48.0,
        length_in: 120.0,
        weight_lbs: 816.0,
      },
      printed_cev: null,
      unreadable_or_missing_fields: ["Heat Number Header", "Mechanical Tension Test Table"],
      field_evidence: {
        grade: { quote: "MATERIAL TYPE: COMMERCIAL A36 CARBON", page: 1, confidence: "medium" },
      },
      overall_confidence: "low",
      confidence_notes: "Critical sections missing. Heat identification was clipped or absent.",
    },
    mockRawDocumentText: `
      MIDWEST STEEL STAGING FACILITY
      INTERNAL STOCK TRANSFER TICKET
      MATERIAL TYPE: COMMERCIAL A36 CARBON
      DIMENSIONS: 0.500" x 48.0" x 120.0"
      CHEMISTRY CHECK: C: 0.21% | Mn: 0.90%
      [WARNING: NO MILL HEAT NUMBER OR TENSILE TEST REPORT ATTACHED]
    `,
  },

  {
    id: "demo-chem-inconsistency",
    name: "DEMO: Out-of-Spec Chemistry Exceeding ASTM Limits",
    badge: "Chemistry Inconsistency",
    description: "ASTM A572 Grade 50 test certificate where Carbon (0.28%) and Phosphorus (0.046%) violate ASTM A572 maximum bounds.",
    category: "CHEMISTRY_INCONSISTENCY",
    expectedStatus: "REVIEW_REQUIRED",
    data: {
      mill_name: "Cascade Alloy Processing Works",
      heat_number: "H-519022-FLAGGED",
      grade: "ASTM A572 Grade 50",
      standard: "ASTM A572/A572M-21",
      product_form: "Plate",
      melt_and_pour_country: "USA",
      chemistry: {
        C: { value: 0.28, unit: "% by weight" }, // VIOLATION: max is 0.23%
        Mn: { value: 1.45, unit: "% by weight" }, // VIOLATION: max is 1.35%
        P: { value: 0.046, unit: "% by weight" }, // VIOLATION: max is 0.040%
        S: { value: 0.012, unit: "% by weight" },
        Si: { value: 0.32, unit: "% by weight" },
        V: { value: 0.02, unit: "% by weight" },
      },
      mechanical_properties: {
        yield_strength: { value: 56.2, unit: "ksi", test_context: "0.2% offset tension" },
        tensile_strength: { value: 76.5, unit: "ksi", test_context: "Full thickness test" },
        elongation_pct: { value: 20.0, unit: "%", test_context: "2-inch gage" },
        hardness: { value: 162, scale: "HBW" },
        charpy_impact: { value: 24, unit: "ft-lbs", test_temp_f: 20 },
      },
      dimensions: {
        thickness_in: 0.625,
        width_in: 96.0,
        length_in: 240.0,
        weight_lbs: 4080.0,
      },
      printed_cev: 0.53,
      unreadable_or_missing_fields: [],
      field_evidence: {
        heat_number: { quote: "HEAT NUMBER: H-519022-FLAGGED", page: 1, confidence: "high" },
        C: { quote: "CARBON (C): 0.28%", page: 1, confidence: "high" },
        Mn: { quote: "MANGANESE (Mn): 1.45%", page: 1, confidence: "high" },
        P: { quote: "PHOSPHORUS (P): 0.046%", page: 1, confidence: "high" },
      },
      overall_confidence: "high",
      confidence_notes: "Clear text, but chemical analysis exceeds ASTM A572 Grade 50 max carbon and manganese limits.",
    },
    mockRawDocumentText: `
      CASCADE ALLOY PROCESSING WORKS
      MILL TEST CERTIFICATE (EN 10204 3.1)
      HEAT NUMBER: H-519022-FLAGGED
      SPECIFICATION: ASTM A572 GRADE 50
      LADLE ANALYSIS:
      CARBON (C): 0.28%  <-- EXCEEDS ASTM A572 MAX (0.23%)
      MANGANESE (Mn): 1.45% <-- EXCEEDS MAX (1.35%)
      PHOSPHORUS (P): 0.046% <-- EXCEEDS MAX (0.040%)
      SULFUR (S): 0.012% | SILICON (Si): 0.32% | VANADIUM (V): 0.020%
      MECHANICAL PROPERTIES:
      YIELD: 56.2 KSI | TENSILE: 76.5 KSI | ELONGATION: 20.0%
      PRINTED CEV: 0.53
    `,
  },

  {
    id: "demo-mech-inconsistency",
    name: "DEMO: Mechanical Properties Inconsistent With Standard",
    badge: "Mechanical Failure",
    description: "ASTM A572 Grade 50 plate where Yield Strength is 46.2 ksi (fails 50.0 ksi minimum) and Elongation is 15.0% (fails 18.0% minimum).",
    category: "MECHANICAL_FAILURE",
    expectedStatus: "REVIEW_REQUIRED",
    data: {
      mill_name: "Allegheny Structural Rolling Works",
      heat_number: "H-709144",
      grade: "ASTM A572 Grade 50",
      standard: "ASTM A572/A572M",
      product_form: "Plate",
      melt_and_pour_country: "USA",
      chemistry: {
        C: { value: 0.18, unit: "% by weight" },
        Mn: { value: 1.15, unit: "% by weight" },
        P: { value: 0.015, unit: "% by weight" },
        S: { value: 0.008, unit: "% by weight" },
        Si: { value: 0.22, unit: "% by weight" },
        V: { value: 0.03, unit: "% by weight" },
      },
      mechanical_properties: {
        yield_strength: { value: 46.2, unit: "ksi", test_context: "0.2% offset" }, // VIOLATION: min is 50.0 ksi
        tensile_strength: { value: 68.4, unit: "ksi", test_context: "Plate specimen" },
        elongation_pct: { value: 15.0, unit: "%", test_context: "2-inch gage" }, // VIOLATION: min is 18.0%
        hardness: { value: 135, scale: "HBW" },
        charpy_impact: { value: null, unit: null },
      },
      dimensions: {
        thickness_in: 1.0,
        width_in: 96.0,
        length_in: 240.0,
        weight_lbs: 6528.0,
      },
      printed_cev: 0.38,
      unreadable_or_missing_fields: [],
      field_evidence: {
        yield_strength: { quote: "YIELD STRENGTH: 46.2 KSI", page: 1, confidence: "high" },
        elongation_pct: { quote: "ELONGATION: 15.0%", page: 1, confidence: "high" },
      },
      overall_confidence: "high",
      confidence_notes: "Clean document extraction. Yield strength fails ASTM A572 Grade 50 minimum 50.0 ksi requirement.",
    },
    mockRawDocumentText: `
      ALLEGHENY STRUCTURAL ROLLING WORKS
      CERTIFICATE OF TEST
      HEAT: H-709144 | GRADE: ASTM A572 GRADE 50
      TENSILE TEST SUMMARY:
      YIELD STRENGTH: 46.2 KSI (SPEC MIN: 50.0 KSI) <-- FAILED SPECIFICATION
      TENSILE STRENGTH: 68.4 KSI (SPEC MIN: 65.0 KSI)
      ELONGATION: 15.0% (SPEC MIN: 18.0%) <-- FAILED SPECIFICATION
    `,
  },

  {
    id: "demo-duplicate-conflict",
    name: "DEMO: Duplicate Heat Number With Conflicting Mill & Grade",
    badge: "Duplicate Conflict",
    description: "Heat number H-784291 is already registered in MillProof under Burns Harbor / A572 Gr 50, but is presented here under a conflicting mill and grade.",
    category: "DUPLICATE_CONFLICT",
    expectedStatus: "REVIEW_REQUIRED",
    data: {
      mill_name: "Apex Offshore Specialty Forgings", // CONFLICT with Burns Harbor
      heat_number: "H-784291", // DUPLICATE HEAT
      grade: "AISI 4140", // CONFLICT with ASTM A572 Grade 50
      standard: "ASTM A29 / AISI 4140",
      product_form: "Round Bar",
      melt_and_pour_country: "USA",
      chemistry: {
        C: { value: 0.40, unit: "% by weight" },
        Mn: { value: 0.85, unit: "% by weight" },
        P: { value: 0.015, unit: "% by weight" },
        S: { value: 0.010, unit: "% by weight" },
        Si: { value: 0.25, unit: "% by weight" },
        Cr: { value: 0.95, unit: "% by weight" },
        Mo: { value: 0.20, unit: "% by weight" },
      },
      mechanical_properties: {
        yield_strength: { value: 95.0, unit: "ksi", test_context: "Annealed condition" },
        tensile_strength: { value: 130.0, unit: "ksi" },
        elongation_pct: { value: 18.0, unit: "%" },
        hardness: { value: 240, scale: "HBW" },
        charpy_impact: { value: null, unit: null },
      },
      dimensions: {
        thickness_in: 3.5,
        width_in: 3.5,
        length_in: 144.0,
        weight_lbs: 395.0,
      },
      printed_cev: null,
      unreadable_or_missing_fields: [],
      field_evidence: {
        heat_number: { quote: "HEAT NUMBER: H-784291", page: 1, confidence: "high" },
        mill_name: { quote: "APEX OFFSHORE SPECIALTY FORGINGS", page: 1, confidence: "high" },
      },
      overall_confidence: "high",
      confidence_notes: "Duplicate heat number conflict triggered against registered database lot.",
    },
    mockRawDocumentText: `
      APEX OFFSHORE SPECIALTY FORGINGS
      CERTIFICATE OF METALLURGICAL TEST
      HEAT NUMBER: H-784291
      PRODUCT: AISI 4140 ALLOY ROUND BAR
      [NOTE: This heat number H-784291 already belongs to Burns Harbor Plate Works A572 Plate in registry]
    `,
  },

  {
    id: "demo-cev-mismatch",
    name: "DEMO: Carbon Equivalent Recalculation Discrepancy",
    badge: "CEV Mismatch",
    description: "Printed CEV on certificate states 0.49, but recalculation using reported C, Mn, Cr, Mo, V yields 0.38 (exceeds allowable ±0.02 tolerance).",
    category: "CEV_MISMATCH",
    expectedStatus: "REVIEW_REQUIRED",
    data: {
      mill_name: "Great Lakes Steelworks Corp",
      heat_number: "H-620199",
      grade: "ASTM A572 Grade 50",
      standard: "ASTM A572/A572M",
      product_form: "Plate",
      melt_and_pour_country: "USA",
      chemistry: {
        C: { value: 0.16, unit: "% by weight" },
        Mn: { value: 1.14, unit: "% by weight" },
        P: { value: 0.012, unit: "% by weight" },
        S: { value: 0.005, unit: "% by weight" },
        Si: { value: 0.22, unit: "% by weight" },
        V: { value: 0.03, unit: "% by weight" },
        Nb: { value: 0.02, unit: "% by weight" },
      },
      mechanical_properties: {
        yield_strength: { value: 53.5, unit: "ksi" },
        tensile_strength: { value: 71.0, unit: "ksi" },
        elongation_pct: { value: 24.0, unit: "%" },
        hardness: { value: 145, scale: "HBW" },
        charpy_impact: { value: null, unit: null },
      },
      dimensions: {
        thickness_in: 0.5,
        width_in: 96.0,
        length_in: 240.0,
        weight_lbs: 3264.0,
      },
      printed_cev: 0.49, // MISMATCH: recalculated is 0.16 + 1.14/6 + 0.03/5 = 0.356
      unreadable_or_missing_fields: [],
      field_evidence: {
        printed_cev: { quote: "CARBON EQUIVALENT (CE): 0.49", page: 1, confidence: "high" },
      },
      overall_confidence: "high",
      confidence_notes: "Printed carbon equivalent differs significantly from recalculated chemistry values.",
    },
    mockRawDocumentText: `
      GREAT LAKES STEELWORKS CORP
      MILL TEST CERTIFICATE
      HEAT: H-620199 | SPEC: ASTM A572 GR 50
      CHEMISTRY: C: 0.16% | Mn: 1.14% | P: 0.012% | S: 0.005% | Si: 0.22% | V: 0.03%
      PRINTED CEV: 0.49 <-- DISCREPANCY: Mathematical IIW calculation is 0.36
    `,
  },

  {
    id: "demo-unsupported-standard",
    name: "DEMO: Non-Indexed Standard (Check Unavailable)",
    badge: "Check Unavailable",
    description: "Material certified to proprietary international grade JIS G3101 SS400, not indexed in knowledge base. Flagged as check unavailable, not failed.",
    category: "UNSUPPORTED_STANDARD",
    expectedStatus: "CHECKS_PASSED", // Because missing reference limit is unavailable, not failing
    data: {
      mill_name: "Kobe Heavy Steelworks",
      heat_number: "H-994102",
      grade: "JIS G3101 SS400",
      standard: "JIS G3101",
      product_form: "Plate",
      melt_and_pour_country: "Japan",
      chemistry: {
        C: { value: 0.17, unit: "% by weight" },
        Mn: { value: 0.65, unit: "% by weight" },
        P: { value: 0.020, unit: "% by weight" },
        S: { value: 0.018, unit: "% by weight" },
      },
      mechanical_properties: {
        yield_strength: { value: 37.0, unit: "ksi", test_context: "Converted from 255 N/mm2" },
        tensile_strength: { value: 62.0, unit: "ksi", test_context: "Converted from 428 N/mm2" },
        elongation_pct: { value: 24.0, unit: "%" },
        hardness: { value: 130, scale: "HBW" },
        charpy_impact: { value: null, unit: null },
      },
      dimensions: {
        thickness_in: 0.75,
        width_in: 60.0,
        length_in: 240.0,
        weight_lbs: 3060.0,
      },
      printed_cev: null,
      unreadable_or_missing_fields: [],
      field_evidence: {
        grade: { quote: "STANDARD: JIS G3101 SS400 ROLLED STEEL FOR GENERAL STRUCTURE", page: 1, confidence: "high" },
      },
      overall_confidence: "high",
      confidence_notes: "Grade is valid standard outside the 10 ASTM/SAE knowledge base grades.",
    },
    mockRawDocumentText: `
      KOBE HEAVY STEELWORKS
      MILL TEST CERTIFICATE (JIS G3101)
      HEAT NO: H-994102
      GRADE: JIS G3101 SS400
      LADLE ANALYSIS: C: 0.17% | Mn: 0.65% | P: 0.020% | S: 0.018%
      TENSILE TEST: YIELD 255 N/mm² (37.0 ksi) | TENSILE 428 N/mm² (62.0 ksi) | ELONGATION 24%
    `,
  },
];
