import { describe, it, expect } from "vitest";
import { 
  checkElement, 
  evaluateChemicalCompliance, 
  evaluateMechanicalCompliance, 
  evaluateMTR 
} from "@/lib/engine/compliance";
import { GRADE_STANDARDS_REGISTRY } from "@/lib/data/standards";

describe("Deterministic ASTM Compliance Engine Tests", () => {
  const a572Grade = GRADE_STANDARDS_REGISTRY["astm-a572-50"];
  const a516Grade = GRADE_STANDARDS_REGISTRY["astm-a516-70"];

  it("passes fully compliant ASTM A572-50 heat chemistry and tensile pull test", () => {
    const chem = {
      C: 0.18,
      Mn: 1.15,
      P: 0.015,
      S: 0.008,
      Si: 0.24,
      V: 0.035,
      Nb: 0.021,
      Cr: 0.04,
      Ni: 0.03,
      Mo: 0.01,
      Cu: 0.12
    };

    const mech = {
      yield_strength_ksi: 54.8,
      tensile_strength_ksi: 72.4,
      elongation_pct: 23.5
    };

    const result = evaluateMTR(chem, mech, a572Grade);
    expect(result.status).toBe("PASS");
    expect(result.standards_met).toContain(a572Grade.grade_name);
    expect(result.flags).toHaveLength(0);
  });

  it("fails deterministically when carbon content exceeds ASTM maximum", () => {
    // A572-50 maximum C is 0.23%
    const chem = {
      C: 0.26, // EXCEEDS 0.23%
      Mn: 1.15,
      P: 0.015,
      S: 0.008,
      Si: 0.24,
      V: 0.035,
      Nb: 0.021
    };

    const mech = {
      yield_strength_ksi: 54.8,
      tensile_strength_ksi: 72.4,
      elongation_pct: 23.5
    };

    const result = evaluateMTR(chem, mech, a572Grade);
    expect(result.status).toBe("FAIL");
    expect(result.flags.some((f) => f.includes("Chemical Out-of-Spec: C"))).toBe(true);
  });

  it("flags marginal chemical limits when element is within 5% of boundary", () => {
    const elementCheck = checkElement("C", 0.228, { max: 0.23 });
    expect(elementCheck.status).toBe("MARGINAL");
    expect(elementCheck.note).toContain("Near upper limit");
  });

  it("fails deterministically when yield strength falls below minimum required", () => {
    const chem = {
      C: 0.18,
      Mn: 1.15,
      P: 0.015,
      S: 0.008,
      Si: 0.24,
      V: 0.035,
      Nb: 0.021
    };

    // A572 Gr 50 requires min 50.0 ksi
    const mech = {
      yield_strength_ksi: 47.5, // UNDER 50.0 ksi
      tensile_strength_ksi: 68.0,
      elongation_pct: 22.0
    };

    const result = evaluateMTR(chem, mech, a572Grade);
    expect(result.status).toBe("FAIL");
    expect(result.flags.some((f) => f.includes("Yield Strength"))).toBe(true);
  });

  it("fails deterministically when elongation fails ductileness specification", () => {
    const chem = {
      C: 0.18,
      Mn: 1.15,
      P: 0.015,
      S: 0.008,
      Si: 0.24,
      V: 0.035,
      Nb: 0.021
    };

    // A572 Gr 50 requires min 18.0%
    const mech = {
      yield_strength_ksi: 52.0,
      tensile_strength_ksi: 70.0,
      elongation_pct: 14.5 // BELOW 18.0%
    };

    const result = evaluateMTR(chem, mech, a572Grade);
    expect(result.status).toBe("FAIL");
    expect(result.flags.some((f) => f.includes("Elongation"))).toBe(true);
  });

  it("evaluates PVQ Charpy V-Notch low temperature impact requirements for A516 Gr 70", () => {
    const chem = {
      C: 0.22,
      Mn: 1.10,
      P: 0.012,
      S: 0.004,
      Si: 0.28
    };

    // A516-70 PVQ requires 20 ft-lbs @ -50°F
    const passingMech = {
      yield_strength_ksi: 46.2,
      tensile_strength_ksi: 78.9,
      elongation_pct: 27.0,
      charpy_avg_ft_lbs: 38.0 // Passes 20 ft-lbs
    };

    const passingResult = evaluateMTR(chem, passingMech, a516Grade);
    expect(passingResult.status).toBe("PASS");

    const failingMech = {
      yield_strength_ksi: 46.2,
      tensile_strength_ksi: 78.9,
      elongation_pct: 27.0,
      charpy_avg_ft_lbs: 14.0 // FAILS: under 20 ft-lbs
    };

    const failingResult = evaluateMTR(chem, failingMech, a516Grade);
    expect(failingResult.status).toBe("FAIL");
    expect(failingResult.flags.some((f) => f.includes("Charpy Impact"))).toBe(true);
  });
});
