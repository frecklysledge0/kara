import { BuyerSpecification, GradeSuitabilityResult } from "@/types/assistant";
import { CURATED_GRADES } from "@/lib/data/grades";
import { SteelGradeEntry } from "@/types/grades";

// =====================================================================
// MillProof: Deterministic Grade Matching Engine (Step 2)
// Compares buyer requirements strictly against curated metallurgical facts.
// Never hallucinates grades or numeric limits.
// Excludes clearly incompatible candidates and flags unresolved engineering criteria.
// =====================================================================

export interface GradeMatchOutcome {
  eligible_grades: GradeSuitabilityResult[];
  ineligible_grades: GradeSuitabilityResult[];
  clarification_questions: string[];
  summary_guidance: string;
}

export function matchGradesToSpecification(spec: BuyerSpecification): GradeMatchOutcome {
  const eligible: GradeSuitabilityResult[] = [];
  const ineligible: GradeSuitabilityResult[] = [];
  const clarificationQuestions: string[] = [];

  const useCaseLower = (spec.use_case || "").toLowerCase();
  const envLower = (spec.environment || "").toLowerCase();
  const reqPropsLower = (spec.required_properties || []).map((p) => p.toLowerCase()).join(" ");
  const prohibitedLower = (spec.prohibited_materials_or_constraints || []).map((p) => p.toLowerCase()).join(" ");
  const requestedForm = spec.form;

  // Key application indicators
  const isCoastalMarine =
    envLower.includes("coastal") ||
    envLower.includes("marine") ||
    envLower.includes("salt") ||
    envLower.includes("offshore") ||
    useCaseLower.includes("coastal") ||
    useCaseLower.includes("marine") ||
    reqPropsLower.includes("chloride") ||
    reqPropsLower.includes("corrosion");

  const isFoodContact =
    envLower.includes("food") ||
    envLower.includes("dairy") ||
    envLower.includes("sanitary") ||
    envLower.includes("beverage") ||
    useCaseLower.includes("food") ||
    useCaseLower.includes("sanitary");

  const isMachineShaft =
    useCaseLower.includes("shaft") ||
    useCaseLower.includes("axle") ||
    useCaseLower.includes("pin") ||
    useCaseLower.includes("torque") ||
    useCaseLower.includes("gear") ||
    reqPropsLower.includes("torsional") ||
    reqPropsLower.includes("hardenability");

  const isLowBudgetShelving =
    useCaseLower.includes("shelv") ||
    useCaseLower.includes("rack") ||
    useCaseLower.includes("storage") ||
    useCaseLower.includes("low budget") ||
    useCaseLower.includes("cheap") ||
    useCaseLower.includes("economical") ||
    reqPropsLower.includes("cost-effective") ||
    prohibitedLower.includes("avoid high-cost");

  const isStructuralCivil =
    useCaseLower.includes("structure") ||
    useCaseLower.includes("building") ||
    useCaseLower.includes("bridge") ||
    useCaseLower.includes("column") ||
    useCaseLower.includes("frame") ||
    reqPropsLower.includes("structural");

  const requiresHighStrength =
    reqPropsLower.includes("high strength") ||
    reqPropsLower.includes("50 ksi") ||
    useCaseLower.includes("high strength");

  const requiresWeldability =
    reqPropsLower.includes("weld") ||
    useCaseLower.includes("weld") ||
    useCaseLower.includes("welded");

  // Iterate over all 10 curated grades in the knowledge base
  for (const grade of CURATED_GRADES) {
    const evaluation = evaluateSingleGrade(grade, {
      isCoastalMarine,
      isFoodContact,
      isMachineShaft,
      isLowBudgetShelving,
      isStructuralCivil,
      requiresHighStrength,
      requiresWeldability,
      requestedForm,
      prohibitedLower,
      spec,
    });

    if (evaluation.is_eligible) {
      eligible.push(evaluation);
    } else {
      ineligible.push(evaluation);
    }
  }

  // Sort eligible candidates by suitability score descending
  eligible.sort((a, b) => b.suitability_score - a.suitability_score);

  // Generate clarification questions if necessary
  if (isCoastalMarine) {
    if (!spec.prohibited_materials_or_constraints.some((c) => c.toLowerCase().includes("coating"))) {
      clarificationQuestions.push(
        "Will the coastal structure use protective paint/galvanizing coatings, or is bare unpainted corrosion resistance (such as 316L, 2205 Duplex, or weathering steel) required?"
      );
    }
  }

  if (isFoodContact) {
    clarificationQuestions.push(
      "Will this food-contact surface encounter acidic food products or chloride cleaning agents (demanding AISI 316L), or is general food-contact stainless (AISI 304) sufficient?"
    );
  }

  if (isMachineShaft) {
    clarificationQuestions.push(
      "What heat-treatment condition is intended for the shaft (as-rolled, normalized, or quenched and tempered 4140)?"
    );
  }

  if (!spec.thickness_in && requestedForm === "Plate") {
    clarificationQuestions.push(
      "Specific plate thickness was not indicated. What thickness (in inches or mm) is required for your structural calculations?"
    );
  }

  if (!spec.buyer_city && !spec.state_or_country) {
    clarificationQuestions.push(
      "Delivery destination was not provided. Providing your destination city/state will enable precise flatbed freight and landed delivered cost calculations."
    );
  }

  // Generate summary guidance
  let summary_guidance = "";
  if (eligible.length > 0) {
    const topGrade = eligible[0];
    summary_guidance = `Identified ${eligible.length} metallurgically safe grade candidates. Top recommendation is ${topGrade.canonical_name} (${topGrade.material_family}) with a ${(topGrade.suitability_score * 100).toFixed(0)}% specification fit score.`;
  } else {
    summary_guidance =
      "No safe grade candidates could be identified matching all stated constraints without violation of metallurgical or environmental safety limits. Please review the clarification questions above.";
  }

  return {
    eligible_grades: eligible,
    ineligible_grades: ineligible,
    clarification_questions: clarificationQuestions,
    summary_guidance,
  };
}

