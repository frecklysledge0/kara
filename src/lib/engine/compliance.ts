import { 
  ChemicalAnalysis, 
  ChemistrySpec, 
  MechanicalResults, 
  MechanicalSpec, 
  GradeStandard, 
  ElementComplianceCheck, 
  MechanicalComplianceCheck, 
  MTRQCSummary 
} from "@/types/steel";
import { calculateIIWCarbonEquivalent } from "./metallurgy";

/**
 * Evaluates an individual chemical element against ASTM specified bounds.
 */
export function checkElement(
  element: string,
  actual: number,
  limits: { min?: number; max?: number }
): ElementComplianceCheck {
  const { min, max } = limits;

  // Below minimum requirement
  if (min !== undefined && actual < min) {
    return {
      element,
      actual,
      min,
      max,
      status: "FAIL",
      note: `Below specified minimum ${min}% (actual: ${actual}%)`
    };
  }

  // Above maximum requirement
  if (max !== undefined && actual > max) {
    return {
      element,
      actual,
      min,
      max,
      status: "FAIL",
      note: `Exceeds specified maximum ${max}% (actual: ${actual}%)`
    };
  }

  // Marginal check: within 5% of maximum boundary
  if (max !== undefined && actual >= max * 0.95) {
    return {
      element,
      actual,
      min,
      max,
      status: "MARGINAL",
      note: `Near upper limit (within 5% of ${max}%)`
    };
  }

  return {
    element,
    actual,
    min,
    max,
    status: "PASS"
  };
}

/**
 * Deterministically checks all chemical elements against grade specification.
 */
export function evaluateChemicalCompliance(
  actualChem: ChemicalAnalysis,
  spec: ChemistrySpec
): {
  overallStatus: "PASS" | "FAIL" | "MARGINAL";
  checks: ElementComplianceCheck[];
  missingElements: string[];
  flags: string[];
} {
  const checks: ElementComplianceCheck[] = [];
  const missingElements: string[] = [];
  const flags: string[] = [];

  let hasFail = false;
  let hasMarginal = false;

  for (const [element, limits] of Object.entries(spec)) {
    const actualVal = actualChem[element];

    if (actualVal === undefined) {
      // Element is in ASTM spec but not reported on MTR
      missingElements.push(element);
      flags.push(`Element ${element} is defined in standard but omitted in MTR.`);
    } else {
      const check = checkElement(element, actualVal, limits);
      checks.push(check);

      if (check.status === "FAIL") {
        hasFail = true;
        flags.push(`Chemical Out-of-Spec: ${element} ${actualVal}% violates [${limits.min ?? "0"} - ${limits.max ?? "unlimited"}]%`);
      } else if (check.status === "MARGINAL") {
        hasMarginal = true;
      }
    }
  }

  const overallStatus = hasFail ? "FAIL" : hasMarginal ? "MARGINAL" : "PASS";

  return {
    overallStatus,
    checks,
    missingElements,
    flags
  };
}

/**
 * Deterministically checks mechanical pull and impact test results.
 */
