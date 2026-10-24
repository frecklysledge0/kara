import { describe, it, expect } from "vitest";
import {
  evaluateMTRComplianceAndRisk,
  recalculateIIWCarbonEquivalent,
  normalizeStressToKsi,
  resolveGrade,
} from "@/lib/engine/mtr-qc";
import { SYNTHETIC_MTR_FIXTURES } from "@/lib/data/synthetic-mtr-fixtures";
import { MTRExtraction } from "@/types/mtr";

describe("MillProof MTR Extraction & Deterministic QC Pipeline Tests", () => {
  // 1. Clean Document Test
  it("passes clean ASTM A572-50 synthetic certificate with low review score and CHECKS_PASSED", () => {
    const cleanSample = SYNTHETIC_MTR_FIXTURES.find((s) => s.id === "demo-clean-a572");
    expect(cleanSample).toBeDefined();

    const result = evaluateMTRComplianceAndRisk(cleanSample!.data);
    expect(result.status).toBe("CHECKS_PASSED");
    expect(result.score).toBeLessThanOrEqual(10);
    expect(result.recalculated_cev.is_applicable).toBe(true);
    expect(result.recalculated_cev.value).toBeCloseTo(0.38, 1);
    expect(result.cev_comparison.status).toBe("MATCH");
    expect(result.grade_resolution.status).toBe("RESOLVED");
    expect(result.grade_resolution.resolved_grade_id).toBe("astm-a572-50");
    expect(result.flags.filter((f) => f.severity === "FAIL")).toHaveLength(0);
    expect(result.buyer_summary).toContain("ASTM A572 Grade 50");
    expect(result.buyer_summary).toContain("Checks passed");
  });

  // 2. Missing Fields Test
  it("flags missing mandatory heat number and mechanical pull tests as REVIEW_REQUIRED", () => {
    const missingSample = SYNTHETIC_MTR_FIXTURES.find((s) => s.id === "demo-missing-fields");
    expect(missingSample).toBeDefined();

    const result = evaluateMTRComplianceAndRisk(missingSample!.data);
    expect(result.status).toBe("REVIEW_REQUIRED");
    expect(result.score).toBeGreaterThanOrEqual(40);

    const flagIds = result.flags.map((f) => f.id);
    expect(flagIds).toContain("MISSING_HEAT_NUMBER");
    expect(flagIds).toContain("MISSING_MECHANICAL_TESTS");
    expect(result.verdict_summary).toContain("Review required");
  });

  // 3. Chemistry Inconsistency Test
  it("detects chemistry exceeding ASTM maximum limits deterministically", () => {
    const chemSample = SYNTHETIC_MTR_FIXTURES.find((s) => s.id === "demo-chem-inconsistency");
    expect(chemSample).toBeDefined();

    const result = evaluateMTRComplianceAndRisk(chemSample!.data);
    expect(result.status).toBe("REVIEW_REQUIRED");

    const flagIds = result.flags.map((f) => f.id);
    expect(flagIds).toContain("CHEM_EXCEEDS_MAX_C");
    expect(flagIds).toContain("CHEM_EXCEEDS_MAX_MN");
    expect(flagIds).toContain("CHEM_EXCEEDS_MAX_P");

    const cFlag = result.flags.find((f) => f.id === "CHEM_EXCEEDS_MAX_C");
    expect(cFlag?.explanation).toContain("exceeds the 0.23% maximum");
    expect(cFlag?.severity).toBe("FAIL");
  });

  // 4. Mechanical Inconsistency Test
  it("detects yield strength and elongation below ASTM standard minimums", () => {
    const mechSample = SYNTHETIC_MTR_FIXTURES.find((s) => s.id === "demo-mech-inconsistency");
    expect(mechSample).toBeDefined();

    const result = evaluateMTRComplianceAndRisk(mechSample!.data);
    expect(result.status).toBe("REVIEW_REQUIRED");

    const flagIds = result.flags.map((f) => f.id);
    expect(flagIds).toContain("YIELD_BELOW_SPEC_MIN");
    expect(flagIds).toContain("ELONGATION_BELOW_SPEC_MIN");

    const yieldFlag = result.flags.find((f) => f.id === "YIELD_BELOW_SPEC_MIN");
    expect(yieldFlag?.explanation).toContain("below the 50 ksi minimum");
  });

  // 5. Implausible Units & Negative Bounds Test
  it("flags implausible or incompatible physical values and unit contradictions", () => {
    const implausibleData: MTRExtraction = {
      mill_name: "Test Mill",
      heat_number: "H-TEST-999",
      grade: "ASTM A36",
      standard: "ASTM A36",
      product_form: "Plate",
      melt_and_pour_country: "USA",
      chemistry: {
        C: { value: -0.05, unit: "% by weight" }, // NEGATIVE CHEMISTRY
        Mn: { value: 1.10, unit: "% by weight" },
      },
      mechanical_properties: {
        yield_strength: { value: 950.0, unit: "ksi" }, // IMPLAUSIBLE STRENGTH (>400 ksi)
        tensile_strength: { value: 80.0, unit: "ksi" }, // YIELD EXCEEDS TENSILE
        elongation_pct: { value: -5.0, unit: "%" }, // NEGATIVE ELONGATION
        hardness: { value: null, scale: null },
        charpy_impact: { value: null, unit: null },
      },
      dimensions: {
        thickness_in: 0.5,
        width_in: 96,
        length_in: 240,
        weight_lbs: 3264,
      },
      printed_cev: null,
      unreadable_or_missing_fields: [],
      field_evidence: {},
      overall_confidence: "high",
    };

    const result = evaluateMTRComplianceAndRisk(implausibleData);
    expect(result.status).toBe("REVIEW_REQUIRED");

    const flagIds = result.flags.map((f) => f.id);
    expect(flagIds).toContain("IMPLAUSIBLE_CHEMISTRY_C");
    expect(flagIds).toContain("IMPLAUSIBLE_YIELD_STRENGTH");
    expect(flagIds).toContain("IMPLAUSIBLE_ELONGATION");
    expect(flagIds).toContain("YIELD_EXCEEDS_TENSILE");
  });

  // 6. Carbon Equivalent Recalculation & Rounding Tolerance
  it("calculates IIW CEV and enforces ±0.02 documented rounding tolerance against printed CEV", () => {
    // Formula: C + Mn/6 + (Cr+Mo+V)/5 + (Ni+Cu)/15
    const chem = {
      C: { value: 0.16 },
      Mn: { value: 1.20 }, // 1.20 / 6 = 0.20
      Cr: { value: 0.05 },
      Mo: { value: 0.02 },
      V: { value: 0.03 }, // (0.05 + 0.02 + 0.03) / 5 = 0.02
      Ni: { value: 0.03 },
      Cu: { value: 0.12 }, // (0.03 + 0.12) / 15 = 0.01
    };

    // Expected: 0.16 + 0.20 + 0.02 + 0.01 = 0.390
    const cevResult = recalculateIIWCarbonEquivalent(chem);
    expect(cevResult.is_applicable).toBe(true);
    expect(cevResult.value).toBe(0.39);

    // Test Tolerance Matching
    const matchingData: MTRExtraction = {
      mill_name: "Burns Harbor",
      heat_number: "H-1234",
      grade: "ASTM A572 Grade 50",
      standard: "ASTM A572",
      product_form: "Plate",
      melt_and_pour_country: "USA",
      chemistry: {
        C: { value: 0.16, unit: "% by weight" },
        Mn: { value: 1.20, unit: "% by weight" },
        Cr: { value: 0.05, unit: "% by weight" },
        Mo: { value: 0.02, unit: "% by weight" },
        V: { value: 0.03, unit: "% by weight" },
        Ni: { value: 0.03, unit: "% by weight" },
        Cu: { value: 0.12, unit: "% by weight" },
      },
      mechanical_properties: {
        yield_strength: { value: 54.0, unit: "ksi" },
        tensile_strength: { value: 72.0, unit: "ksi" },
        elongation_pct: { value: 22.0, unit: "%" },
        hardness: { value: null, scale: null },
        charpy_impact: { value: null, unit: null },
      },
      dimensions: { thickness_in: 0.5, width_in: 96, length_in: 240, weight_lbs: 3264 },
      printed_cev: 0.40, // Discrepancy is |0.40 - 0.39| = 0.01 <= 0.02
      unreadable_or_missing_fields: [],
      field_evidence: {},
      overall_confidence: "high",
    };

    const matchEval = evaluateMTRComplianceAndRisk(matchingData);
    expect(matchEval.cev_comparison.status).toBe("MATCH");
    expect(matchEval.flags.some((f) => f.id === "CEV_PRINTED_MISMATCH")).toBe(false);

    // Test Tolerance Mismatch (> 0.02)
    const mismatchData = { ...matchingData, printed_cev: 0.48 }; // Discrepancy 0.09 > 0.02
    const mismatchEval = evaluateMTRComplianceAndRisk(mismatchData);
    expect(mismatchEval.cev_comparison.status).toBe("MISMATCH");
    expect(mismatchEval.flags.some((f) => f.id === "CEV_PRINTED_MISMATCH")).toBe(true);
  });

  // 7. Duplicate Heat Check With Conflicting Mill & Grade
  it("flags duplicate heat numbers associated with conflicting mill or grade metadata", () => {
    const duplicateSample = SYNTHETIC_MTR_FIXTURES.find((s) => s.id === "demo-duplicate-conflict");
    expect(duplicateSample).toBeDefined();

    const mockExistingRegistry = [
      {
        heat_number: "H-784291",
        mill_name: "Burns Harbor Heavy Plate Works",
        grade: "ASTM A572 Grade 50",
        certificate_id: "c-prior-001",
      },
    ];

    const result = evaluateMTRComplianceAndRisk(duplicateSample!.data, {
      existingCertificates: mockExistingRegistry,
    });

    expect(result.duplicate_heat_check.is_duplicate).toBe(true);
    expect(result.duplicate_heat_check.conflicting_mill).toBe("Burns Harbor Heavy Plate Works");
    expect(result.flags.some((f) => f.id === "DUPLICATE_HEAT_CONFLICT")).toBe(true);
  });

  // 8. Unsupported Standard / Check Unavailable
  it("flags non-indexed standard as CHECK_UNAVAILABLE without punitive failure", () => {
    const unindexedSample = SYNTHETIC_MTR_FIXTURES.find((s) => s.id === "demo-unsupported-standard");
    expect(unindexedSample).toBeDefined();

    const result = evaluateMTRComplianceAndRisk(unindexedSample!.data);
    expect(result.grade_resolution.status).toBe("UNRESOLVED_STANDARD");

    const unavailFlag = result.flags.find((f) => f.category === "CHECK_UNAVAILABLE");
    expect(unavailFlag).toBeDefined();
    expect(unavailFlag?.id).toBe("UNRESOLVED_STANDARD");
    expect(unavailFlag?.weight).toBe(0); // Prompt: "flag the check as unavailable rather than failed"
  });

  // 9. Stress Unit Normalization (MPa to ksi)
  it("accurately normalizes metric stress units (MPa) to ksi for ASTM standard comparison", () => {
    // 355 MPa (standard S355 yield) = 355 / 6.894757 = ~51.49 ksi
    const ksiValue = normalizeStressToKsi(355, "MPa");
    expect(ksiValue).toBeCloseTo(51.49, 1);

    const psiValue = normalizeStressToKsi(50000, "psi");
    expect(psiValue).toBe(50.0);
  });

  // 10. Grade Resolution Accuracy
  it("resolves various grade notations to canonical knowledge base entries", () => {
    expect(resolveGrade("A572 Gr 50", "ASTM A572").resolved_grade_id).toBe("astm-a572-50");
    expect(resolveGrade("A36 Commercial Plate", "").resolved_grade_id).toBe("astm-a36");
    expect(resolveGrade("316L Stainless", "ASTM A240").resolved_grade_id).toBe("aisi-316l");
    expect(resolveGrade("4140 Annealed", "ASTM A29").resolved_grade_id).toBe("aisi-4140");
    expect(resolveGrade("Duplex 2205", "UNS S32205").resolved_grade_id).toBe("duplex-2205");
  });
});
