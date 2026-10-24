// =====================================================================
// MillProof: Deterministic Material Test Certificate QC Rules Engine
// Pure mathematical & rule-based compliance evaluation against published standards.
// Zero AI hallucination. Independently testable.
// =====================================================================

import {
  MTRExtraction,
  MTRReviewResult,
  MTRQCFlag,
  CEVRecalculationResult,
  CEVComparisonResult,
  DuplicateHeatCheckResult,
  GradeResolutionResult,
} from "@/types/mtr";
import { CURATED_GRADES } from "@/lib/data/grades";
import { SteelGradeEntry } from "@/types/grades";

export interface DuplicateHeatRecord {
  heat_number: string;
  mill_name: string;
  grade: string;
  certificate_id?: string;
}

/**
 * Normalizes tensile and yield strength to ksi for apples-to-apples comparison.
 * 1 ksi = 1000 psi = 6.894757 MPa
 */
export function normalizeStressToKsi(val: number, unit?: string): number {
  if (!unit) return val;
  const u = unit.toLowerCase().trim();
  if (u === "mpa" || u === "n/mm2" || u === "n/mm²") {
    return Number((val / 6.894757).toFixed(2));
  }
  if (u === "psi") {
    return Number((val / 1000).toFixed(2));
  }
  return val; // Assume ksi
}

/**
 * Resolves extracted grade and standard strings against the curated knowledge base.
 */
export function resolveGrade(gradeStr?: string | null, standardStr?: string | null): GradeResolutionResult {
  const combined = `${gradeStr || ""} ${standardStr || ""}`.toLowerCase().trim();

  if (!combined) {
    return {
      resolved_grade_id: null,
      grade_name: null,
      applicable_standard: null,
      status: "UNRESOLVED_STANDARD",
      source: null,
    };
  }

  // Exact or fuzzy match against curated grades
  for (const entry of CURATED_GRADES) {
    const canonical = entry.canonical_name.toLowerCase();
    const id = entry.id.toLowerCase();
    const standard = entry.applicable_standard.toLowerCase();
    const uns = (entry.uns_number || "").toLowerCase();

    if (
      combined.includes(canonical) ||
      combined.includes(id) ||
      combined.includes(uns) ||
      combined.includes(standard) ||
      (entry.id === "astm-a572-50" && (combined.includes("572") || combined.includes("grade 50") || combined.includes("gr 50") || combined.includes("gr. 50"))) ||
      (entry.id === "astm-a36" && combined.includes("a36")) ||
      (entry.id === "astm-a588" && (combined.includes("a588") || combined.includes("weathering"))) ||
      (entry.id === "sae-1018" && combined.includes("1018")) ||
      (entry.id === "sae-1045" && combined.includes("1045")) ||
      (entry.id === "aisi-4140" && combined.includes("4140")) ||
      (entry.id === "aisi-304" && combined.includes("304")) ||
      (entry.id === "aisi-316l" && (combined.includes("316l") || combined.includes("316-l") || combined.includes("316"))) ||
      (entry.id === "aisi-409" && combined.includes("409")) ||
      ((entry.id === "duplex-2205" || entry.id === "uns-s32205") && (combined.includes("2205") || combined.includes("s32205") || combined.includes("s31803") || combined.includes("duplex")))
    ) {
      return {
        resolved_grade_id: entry.id,
        grade_name: entry.canonical_name,
        applicable_standard: entry.applicable_standard,
        status: "RESOLVED",
        source: entry.chemistry_limits.source,
      };
    }
  }

  return {
    resolved_grade_id: null,
    grade_name: gradeStr || "Unresolved Grade",
    applicable_standard: standardStr || null,
    status: "UNRESOLVED_STANDARD",
    source: null,
  };
}

/**
 * Calculates International Institute of Welding (IIW) Carbon Equivalent:
 * CEV = C + Mn/6 + (Cr + Mo + V)/5 + (Ni + Cu)/15
 */
