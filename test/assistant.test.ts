import { describe, it, expect } from "vitest";
import { parseRequirementsDeterministic } from "@/lib/engine/requirements-parser";
import { matchGradesToSpecification } from "@/lib/engine/grade-matcher";
import { queryAndRankInventory } from "@/lib/engine/assistant-ranker";
import { generateDeterministicExplanation } from "@/lib/engine/assistant-explainer";
import { BuyerSpecification } from "@/types/assistant";

describe("MillProof AI Sourcing Assistant Engine Tests", () => {
  // -------------------------------------------------------------------
  // 1. Five Core Functional Test Cases (Domain-Driven Validation)
  // -------------------------------------------------------------------
  describe("1. Functional Domain Applications", () => {
    it("Outdoor Coastal Application: prioritizes chloride-resistant grades (316L, 2205) and excludes unpainted carbon steel", () => {
      const prompt = "I need around 40 tons of steel for an outdoor structure near the coast. Corrosion resistance matters, and I need plate.";
      const spec = parseRequirementsDeterministic(prompt);

      expect(spec.quantity_tons).toBe(40);
      expect(spec.form).toBe("Plate");
      expect(spec.environment).toContain("coastal");

      const match = matchGradesToSpecification(spec);

      // Verify eligible grades
      const eligibleIds = match.eligible_grades.map((g) => g.grade_id);
      expect(eligibleIds).toContain("aisi-316l");
      expect(eligibleIds).toContain("duplex-2205");

      // Verify that unpainted plain carbon steels are excluded from eligible grades
      expect(eligibleIds).not.toContain("astm-a36");
      expect(eligibleIds).not.toContain("sae-1018");
      expect(eligibleIds).not.toContain("sae-1045");
      expect(eligibleIds).not.toContain("aisi-4140");

      // Verify ineligible reasons
      const a36Eval = match.ineligible_grades.find((g) => g.grade_id === "astm-a36");
      expect(a36Eval).toBeDefined();
      expect(a36Eval?.incompatibilities[0]).toContain("negligible atmospheric corrosion resistance");
    });

    it("Food-Contact Application: selects sanitary stainless grades (304, 316L) and excludes all carbon and non-passivated steels", () => {
      const prompt = "Sanitary food processing mixing tank, 15 tons of 0.25 inch plate. Must be food contact safe.";
      const spec = parseRequirementsDeterministic(prompt);

      expect(spec.quantity_tons).toBe(15);
      expect(spec.form).toBe("Plate");
      expect(spec.thickness_in).toBe(0.25);
      expect(spec.environment).toContain("Food processing");

      const match = matchGradesToSpecification(spec);
      const eligibleIds = match.eligible_grades.map((g) => g.grade_id);

      expect(eligibleIds).toContain("aisi-304");
      expect(eligibleIds).toContain("aisi-316l");

      // All structural and carbon steels must be strictly excluded
      expect(eligibleIds).not.toContain("astm-a36");
      expect(eligibleIds).not.toContain("astm-a572-50");
      expect(eligibleIds).not.toContain("sae-1018");
      expect(eligibleIds).not.toContain("sae-1045");
      expect(eligibleIds).not.toContain("aisi-4140");
      expect(eligibleIds).not.toContain("aisi-409"); // Ferritic excluded for sanitary
    });

    it("Machine Shaft Application: selects high-tensile heat-treatable alloys (4140, 1045) and excludes structural construction steels", () => {
      const prompt = "High torque rotating machine drive shaft, 5 tons of round bar requiring high surface hardenability and fatigue resistance.";
      const spec = parseRequirementsDeterministic(prompt);

      expect(spec.quantity_tons).toBe(5);
      expect(spec.form).toBe("Round Bar");

      const match = matchGradesToSpecification(spec);
      const eligibleIds = match.eligible_grades.map((g) => g.grade_id);

      expect(eligibleIds).toContain("aisi-4140");
      expect(eligibleIds).toContain("sae-1045");

      // Top grade for shafting should be AISI 4140
      expect(match.eligible_grades[0].grade_id).toBe("aisi-4140");

      // Structural bridge/building steels should be excluded
      expect(eligibleIds).not.toContain("astm-a36");
      expect(eligibleIds).not.toContain("astm-a588");
    });

    it("Low-Budget Shelving Request: prioritizes baseline economical carbon steel and excludes high-cost stainless/duplex tiers", () => {
      const prompt = "Low budget warehouse storage shelving brackets, 20 tons of carbon steel sheet. Cost-effective economy priority.";
      const spec = parseRequirementsDeterministic(prompt);

      expect(spec.quantity_tons).toBe(20);
      expect(spec.form).toBe("Sheet");

      const match = matchGradesToSpecification(spec);
      const eligibleIds = match.eligible_grades.map((g) => g.grade_id);

      // Baseline tier 1 carbon steels should be eligible
      expect(eligibleIds).toContain("astm-a36");
      expect(eligibleIds).toContain("sae-1018");

      // Expensive stainless steels (tiers 4 & 5) must be excluded for low-budget requests
      expect(eligibleIds).not.toContain("aisi-316l");
      expect(eligibleIds).not.toContain("duplex-2205");

      const duplexEval = match.ineligible_grades.find((g) => g.grade_id === "duplex-2205");
      expect(duplexEval?.incompatibilities[0]).toContain("economically incompatible with low-budget");
    });

    it("Structural Project: selects high-strength structural grades (A572-50, A36, A588)", () => {
      const prompt = "Commercial building structural columns and floor beams, 50 tons of wide flange beam requiring 50 ksi yield and AWS D1.1 weldability.";
      const spec = parseRequirementsDeterministic(prompt);

      expect(spec.quantity_tons).toBe(50);
      expect(spec.form).toBe("Wide Flange Beam");

      const match = matchGradesToSpecification(spec);
      const eligibleIds = match.eligible_grades.map((g) => g.grade_id);

      expect(eligibleIds).toContain("astm-a572-50");
      expect(eligibleIds).toContain("astm-a36");
      expect(match.eligible_grades[0].grade_id).toBe("astm-a572-50");
    });
  });

  // -------------------------------------------------------------------
  // 2. Score Normalization & Ranking Tests
  // -------------------------------------------------------------------
  describe("2. Ranking Normalization & Weight Mechanics", () => {
    it("normalizes every score component strictly to a 0.0 - 1.0 range", async () => {
      const spec: BuyerSpecification = {
        use_case: "Structural frame",
        environment: "Indoor industrial",
        required_properties: ["50 ksi yield"],
        prohibited_materials_or_constraints: [],
        quantity_tons: 25.0,
        form: "Plate",
        thickness_in: 0.75,
        buyer_city: "Chicago",
        state_or_country: "IL",
        budget_per_ton: null,
        budget_total: null,
        applicable_standard: null,
        explicit_requirements: ["25 tons", "Plate", "50 ksi"],
        inferred_assumptions: [],
        missing_information: [],
      };

      const match = matchGradesToSpecification(spec);
      const ranked = await queryAndRankInventory(spec, match.eligible_grades);

      expect(ranked.length).toBeGreaterThan(0);

      for (const candidate of ranked) {
        expect(candidate.score_material_fit).toBeGreaterThanOrEqual(0.0);
        expect(candidate.score_material_fit).toBeLessThanOrEqual(1.0);

        expect(candidate.score_data_quality).toBeGreaterThanOrEqual(0.0);
        expect(candidate.score_data_quality).toBeLessThanOrEqual(1.0);

        expect(candidate.score_delivered_cost).toBeGreaterThanOrEqual(0.0);
        expect(candidate.score_delivered_cost).toBeLessThanOrEqual(1.0);

        expect(candidate.total_score).toBeGreaterThanOrEqual(0);
        expect(candidate.total_score).toBeLessThanOrEqual(100);
      }
    });

    it("calculates delivered cost score as lowest cost divided by candidate cost, capped at 1.0", async () => {
      const spec: BuyerSpecification = {
        use_case: "Outdoor structural platform",
        environment: "Industrial outdoor",
        required_properties: [],
        prohibited_materials_or_constraints: [],
        quantity_tons: 20.0,
        form: "Plate",
        thickness_in: null,
        buyer_city: "Detroit",
        state_or_country: "MI",
        budget_per_ton: null,
        budget_total: null,
        applicable_standard: null,
        explicit_requirements: [],
        inferred_assumptions: [],
        missing_information: [],
      };

      const match = matchGradesToSpecification(spec);
      const ranked = await queryAndRankInventory(spec, match.eligible_grades);

      expect(ranked.length).toBeGreaterThan(0);

      // Verify that candidate with lowest delivered cost has cost score == 1.0
      const lowestCostCandidate = [...ranked].sort(
        (a, b) => (a.delivered_cost_per_ton || 0) - (b.delivered_cost_per_ton || 0)
      )[0];

      expect(lowestCostCandidate.score_delivered_cost).toBe(1.0);

      // Verify that higher cost candidates have cost score < 1.0
      const higherCostCandidates = ranked.filter(
        (c) => (c.delivered_cost_per_ton || 0) > (lowestCostCandidate.delivered_cost_per_ton || 0)
      );

      if (higherCostCandidates.length > 0) {
        expect(higherCostCandidates[0].score_delivered_cost).toBeLessThan(1.0);
      }
    });

    it("dynamically renormalizes fit and data quality weights when delivered cost is absent", async () => {
      const spec: BuyerSpecification = {
        use_case: "Structural warehouse beam",
        environment: "Indoor",
        required_properties: [],
        prohibited_materials_or_constraints: [],
        quantity_tons: 10.0,
        form: null,
        thickness_in: null,
        buyer_city: null, // Missing city
        state_or_country: null,
        budget_per_ton: null,
        budget_total: null,
        applicable_standard: null,
        explicit_requirements: [],
        inferred_assumptions: [],
        missing_information: [],
      };

      const match = matchGradesToSpecification(spec);
      const ranked = await queryAndRankInventory(spec, match.eligible_grades);

      expect(ranked.length).toBeGreaterThan(0);
      const candidate = ranked[0];

      // Effective weights must sum to 1.0
      const totalWeight =
        candidate.effective_weights.fit +
        candidate.effective_weights.quality +
        candidate.effective_weights.cost;

      expect(totalWeight).toBeCloseTo(1.0, 2);
    });

    it("data quality scoring rewards verified MTR presence, chemistry, mechanicals, and known melting route", async () => {
      const spec: BuyerSpecification = {
        use_case: "Heavy structural fabrication",
        environment: "Civil bridge",
        required_properties: [],
        prohibited_materials_or_constraints: [],
        quantity_tons: 30.0,
        form: "Plate",
        thickness_in: 0.75,
        buyer_city: "Chicago",
        state_or_country: "IL",
        budget_per_ton: null,
        budget_total: null,
        applicable_standard: null,
        explicit_requirements: [],
        inferred_assumptions: [],
        missing_information: [],
      };

      const match = matchGradesToSpecification(spec);
      const ranked = await queryAndRankInventory(spec, match.eligible_grades);

      // Candidates with full MTR certificates should have high data quality scores (>= 0.70)
      const certifiedCandidates = ranked.filter((c) => c.has_certificate);
      expect(certifiedCandidates.length).toBeGreaterThan(0);
      expect(certifiedCandidates[0].score_data_quality).toBeGreaterThanOrEqual(0.70);
    });

    it("enforces hard eligibility: incompatible grades cannot be compensated by cheap delivered price", async () => {
      // Coastal application: plain carbon steel is cheap, but must be excluded
      const coastalSpec: BuyerSpecification = {
        use_case: "Outdoor coastal pier frame",
        environment: "Outdoor coastal marine",
        required_properties: ["Corrosion resistance"],
        prohibited_materials_or_constraints: [],
        quantity_tons: 20.0,
        form: "Plate",
        thickness_in: null,
        buyer_city: "Houston",
        state_or_country: "TX",
        budget_per_ton: null,
        budget_total: null,
        applicable_standard: null,
        explicit_requirements: ["Coastal marine", "Plate"],
        inferred_assumptions: [],
        missing_information: [],
      };

      const match = matchGradesToSpecification(coastalSpec);
      const ranked = await queryAndRankInventory(coastalSpec, match.eligible_grades);

      // Verify that NO carbon steel listings appear in the ranked list, regardless of low price
      for (const item of ranked) {
        expect(item.grade_id).not.toBe("astm-a36");
        expect(item.grade_id).not.toBe("sae-1018");
        expect(item.grade_id).not.toBe("sae-1045");
      }
    });
  });

  // -------------------------------------------------------------------
  // 3. Explanation Generator & Complete Response Contract
  // -------------------------------------------------------------------
  describe("3. Explanation Integrity & Assistant Response Contract", () => {
    it("generates deterministic candidate explanations without changing numerical scores", async () => {
      const spec: BuyerSpecification = {
        use_case: "Outdoor structural platform near coast",
        environment: "Coastal atmospheric",
        required_properties: ["Corrosion resistance"],
        prohibited_materials_or_constraints: [],
        quantity_tons: 40.0,
        form: "Plate",
        thickness_in: 0.75,
        buyer_city: "Chicago",
        state_or_country: "IL",
        budget_per_ton: null,
        budget_total: null,
        applicable_standard: null,
        explicit_requirements: ["40 tons", "Plate"],
        inferred_assumptions: ["Coastal exposure"],
        missing_information: [],
      };

      const match = matchGradesToSpecification(spec);
      const ranked = await queryAndRankInventory(spec, match.eligible_grades);
      expect(ranked.length).toBeGreaterThan(0);

      const candidate = ranked[0];
      const initialScore = candidate.total_score;

      const explanation = generateDeterministicExplanation(spec, candidate);

      expect(explanation.listing_id).toBe(candidate.listing_id);
      expect(explanation.why_matched).toBeDefined();
      expect(explanation.key_trade_offs.length).toBeGreaterThan(0);
      expect(explanation.price_and_freight_assumptions.length).toBeGreaterThan(0);
      expect(explanation.relevant_limitations.length).toBeGreaterThan(0);
      expect(explanation.unknowns_requiring_confirmation.length).toBeGreaterThan(0);

      // The candidate's score must remain unchanged
      expect(candidate.total_score).toBe(initialScore);
    });
  });
});
