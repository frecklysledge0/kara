import { describe, it, expect } from "vitest";
import { 
  calculateIIWCarbonEquivalent, 
  calculatePcm, 
  calculatePREN 
} from "@/lib/engine/metallurgy";

describe("Metallurgy Engine Unit Tests", () => {
  it("calculates exact IIW CEV for A572 Grade 50 chemistry", () => {
    // C=0.18, Mn=1.15, Cr=0.04, Mo=0.01, V=0.035, Ni=0.03, Cu=0.12
    // CEV = 0.18 + (1.15/6) + ((0.04+0.01+0.035)/5) + ((0.03+0.12)/15)
    // 0.18 + 0.19167 + 0.017 + 0.010 = 0.39867 -> rounded 0.399
    const chem = {
      C: 0.18,
      Mn: 1.15,
      Cr: 0.04,
      Mo: 0.01,
      V: 0.035,
      Ni: 0.03,
      Cu: 0.12
    };

    const result = calculateIIWCarbonEquivalent(chem);
    expect(result.cev).toBeCloseTo(0.399, 2);
    expect(result.formula).toBe("IIW");
    expect(result.isEstimated).toBe(false);
    expect(result.missingElements).toHaveLength(0);
    expect(result.weldabilityRisk).toBe("LOW");
  });

  it("handles missing micro-alloying elements transparently with explicit estimation flag", () => {
    // Only C and Mn reported
    const chem = {
      C: 0.22,
      Mn: 0.90
    };

    const result = calculateIIWCarbonEquivalent(chem);
    expect(result.isEstimated).toBe(true);
    expect(result.missingElements).toContain("Cr");
    expect(result.missingElements).toContain("Mo");
    expect(result.missingElements).toContain("V");
    expect(result.missingElements).toContain("Ni");
    expect(result.missingElements).toContain("Cu");
    expect(result.cev).toBeCloseTo(0.22 + 0.90 / 6, 2);
  });

  it("classifies high-strength quenched and tempered alloy CEV as higher weldability risk", () => {
    // 4140 alloy steel (C=0.40, Mn=0.85, Cr=0.95, Mo=0.20)
    const chem = {
      C: 0.40,
      Mn: 0.85,
      Cr: 0.95,
      Mo: 0.20,
      V: 0.0,
      Ni: 0.0,
      Cu: 0.0
    };

    const result = calculateIIWCarbonEquivalent(chem);
    expect(result.cev).toBeGreaterThan(0.60);
    expect(result.weldabilityRisk).toBe("CRITICAL");
    expect(result.preheatRecommendation).toContain("Mandatory preheat");
  });

  it("calculates PREN accurately for 316L stainless steel and verifies marine suitability", () => {
    // Cr=16.85, Mo=2.18, N=0.042
    // PREN = 16.85 + (3.3 * 2.18) + (16 * 0.042) = 16.85 + 7.194 + 0.672 = 24.716 -> 24.7
    const chem = {
      Cr: 16.85,
      Mo: 2.18,
      N: 0.042
    };

    const result = calculatePREN(chem);
    expect(result.pren).toBe(24.7);
    expect(result.isMarineSuitable).toBe(true);
  });

  it("flags 304L stainless (no molybdenum) as non-marine benchmark", () => {
    // 304L typically has Mo=0.0
    const chem = {
      Cr: 18.20,
      Mo: 0.10,
      N: 0.03
    };

    const result = calculatePREN(chem);
    expect(result.pren).toBeLessThan(22.0);
    expect(result.isMarineSuitable).toBe(false);
  });
});