export function recalculateIIWCarbonEquivalent(
  chemistry: Record<string, { value: number | null }>
): CEVRecalculationResult {
  const getVal = (el: string): number | null => {
    // Check uppercase and variations
    const direct = chemistry[el]?.value ?? chemistry[el.toUpperCase()]?.value;
    return typeof direct === "number" && !isNaN(direct) ? direct : null;
  };

  const c = getVal("C");
  const mn = getVal("Mn");
  const cr = getVal("Cr") ?? 0;
  const mo = getVal("Mo") ?? 0;
  const v = getVal("V") ?? 0;
  const ni = getVal("Ni") ?? 0;
  const cu = getVal("Cu") ?? 0;

  const elementsUsed: string[] = [];
  const missingElements: string[] = [];

  if (c !== null) elementsUsed.push("C"); else missingElements.push("C");
  if (mn !== null) elementsUsed.push("Mn"); else missingElements.push("Mn");
  if (getVal("Cr") !== null) elementsUsed.push("Cr"); else missingElements.push("Cr");
  if (getVal("Mo") !== null) elementsUsed.push("Mo"); else missingElements.push("Mo");
  if (getVal("V") !== null) elementsUsed.push("V"); else missingElements.push("V");
  if (getVal("Ni") !== null) elementsUsed.push("Ni"); else missingElements.push("Ni");
  if (getVal("Cu") !== null) elementsUsed.push("Cu"); else missingElements.push("Cu");

  // If Carbon is missing or Mn is missing, formula cannot be evaluated meaningfully
  if (c === null || mn === null) {
    return {
      value: null,
      formula: "IIW",
      is_applicable: false,
      elements_used: elementsUsed,
      missing_elements: missingElements,
      weldability_note: "Insufficient chemistry data: Carbon (C) and Manganese (Mn) are mandatory to calculate IIW CEV.",
    };
  }

  const rawCev = c + (mn / 6) + ((cr + mo + v) / 5) + ((ni + cu) / 15);
  const cev = Number(rawCev.toFixed(3));

  let note = "Low crack susceptibility (CEV <= 0.40). Standard welding procedures apply.";
  if (cev > 0.47) {
    note = "High crack susceptibility (CEV > 0.47). Preheating and low-hydrogen electrodes mandatory under AWS D1.1.";
  } else if (cev > 0.40) {
    note = "Moderate crack susceptibility (CEV 0.41 - 0.47). Preheat recommended depending on plate thickness.";
  }

  return {
    value: cev,
    formula: "IIW",
    is_applicable: true,
    elements_used: elementsUsed,
    missing_elements: missingElements,
    weldability_note: note,
  };
}

/**
 * Deterministically audits extracted MTR data against source-backed rules.
 */