/**
 * Deterministically evaluates a single curated grade against buyer parameters.
 */
function evaluateSingleGrade(
  grade: SteelGradeEntry,
  ctx: {
    isCoastalMarine: boolean;
    isFoodContact: boolean;
    isMachineShaft: boolean;
    isLowBudgetShelving: boolean;
    isStructuralCivil: boolean;
    requiresHighStrength: boolean;
    requiresWeldability: boolean;
    requestedForm: string | null;
    prohibitedLower: string;
    spec: BuyerSpecification;
  }
): GradeSuitabilityResult {
  const fitReasons: string[] = [];
  const limitations: string[] = [];
  const incompatibilities: string[] = [];
  const unresolved: string[] = [];
  let score = 0.50; // Neutral baseline

  const isCarbonSteel =
    grade.material_family.includes("Carbon") ||
    grade.material_family.includes("Low-Alloy") ||
    grade.material_family.includes("HSLA") ||
    grade.material_family.includes("Machinery");

  const isStainless =
    grade.material_family.includes("Stainless");

  // 1. Prohibited materials check
  if (ctx.prohibitedLower.includes("no carbon") && isCarbonSteel) {
    incompatibilities.push("Buyer explicitly excluded carbon steel.");
  }
  if (ctx.prohibitedLower.includes("no stainless") && isStainless) {
    incompatibilities.push("Buyer explicitly excluded stainless steel.");
  }

  // 2. Scenario-specific metallurgical rules

  // --- SCENARIO A: Food Contact Application ---
  if (ctx.isFoodContact) {
    if (!isStainless || grade.id === "aisi-409") {
      incompatibilities.push(
        `${grade.canonical_name} is non-passivated or ferritic and does not comply with sanitary food contact hygiene standards. Risk of toxic contamination or localized pitting.`
      );
    } else if (grade.id === "aisi-304") {
      score += 0.45;
      fitReasons.push("Industry standard 18-8 austenitic stainless steel for sanitary food processing equipment.");
      limitations.push("Susceptible to pitting if exposed to high-salt brine (>1000 ppm Cl-) or heated chlorides.");
    } else if (grade.id === "aisi-316l") {
      score += 0.48;
      fitReasons.push("Molybdenum-bearing 316L provides superior resistance to organic acids, food salts, and CIP cleaning chemicals.");
      limitations.push("Higher cost tier than standard 304.");
    }
  }

  // --- SCENARIO B: Outdoor Coastal / Marine Application ---
  if (ctx.isCoastalMarine) {
    if (grade.corrosion_resistance.category === "Negligible (Requires Protective Coating)") {
      incompatibilities.push(
        `${grade.canonical_name} has negligible atmospheric corrosion resistance. Plain carbon steel corrodes rapidly (20–50 µm/yr) in coastal marine chloride splash zones without barrier coatings.`
      );
    } else if (grade.id === "aisi-316l") {
      score += 0.45;
      fitReasons.push("2.0–3.0% Molybdenum content provides proven resistance to marine chloride pitting and crevice corrosion.");
      limitations.push("Yield strength is moderate (25–30 ksi); may require heavier gage for high structural loadings.");
    } else if (grade.id === "duplex-2205") {
      score += 0.48;
      fitReasons.push("PREN >= 35 and 65 ksi minimum yield provides exceptional marine pitting resistance combined with double the strength of 316L.");
      limitations.push("Higher material cost; requires strict heat-input controls during welding to maintain 50/50 austenite-ferrite phase balance.");
    } else if (grade.id === "astm-a588") {
      score += 0.25;
      fitReasons.push("Weathering steel develops a dense protective copper-chromium patina in atmospheric outdoor exposure.");
      limitations.push("Direct marine coastal salt spray or unwashed sheltered areas will prevent protective patina formation; protective painting is required in direct splash zones.");
      unresolved.push("Verify distance to high-tide splash zone: A588 requires alternating wet/dry cycles to maintain protective oxide.");
    } else if (grade.id === "aisi-304") {
      score += 0.15;
      fitReasons.push("General atmospheric corrosion resistance.");
      limitations.push("Known susceptibility to severe chloride pitting and rust staining in warm coastal marine environments.");
      unresolved.push("Evaluate if airborne salt concentrations exceed safe limits for 304 without regular freshwater washdowns.");
    }
  }

  // --- SCENARIO C: Machine Shaft / High Torque / Gearing ---
  if (ctx.isMachineShaft) {
    if (grade.id === "aisi-4140") {
      score += 0.48;
      fitReasons.push("High-strength chromium-molybdenum alloy offering 95 ksi minimum yield, superior fatigue endurance, and through-hardenability for shafting.");
      limitations.push("Requires strict preheat and post-weld heat treatment if welded.");
    } else if (grade.id === "sae-1045") {
      score += 0.40;
      fitReasons.push("Medium-carbon engineering steel with excellent response to flame or induction hardening for shaft wear journals.");
      limitations.push("Limited weldability (requires 300°F–500°F preheat); lower toughness than 4140.");
    } else if (grade.id === "sae-1018") {
      score += 0.25;
      fitReasons.push("Economical low-carbon steel offering good machinability and carburizing surface-hardening capability for light-duty pins.");
      limitations.push("Lower core yield strength (54 ksi); not suitable for heavy dynamic torsional or bending shock loads.");
    } else if (isStainless && (grade.id === "aisi-304" || grade.id === "aisi-316l")) {
      limitations.push("Austenitic stainless steels exhibit poor machinability and galling tendency under mechanical shaft contact.");
      score -= 0.15;
    } else if (grade.id === "astm-a36" || grade.id === "astm-a588") {
      incompatibilities.push("Structural construction steel not intended for rotating machine shafting or precision machined journals.");
    }
  }

  // --- SCENARIO D: Low-Budget Shelving / Economical Storage ---
  if (ctx.isLowBudgetShelving) {
    if (grade.relative_cost_tier.tier === 1) {
      score += 0.45;
      fitReasons.push(`Cost Tier ${grade.relative_cost_tier.tier}: Highly economical baseline carbon steel for commercial shelving and brackets.`);
    } else if (grade.relative_cost_tier.tier >= 4) {
      incompatibilities.push(
        `${grade.canonical_name} is in Cost Tier ${grade.relative_cost_tier.tier} (${grade.relative_cost_tier.description}), which is economically incompatible with low-budget shelving.`
      );
    } else {
      score -= 0.15;
      limitations.push(`Cost Tier ${grade.relative_cost_tier.tier}: Higher price point than baseline carbon steel.`);
    }
  }

  // --- SCENARIO E: Structural Civil Infrastructure ---
  if (ctx.isStructuralCivil && !ctx.isCoastalMarine && !ctx.isFoodContact && !ctx.isMachineShaft) {
    if (grade.id === "astm-a572-50") {
      score += 0.45;
      fitReasons.push("Industry standard 50 ksi yield HSLA steel for structural buildings and bridges. Excellent strength-to-weight ratio.");
    } else if (grade.id === "astm-a36") {
      score += 0.40;
      fitReasons.push("Reliable, universally prequalified 36 ksi structural steel for base plates, beams, and columns.");
    } else if (grade.id === "astm-a588") {
      score += 0.42;
      fitReasons.push("Weathering structural steel with 50 ksi yield; eliminates field painting maintenance for highway and railroad bridges.");
    }
  }

  // 3. Weldability requirement evaluation
  if (ctx.requiresWeldability) {
    if (grade.weldability.rating.includes("Strict WPS") || grade.weldability.rating.includes("Moderate")) {
      limitations.push(`Weldability is ${grade.weldability.rating}. Strict preheat and hydrogen control required.`);
      score -= 0.05;
    } else if (grade.weldability.rating.includes("Prequalified") || grade.weldability.rating.includes("Excellent")) {
      fitReasons.push(`Weldability: ${grade.weldability.rating}`);
      score += 0.05;
    }
  }

  // 4. Form check
  if (ctx.requestedForm) {
    if (ctx.requestedForm === "Wide Flange Beam" && (grade.id === "sae-1018" || grade.id === "sae-1045" || grade.id === "aisi-4140" || grade.id === "aisi-409")) {
      incompatibilities.push(`${grade.canonical_name} is not commercially rolled in Wide Flange structural beam profiles.`);
    } else if (ctx.requestedForm === "Round Bar" && (grade.id === "astm-a588")) {
      limitations.push("A588 is predominantly produced in structural plate and beam shapes; round bar availability is restricted.");
    } else {
      fitReasons.push(`Available in standard ${ctx.requestedForm} specifications.`);
    }
  }

  // 5. High strength check
  if (ctx.requiresHighStrength) {
    const minYield = grade.mechanical_properties.yield_strength.min;
    if (minYield !== null && minYield >= 50.0) {
      fitReasons.push(`High yield strength: ${minYield} ksi minimum.`);
      score += 0.05;
    } else if (minYield !== null && minYield < 50.0) {
      limitations.push(`Yield strength is ${minYield} ksi (below 50 ksi threshold).`);
      score -= 0.10;
    }
  }

  // Final score clamping
  const normalizedScore = Math.max(0.05, Math.min(0.98, Math.round(score * 100) / 100));
  const isEligible = incompatibilities.length === 0;

  return {
    grade_id: grade.id,
    canonical_name: grade.canonical_name,
    material_family: grade.material_family,
    applicable_standard: grade.applicable_standard,
    is_eligible: isEligible,
    suitability_score: isEligible ? normalizedScore : 0.0,
    fit_reasons: fitReasons,
    limitations: limitations,
    incompatibilities,
    unresolved_engineering_requirements: unresolved,
    relative_cost_tier: grade.relative_cost_tier.tier,
  };
}
