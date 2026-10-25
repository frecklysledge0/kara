import { describe, expect, it } from "vitest";
import { normalizeMTRExtraction, toNumberOrNull } from "@/lib/engine/mtr-normalize";
import { evaluateMTRComplianceAndRisk } from "@/lib/engine/mtr-qc";

describe("MTR extraction normalization (photo / scan robustness)", () => {
  it("parses numbers from text and keeps missing values null", () => {
    expect(toNumberOrNull("0.18")).toBe(0.18);
    expect(toNumberOrNull("<0.005")).toBe(0.005);
    expect(toNumberOrNull("36 ksi")).toBe(36);
    expect(toNumberOrNull("1,200")).toBe(1200);
    expect(toNumberOrNull("n/a")).toBeNull();
    expect(toNumberOrNull(null)).toBeNull();
  });

  it("does not crash the QC engine when the model returns nulls and text values", () => {
    const messy = {
      mill_name: "Demo Mill",
      heat_number: 123456,
      grade: "A36",
      chemistry: { C: "0.18", Mn: { value: "0.85" }, P: null, S: 0.01 },
      mechanical_properties: { yield_strength: null, tensile_strength: "65 ksi", elongation_pct: { value: null } },
      dimensions: null,
      field_evidence: { heat_number: { quote: "Heat 123456", confidence: "weird" } },
    };
    const mtr = normalizeMTRExtraction(messy, "recovered");
    expect(mtr.heat_number).toBe("123456");
    expect(mtr.chemistry.C.value).toBe(0.18);
    expect(mtr.chemistry.Mn.value).toBe(0.85);
    expect(mtr.chemistry.P.value).toBeNull();
    expect(mtr.mechanical_properties.yield_strength.value).toBeNull();
    expect(mtr.mechanical_properties.tensile_strength.value).toBe(65);
    expect(mtr.dimensions.thickness_in).toBeNull();
    expect(() => evaluateMTRComplianceAndRisk(mtr, { existingCertificates: [] })).not.toThrow();
  });

  it("handles a completely empty or non-object response", () => {
    for (const raw of [null, undefined, "garbage", [], {}]) {
      const mtr = normalizeMTRExtraction(raw);
      expect(mtr.mechanical_properties.yield_strength).toEqual(expect.objectContaining({ value: null }));
      expect(() => evaluateMTRComplianceAndRisk(mtr, { existingCertificates: [] })).not.toThrow();
    }
  });
});