export function evaluateMTRComplianceAndRisk(
  mtr: MTRExtraction,
  options?: {
    existingCertificates?: DuplicateHeatRecord[];
    currentCertificateId?: string;
  }
): MTRReviewResult {
  const flags: MTRQCFlag[] = [];
  let completenessPenalty = 0;
  let specPenalty = 0;
  let warningPenalty = 0;

  // 1. DATA COMPLETENESS CHECKS
  // Heat number
  if (!mtr.heat_number || mtr.heat_number.trim() === "" || mtr.heat_number.toLowerCase().includes("unknown")) {
    flags.push({
      id: "MISSING_HEAT_NUMBER",
      category: "DATA_COMPLETENESS",
      severity: "FAIL",
      title: "Missing Heat / Melt Number",
      explanation: "Ladle or melt heat number is not present or unreadable. Traceability cannot be verified.",
      field: "heat_number",
      weight: 20,
    });
    completenessPenalty += 20;
  }

  // Mill name
  if (!mtr.mill_name || mtr.mill_name.trim() === "" || mtr.mill_name.toLowerCase().includes("unknown")) {
    flags.push({
      id: "MISSING_MILL_NAME",
      category: "DATA_COMPLETENESS",
      severity: "WARNING",
      title: "Missing Mill / Manufacturer Name",
      explanation: "Producing steel mill name is missing or could not be determined.",
      field: "mill_name",
      weight: 15,
    });
    completenessPenalty += 15;
  }

  // Product form
  if (!mtr.product_form || mtr.product_form.trim() === "") {
    flags.push({
      id: "MISSING_PRODUCT_FORM",
      category: "DATA_COMPLETENESS",
      severity: "INFO",
      title: "Product Form Not Specified",
      explanation: "Material shape (e.g., Plate, Coil, Beam, Tube) was not explicitly identified on the certificate.",
      field: "product_form",
      weight: 5,
    });
    completenessPenalty += 5;
  }

  // Melt and Pour country
  if (!mtr.melt_and_pour_country || mtr.melt_and_pour_country.trim() === "") {
    flags.push({
      id: "MISSING_MELT_POUR_COUNTRY",
      category: "DATA_COMPLETENESS",
      severity: "INFO",
      title: "Melt & Pour Country Not Explicitly Stated",
      explanation: "Country of melt and pour was not explicitly found in the document text. Relevant for Buy America / BABA compliance.",
      field: "melt_and_pour_country",
      weight: 5,
    });
    completenessPenalty += 5;
  }

  // Unreadable or missing fields explicitly reported
  if (mtr.unreadable_or_missing_fields && mtr.unreadable_or_missing_fields.length > 0) {
    for (const field of mtr.unreadable_or_missing_fields) {
      flags.push({
        id: `UNREADABLE_FIELD_${field.toUpperCase().replace(/\s+/g, "_")}`,
        category: "DATA_COMPLETENESS",
        severity: "WARNING",
        title: `Unreadable Document Section: ${field}`,
        explanation: `Section '${field}' was marked illegible, blurred, or obscured on the original document.`,
        field: "unreadable_or_missing_fields",
        weight: 10,
      });
      completenessPenalty += 10;
    }
  }

  // Overall confidence warning
  if (mtr.overall_confidence === "low") {
    flags.push({
      id: "LOW_EXTRACTION_CONFIDENCE",
      category: "REVIEW_WARNING",
      severity: "WARNING",
      title: "Low Document Extraction Confidence",
      explanation: mtr.confidence_notes || "Document visual quality or text legibility was poor. Human verification is strongly recommended.",
      field: "overall_confidence",
      weight: 15,
    });
    warningPenalty += 15;
  }

  // 2. GRADE RESOLUTION & STANDARD CHECKS
  const gradeResolution = resolveGrade(mtr.grade, mtr.standard);
  let targetGrade: SteelGradeEntry | undefined;

  if (gradeResolution.status === "RESOLVED" && gradeResolution.resolved_grade_id) {
    targetGrade = CURATED_GRADES.find((g) => g.id === gradeResolution.resolved_grade_id);
  }

  if (!targetGrade) {
    flags.push({
      id: "UNRESOLVED_STANDARD",
      category: "CHECK_UNAVAILABLE",
      severity: "INFO",
      title: "Reference Limits Unavailable",
      explanation: `Material grade '${mtr.grade || "Unspecified"}' (${mtr.standard || "No Standard"}) is not indexed in the MillProof curated knowledge base. Automated ASTM/SAE bound verification cannot be performed. Flagged as check unavailable rather than failed.`,
      field: "grade",
      weight: 0,
    });
  }

  // 3. CHEMICAL COMPOSITION CHECKS
  const chemKeys = Object.keys(mtr.chemistry || {});
  if (chemKeys.length === 0) {
    flags.push({
      id: "MISSING_CHEMISTRY",
      category: "DATA_COMPLETENESS",
      severity: "FAIL",
      title: "Missing Chemical Ladle Analysis",
      explanation: "No chemical ladle analysis was extracted from the certificate. Chemistry is required for grade qualification.",
      field: "chemistry",
      weight: 25,
    });
    completenessPenalty += 25;
  } else {
    // Plausibility checks on chemistry
    for (const [el, data] of Object.entries(mtr.chemistry)) {
      if (data.value !== null) {
        if (data.value < 0 || data.value > 100) {
          flags.push({
            id: `IMPLAUSIBLE_CHEMISTRY_${el.toUpperCase()}`,
            category: "SPEC_INCONSISTENCY",
            severity: "FAIL",
            title: `Implausible Chemical Value for ${el}`,
            explanation: `Reported ${el} concentration of ${data.value}% is outside physical 0-100% bounds.`,
            field: `chemistry.${el}`,
            weight: 20,
          });
          specPenalty += 20;
        }
      }
    }

    // If grade is resolved, check against source-backed chemistry bounds
    if (targetGrade) {
      const specElements = targetGrade.chemistry_limits.elements;

      for (const [el, limits] of Object.entries(specElements)) {
        // Find extracted value (case-insensitive)
        const matchKey = Object.keys(mtr.chemistry).find(
          (k) => k.toLowerCase() === el.toLowerCase()
        );
        const extracted = matchKey ? mtr.chemistry[matchKey] : undefined;

        if (!extracted || extracted.value === null) {
          // If element has a mandatory minimum or is major (C, Mn, P, S), note omission
          if (limits.min !== null || ["C", "Mn", "P", "S"].includes(el)) {
            flags.push({
              id: `CHEM_ELEMENT_OMITTED_${el.toUpperCase()}`,
              category: "DATA_COMPLETENESS",
              severity: "INFO",
              title: `Element ${el} Defined in Standard but Omitted`,
              explanation: `${targetGrade.canonical_name} standard (${targetGrade.chemistry_limits.source}) specifies limits for ${el}, but it is omitted on this certificate.`,
              field: `chemistry.${el}`,
              weight: 5,
            });
            completenessPenalty += 5;
          }
        } else {
          const val = extracted.value;
          // Check maximum
          if (limits.max !== null && val > limits.max) {
            flags.push({
              id: `CHEM_EXCEEDS_MAX_${el.toUpperCase()}`,
              category: "SPEC_INCONSISTENCY",
              severity: "FAIL",
              title: `Chemical Out-of-Spec: ${el} Exceeds Maximum`,
              explanation: `Reported ${el} concentration of ${val}% exceeds the ${limits.max}% maximum specified by ${targetGrade.chemistry_limits.source}.`,
              field: `chemistry.${el}`,
              weight: 25,
            });
            specPenalty += 25;
          } else if (limits.max !== null && val >= limits.max * 0.95) {
            // Marginal check
            flags.push({
              id: `CHEM_MARGINAL_MAX_${el.toUpperCase()}`,
              category: "REVIEW_WARNING",
              severity: "WARNING",
              title: `Marginal Chemistry: ${el} Near Upper Limit`,
              explanation: `Reported ${el} of ${val}% is within 5% of allowable maximum (${limits.max}%).`,
              field: `chemistry.${el}`,
              weight: 5,
            });
            warningPenalty += 5;
          }

          // Check minimum
          if (limits.min !== null && val < limits.min) {
            flags.push({
              id: `CHEM_BELOW_MIN_${el.toUpperCase()}`,
              category: "SPEC_INCONSISTENCY",
              severity: "FAIL",
              title: `Chemical Out-of-Spec: ${el} Below Minimum`,
              explanation: `Reported ${el} concentration of ${val}% is below the ${limits.min}% minimum required by ${targetGrade.chemistry_limits.source}.`,
              field: `chemistry.${el}`,
              weight: 25,
            });
            specPenalty += 25;
          }
        }
      }
    }
  }

  // 4. MECHANICAL PROPERTIES CHECKS
  const mech = mtr.mechanical_properties;
  const yieldVal = mech.yield_strength.value;
  const tensileVal = mech.tensile_strength.value;
  const elongVal = mech.elongation_pct.value;

  // Missing mechanical tests
  if (yieldVal === null && tensileVal === null) {
    flags.push({
      id: "MISSING_MECHANICAL_TESTS",
      category: "DATA_COMPLETENESS",
      severity: "FAIL",
      title: "Missing Mechanical Tensile Tests",
      explanation: "No tensile or yield pull test results were extracted from the certificate.",
      field: "mechanical_properties",
      weight: 25,
    });
    completenessPenalty += 25;
  }

  // Plausibility & unit checks
  if (yieldVal !== null) {
    const yieldKsi = normalizeStressToKsi(yieldVal, mech.yield_strength.unit);
    if (yieldKsi < 15 || yieldKsi > 400) {
      flags.push({
        id: "IMPLAUSIBLE_YIELD_STRENGTH",
        category: "SPEC_INCONSISTENCY",
        severity: "FAIL",
        title: "Implausible Yield Strength Value / Unit Mismatch",
        explanation: `Reported yield strength of ${yieldVal} ${mech.yield_strength.unit} (${yieldKsi} ksi normalized) is outside standard physical bounds for steel (15–400 ksi).`,
        field: "mechanical_properties.yield_strength",
        weight: 20,
      });
      specPenalty += 20;
    }
  }

  if (tensileVal !== null) {
    const tensileKsi = normalizeStressToKsi(tensileVal, mech.tensile_strength.unit);
    if (tensileKsi < 20 || tensileKsi > 500) {
      flags.push({
        id: "IMPLAUSIBLE_TENSILE_STRENGTH",
        category: "SPEC_INCONSISTENCY",
        severity: "FAIL",
        title: "Implausible Tensile Strength Value / Unit Mismatch",
        explanation: `Reported tensile strength of ${tensileVal} ${mech.tensile_strength.unit} (${tensileKsi} ksi normalized) is outside standard physical bounds for steel (20–500 ksi).`,
        field: "mechanical_properties.tensile_strength",
        weight: 20,
      });
      specPenalty += 20;
    }
  }

  if (elongVal !== null) {
    if (elongVal <= 0 || elongVal > 80) {
      flags.push({
        id: "IMPLAUSIBLE_ELONGATION",
        category: "SPEC_INCONSISTENCY",
        severity: "FAIL",
        title: "Implausible Elongation Value",
        explanation: `Reported elongation of ${elongVal}% is outside standard physical ductility bounds (1–80%).`,
        field: "mechanical_properties.elongation_pct",
        weight: 15,
      });
      specPenalty += 15;
    }
  }

  // Yield cannot exceed Tensile strength
  if (yieldVal !== null && tensileVal !== null) {
    const yKsi = normalizeStressToKsi(yieldVal, mech.yield_strength.unit);
    const tKsi = normalizeStressToKsi(tensileVal, mech.tensile_strength.unit);
    if (yKsi > tKsi) {
      flags.push({
        id: "YIELD_EXCEEDS_TENSILE",
        category: "SPEC_INCONSISTENCY",
        severity: "FAIL",
        title: "Conflicting Mechanical Properties: Yield Exceeds Tensile",
        explanation: `Extracted yield strength (${yKsi} ksi) is higher than tensile strength (${tKsi} ksi), which is physically impossible in monotonic tensile testing.`,
        field: "mechanical_properties",
        weight: 25,
      });
      specPenalty += 25;
    }
  }

  // Check mechanicals against resolved standard
  if (targetGrade) {
    const specMech = targetGrade.mechanical_properties;

    // Yield check
    if (yieldVal !== null && specMech.yield_strength.min !== null) {
      const actualYieldKsi = normalizeStressToKsi(yieldVal, mech.yield_strength.unit);
      const reqMin = specMech.yield_strength.min;
      if (actualYieldKsi < reqMin) {
        flags.push({
          id: "YIELD_BELOW_SPEC_MIN",
          category: "SPEC_INCONSISTENCY",
          severity: "FAIL",
          title: "Yield Strength Below Standard Minimum",
          explanation: `Reported yield strength ${actualYieldKsi} ksi is below the ${reqMin} ksi minimum required by ${targetGrade.canonical_name} (${specMech.yield_strength.condition}).`,
          field: "mechanical_properties.yield_strength",
          weight: 25,
        });
        specPenalty += 25;
      }
    }

    // Tensile check
    if (tensileVal !== null) {
      const actualTensileKsi = normalizeStressToKsi(tensileVal, mech.tensile_strength.unit);
      if (specMech.tensile_strength.min !== null && actualTensileKsi < specMech.tensile_strength.min) {
        flags.push({
          id: "TENSILE_BELOW_SPEC_MIN",
          category: "SPEC_INCONSISTENCY",
          severity: "FAIL",
          title: "Tensile Strength Below Standard Minimum",
          explanation: `Reported tensile strength ${actualTensileKsi} ksi is below the ${specMech.tensile_strength.min} ksi minimum required by ${targetGrade.canonical_name}.`,
          field: "mechanical_properties.tensile_strength",
          weight: 25,
        });
        specPenalty += 25;
      }
      if (specMech.tensile_strength.max !== null && actualTensileKsi > specMech.tensile_strength.max) {
        flags.push({
          id: "TENSILE_EXCEEDS_SPEC_MAX",
          category: "SPEC_INCONSISTENCY",
          severity: "FAIL",
          title: "Tensile Strength Exceeds Standard Maximum",
          explanation: `Reported tensile strength ${actualTensileKsi} ksi exceeds the ${specMech.tensile_strength.max} ksi maximum allowable by ${targetGrade.canonical_name}.`,
          field: "mechanical_properties.tensile_strength",
          weight: 20,
        });
        specPenalty += 20;
      }
    }

    // Elongation check
    if (elongVal !== null && specMech.elongation_pct.min !== null) {
      if (elongVal < specMech.elongation_pct.min) {
        flags.push({
          id: "ELONGATION_BELOW_SPEC_MIN",
          category: "SPEC_INCONSISTENCY",
          severity: "FAIL",
          title: "Elongation Below Standard Minimum",
          explanation: `Reported elongation ${elongVal}% falls below the ${specMech.elongation_pct.min}% minimum ductility required by ${targetGrade.canonical_name}.`,
          field: "mechanical_properties.elongation_pct",
          weight: 15,
        });
        specPenalty += 15;
      }
    }
  }

  // 5. CARBON EQUIVALENT RECALCULATION & COMPARISON
  const recalculatedCev = recalculateIIWCarbonEquivalent(mtr.chemistry);
  const printedCev = mtr.printed_cev;
  let cevComparison: CEVComparisonResult;

  if (printedCev !== null && recalculatedCev.value !== null) {
    const discrepancy = Number(Math.abs(printedCev - recalculatedCev.value).toFixed(3));
    const tolerance = 0.02; // Documented standard rounding tolerance

    if (discrepancy <= tolerance) {
      cevComparison = {
        printed_value: printedCev,
        recalculated_value: recalculatedCev.value,
        discrepancy,
        tolerance,
        status: "MATCH",
        explanation: `Printed CEV (${printedCev}) matches recalculated IIW CEV (${recalculatedCev.value}) within ±${tolerance} rounding tolerance.`,
      };
    } else {
      cevComparison = {
        printed_value: printedCev,
        recalculated_value: recalculatedCev.value,
        discrepancy,
        tolerance,
        status: "MISMATCH",
        explanation: `Printed CEV (${printedCev}) deviates from recalculated IIW CEV (${recalculatedCev.value}) by ${discrepancy}, exceeding ±${tolerance} tolerance.`,
      };
      flags.push({
        id: "CEV_PRINTED_MISMATCH",
        category: "SPEC_INCONSISTENCY",
        severity: "WARNING",
        title: "Printed vs Recalculated CEV Discrepancy",
        explanation: cevComparison.explanation,
        field: "printed_cev",
        weight: 15,
      });
      specPenalty += 15;
    }
  } else {
    cevComparison = {
      printed_value: printedCev,
      recalculated_value: recalculatedCev.value,
      discrepancy: null,
      tolerance: 0.02,
      status: "NOT_APPLICABLE",
      explanation: printedCev === null
        ? "No printed CEV was reported on the certificate."
        : "Recalculated CEV unavailable due to missing C or Mn ladle analysis.",
    };
  }

  // 6. DUPLICATE HEAT NUMBER CHECK
  let duplicateHeatCheck: DuplicateHeatCheckResult = {
    is_duplicate: false,
    explanation: "Heat number appears unique across the active registry.",
  };

  if (mtr.heat_number && options?.existingCertificates && options.existingCertificates.length > 0) {
    const cleanHeat = mtr.heat_number.trim().toLowerCase();
    const cleanMill = (mtr.mill_name || "").trim().toLowerCase();
    const cleanGrade = (mtr.grade || "").trim().toLowerCase();

    for (const record of options.existingCertificates) {
      // Skip comparing against self if updating an existing record
      if (options.currentCertificateId && record.certificate_id === options.currentCertificateId) {
        continue;
      }

      if (record.heat_number.trim().toLowerCase() === cleanHeat) {
        const recordMill = record.mill_name.trim().toLowerCase();
        const recordGrade = record.grade.trim().toLowerCase();

        // Check if mill or grade conflicts
        const millConflict = cleanMill && recordMill && !cleanMill.includes(recordMill) && !recordMill.includes(cleanMill);
        const gradeConflict = cleanGrade && recordGrade && !cleanGrade.includes(recordGrade) && !recordGrade.includes(cleanGrade);

        if (millConflict || gradeConflict) {
          duplicateHeatCheck = {
            is_duplicate: true,
            conflicting_mill: millConflict ? record.mill_name : null,
            conflicting_grade: gradeConflict ? record.grade : null,
            prior_certificate_id: record.certificate_id,
            explanation: `Heat number '${mtr.heat_number}' exists in the registry under conflicting mill '${record.mill_name}' or grade '${record.grade}'.`,
          };

          flags.push({
            id: "DUPLICATE_HEAT_CONFLICT",
            category: "REVIEW_WARNING",
            severity: "WARNING",
            title: "Duplicate Heat Number with Conflicting Metadata",
            explanation: duplicateHeatCheck.explanation,
            field: "heat_number",
            weight: 30,
          });
          warningPenalty += 30;
          break;
        } else {
          duplicateHeatCheck = {
            is_duplicate: true,
            conflicting_mill: null,
            conflicting_grade: null,
            prior_certificate_id: record.certificate_id,
            explanation: `Heat number '${mtr.heat_number}' already exists in the registry from mill '${record.mill_name}'.`,
          };
        }
      }
    }
  }

  // 7. DETERMINISTIC REVIEW SCORE CALCULATION (0–100)
  const rawScore = completenessPenalty + specPenalty + warningPenalty;
  const clampedScore = Math.min(100, Math.max(0, rawScore));

  const hasFailingFlag = flags.some((f) => f.severity === "FAIL");
  const status: MTRReviewResult["status"] = clampedScore >= 40 || hasFailingFlag ? "REVIEW_REQUIRED" : "CHECKS_PASSED";

  let verdictSummary: string;
  if (status === "CHECKS_PASSED") {
    if (flags.length === 0) {
      verdictSummary = "Checks passed. Complete ladle analysis and tensile test results conform to published standard requirements.";
    } else {
      verdictSummary = "Checks passed with minor notices. Basic mechanical and chemical requirements conform to published standard.";
    }
  } else {
    verdictSummary = "Review required. One or more technical discrepancies, missing mandatory fields, or out-of-spec test values require human engineering review before publication.";
  }

  // Optional concise buyer-facing summary strictly based on validated data
  const buyerSummary = generateBuyerSummary(mtr, targetGrade, recalculatedCev, status, flags);

  return {
    score: clampedScore,
    status,
    verdict_summary: verdictSummary,
    flags,
    recalculated_cev: recalculatedCev,
    cev_comparison: cevComparison,
    duplicate_heat_check: duplicateHeatCheck,
    grade_resolution: gradeResolution,
    buyer_summary: buyerSummary,
    evaluated_at: new Date().toISOString(),
  };
}