export function evaluateMechanicalCompliance(
  actualMech: MechanicalResults,
  spec: MechanicalSpec
): {
  overallStatus: "PASS" | "FAIL";
  checks: MechanicalComplianceCheck[];
  flags: string[];
} {
  const checks: MechanicalComplianceCheck[] = [];
  const flags: string[] = [];
  let hasFail = false;

  // 1. Yield Strength
  if (spec.yield_min_ksi !== undefined) {
    const pass = actualMech.yield_strength_ksi >= spec.yield_min_ksi &&
      (spec.yield_max_ksi === undefined || actualMech.yield_strength_ksi <= spec.yield_max_ksi);
    
    if (!pass) {
      hasFail = true;
      flags.push(`Yield Strength ${actualMech.yield_strength_ksi} ksi does not meet [${spec.yield_min_ksi} - ${spec.yield_max_ksi ?? "inf"}] ksi requirement.`);
    }

    checks.push({
      property: "Yield Strength",
      actual: actualMech.yield_strength_ksi,
      min: spec.yield_min_ksi,
      max: spec.yield_max_ksi,
      unit: "ksi",
      status: pass ? "PASS" : "FAIL",
      note: pass ? undefined : "Below minimum yield limit"
    });
  }

  // 2. Tensile Strength
  if (spec.tensile_min_ksi !== undefined) {
    const pass = actualMech.tensile_strength_ksi >= spec.tensile_min_ksi &&
      (spec.tensile_max_ksi === undefined || actualMech.tensile_strength_ksi <= spec.tensile_max_ksi);

    if (!pass) {
      hasFail = true;
      flags.push(`Tensile Strength ${actualMech.tensile_strength_ksi} ksi outside [${spec.tensile_min_ksi} - ${spec.tensile_max_ksi ?? "inf"}] ksi bound.`);
    }

    checks.push({
      property: "Tensile Strength",
      actual: actualMech.tensile_strength_ksi,
      min: spec.tensile_min_ksi,
      max: spec.tensile_max_ksi,
      unit: "ksi",
      status: pass ? "PASS" : "FAIL"
    });
  }

  // 3. Elongation %
  if (spec.elongation_min_pct !== undefined) {
    const pass = actualMech.elongation_pct >= spec.elongation_min_pct;
    if (!pass) {
      hasFail = true;
      flags.push(`Elongation ${actualMech.elongation_pct}% is below ${spec.elongation_min_pct}% minimum.`);
    }

    checks.push({
      property: "Elongation (2-in gage)",
      actual: actualMech.elongation_pct,
      min: spec.elongation_min_pct,
      unit: "%",
      status: pass ? "PASS" : "FAIL"
    });
  }

  // 4. Hardness HBW (if tested)
  if (spec.hardness_max_hbw !== undefined && actualMech.hardness_hbw !== undefined) {
    const pass = actualMech.hardness_hbw <= spec.hardness_max_hbw;
    if (!pass) {
      hasFail = true;
      flags.push(`Hardness ${actualMech.hardness_hbw} HBW exceeds ${spec.hardness_max_hbw} HBW maximum.`);
    }

    checks.push({
      property: "Brinell Hardness",
      actual: actualMech.hardness_hbw,
      max: spec.hardness_max_hbw,
      unit: "HBW",
      status: pass ? "PASS" : "FAIL"
    });
  }

  // 5. Charpy V-Notch Impact (if spec requires)
  if (spec.charpy_min_ft_lbs !== undefined) {
    const actualImpact = actualMech.charpy_avg_ft_lbs ?? 0;
    const pass = actualImpact >= spec.charpy_min_ft_lbs;
    if (!pass) {
      hasFail = true;
      flags.push(`Charpy Impact ${actualImpact} ft-lbs below ${spec.charpy_min_ft_lbs} ft-lbs @ ${spec.charpy_temp_f ?? -20}°F requirement.`);
    }

    checks.push({
      property: `Charpy Impact @ ${spec.charpy_temp_f ?? -20}°F`,
      actual: actualImpact,
      min: spec.charpy_min_ft_lbs,
      unit: "ft-lbs",
      status: pass ? "PASS" : "FAIL"
    });
  }

  return {
    overallStatus: hasFail ? "FAIL" : "PASS",
    checks,
    flags
  };
}

/**
 * Audits complete MTR dataset against an ASTM Grade Standard.
 * Generates the deterministic MTRQCSummary.
 */
export function evaluateMTR(
  actualChem: ChemicalAnalysis,
  actualMech: MechanicalResults,
  standard: GradeStandard
): MTRQCSummary {
  const chemResult = evaluateChemicalCompliance(actualChem, standard.chem_limits);
  const mechResult = evaluateMechanicalCompliance(actualMech, standard.mech_limits);

  const cevResult = calculateIIWCarbonEquivalent(actualChem);

  const allFlags = [...chemResult.flags, ...mechResult.flags];

  // CEV threshold check
  if (standard.max_cev !== undefined && cevResult.cev > standard.max_cev) {
    allFlags.push(`Carbon Equivalent CEV ${cevResult.cev} exceeds standard limit of ${standard.max_cev}.`);
  }

  let finalStatus: MTRQCSummary["status"] = "PASS";
  if (chemResult.overallStatus === "FAIL" || mechResult.overallStatus === "FAIL") {
    finalStatus = "FAIL";
  } else if (chemResult.overallStatus === "MARGINAL" || chemResult.missingElements.length > 0) {
    finalStatus = "REVIEW_REQUIRED";
  }

  return {
    status: finalStatus,
    standards_met: finalStatus === "PASS" ? [standard.grade_name] : [],
    cev_evaluation: `Calculated CEV: ${cevResult.cev} (${cevResult.weldabilityRisk} weldability risk). ${cevResult.preheatRecommendation}`,
    weldability: standard.weldability_rating,
    chemistry_checks: chemResult.checks,
    mechanical_checks: mechResult.checks,
    flags: allFlags
  };
}