/**
 * Generates a buyer-facing factual explanation based solely on deterministic findings.
 * Never overrides rule results.
 */
function generateBuyerSummary(
  mtr: MTRExtraction,
  grade: SteelGradeEntry | undefined,
  cev: CEVRecalculationResult,
  verdict: "CHECKS_PASSED" | "REVIEW_REQUIRED",
  flags: MTRQCFlag[]
): string {
  const gradeLabel = grade ? grade.canonical_name : (mtr.grade || "Structural Steel");
  const millLabel = mtr.mill_name || "Unspecified Mill";
  const heatLabel = mtr.heat_number ? `Heat ${mtr.heat_number}` : "Unspecified Heat";
  const meltCountry = mtr.melt_and_pour_country ? `Melt & poured in ${mtr.melt_and_pour_country}.` : "";

  const yieldVal = mtr.mechanical_properties.yield_strength.value;
  const tensileVal = mtr.mechanical_properties.tensile_strength.value;
  const elongVal = mtr.mechanical_properties.elongation_pct.value;

  const mechSummary = (yieldVal !== null && tensileVal !== null)
    ? `Tested at ${yieldVal} ksi yield / ${tensileVal} ksi tensile (${elongVal ?? "N/A"}% elongation).`
    : "Tensile pull test values incomplete.";

  const weldSummary = cev.value !== null
    ? `Calculated IIW Carbon Equivalent is ${cev.value}. ${cev.weldability_note}`
    : "Carbon Equivalent could not be calculated.";

  const complianceSentence = verdict === "CHECKS_PASSED"
    ? `Deterministic QC audit: Checks passed against governing standard.`
    : `Deterministic QC audit: Review required due to ${flags.filter(f => f.severity === 'FAIL').length} failing specification checks.`;

  return `${gradeLabel} certified by ${millLabel} (${heatLabel}). ${meltCountry} ${mechSummary} ${weldSummary} ${complianceSentence}`.trim();
}
