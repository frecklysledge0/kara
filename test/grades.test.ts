import { describe, it, expect } from "vitest";
import {
  getAllGrades,
  getGradeById,
  getGradesByFamily,
  getGradesByCorrosionResistance,
  getGradesByMinYield,
  getGradesByUseCase,
  getKnowledgeBaseSummary,
  validateGradeEntry,
  validateKnowledgeBase,
} from "@/lib/data/grades";
import { SteelGradeEntrySchema } from "@/types/grades";

describe("Curated Steel Grade Knowledge Base & Validation Tests", () => {
  const allGrades = getAllGrades();

  describe("1. Catalog Completeness & Candidate Coverage", () => {
    it("should contain exactly the 10 candidate steel grades spanning carbon, engineering, stainless, and duplex", () => {
      expect(allGrades.length).toBe(10);

      const expectedIds = [
        "astm-a36",
        "astm-a572-50",
        "astm-a588",
        "sae-1018",
        "sae-1045",
        "aisi-4140",
        "aisi-304",
        "aisi-316l",
        "aisi-409",
        "duplex-2205",
      ];

      for (const id of expectedIds) {
        const found = getGradeById(id);
        expect(found, `Expected grade ${id} to exist in knowledge base`).toBeDefined();
      }
    });

    it("should document exact standard designations for 2205 Duplex Stainless Steel", () => {
      const duplex = getGradeById("duplex-2205");
      expect(duplex).toBeDefined();
      expect(duplex?.uns_number).toContain("S32205");
      expect(duplex?.en_designation).toContain("1.4462");
      expect(duplex?.applicable_standard).toContain("ASTM A240");
      expect(duplex?.material_family).toBe("Duplex Stainless Steel");
      expect(duplex?.corrosion_resistance.pren).toBeGreaterThanOrEqual(34.0);
    });
  });

  describe("2. Schema Validation & Missing Fields Rejection", () => {
    it("should pass schema validation for all 10 curated entries", () => {
      const result = validateKnowledgeBase(allGrades);
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it("should reject entry with missing required fields", () => {
      const incompleteEntry = {
        id: "incomplete-steel",
        canonical_name: "Incomplete Steel",
        // missing applicable_standard, material_family, chemistry_limits, mechanical_properties, etc.
      };

      const result = validateGradeEntry(incompleteEntry);
      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.errors.some((e) => e.includes("applicable_standard"))).toBe(true);
      expect(result.errors.some((e) => e.includes("material_family"))).toBe(true);
    });

    it("should reject invalid range where minimum exceeds maximum in chemistry", () => {
      const a36 = getGradeById("astm-a36");
      expect(a36).toBeDefined();

      const invalidChemEntry = {
        ...a36,
        chemistry_limits: {
          ...a36?.chemistry_limits,
          elements: {
            ...a36?.chemistry_limits.elements,
            Mn: { min: 1.50, max: 0.80, unit: "% by weight" }, // min > max
          },
        },
      };

      const result = validateGradeEntry(invalidChemEntry);
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.includes("Element minimum cannot exceed maximum"))).toBe(true);
    });

    it("should reject invalid range where minimum strength exceeds maximum", () => {
      const a36 = getGradeById("astm-a36");
      expect(a36).toBeDefined();

      const invalidStrengthEntry = {
        ...a36,
        mechanical_properties: {
          ...a36?.mechanical_properties,
          tensile_strength: {
            min: 100.0,
            max: 80.0, // min > max
            typical: 90.0,
            unit: "ksi" as const,
            condition: "Test",
          },
        },
      };

      const result = validateGradeEntry(invalidStrengthEntry);
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.includes("Strength property minimum cannot exceed maximum"))).toBe(true);
    });
  });

  describe("3. Unit Consistency & Integrity Verification", () => {
    it("should enforce consistent strength and elongation units across all entries", () => {
      for (const grade of allGrades) {
        const ys = grade.mechanical_properties.yield_strength;
        const ts = grade.mechanical_properties.tensile_strength;

        expect(["ksi", "MPa"]).toContain(ys.unit);
        expect(["ksi", "MPa"]).toContain(ts.unit);
        expect(ys.unit).toBe(ts.unit); // Yield and tensile must use the same unit system

        expect(grade.mechanical_properties.elongation_pct.gauge_length).toBeTruthy();

        // Check chemistry units
        for (const [elem, limits] of Object.entries(grade.chemistry_limits.elements)) {
          expect(limits.unit).toBe("% by weight");
          if (limits.min !== null && limits.max !== null) {
            expect(limits.min).toBeLessThanOrEqual(limits.max);
          }
        }
      }
    });

    it("should contain credible bibliographic citations and disclaimer notices", () => {
      for (const grade of allGrades) {
        expect(grade.source_references.length).toBeGreaterThanOrEqual(1);
        for (const ref of grade.source_references) {
          expect(ref.title).toBeTruthy();
          expect(ref.publisher).toBeTruthy();
          expect(ref.url_or_identifier).toBeTruthy();
        }

        expect(grade.disclaimer).toContain("Informational guidance only");
        expect(grade.disclaimer).toContain("certified Mill Test Reports");
      }
    });
  });

  describe("4. Helper Functions & Filtering", () => {
    it("should return undefined for unsupported grades without fabricating data", () => {
      const unknownGrade = getGradeById("unsupported-titanium-grade-5");
      expect(unknownGrade).toBeUndefined();

      const emptyQuery = getGradeById("");
      expect(emptyQuery).toBeUndefined();
    });

    it("should correctly filter grades by material family", () => {
      const austenitic = getGradesByFamily("Austenitic Stainless Steel");
      expect(austenitic.length).toBe(2);
      const names = austenitic.map((g) => g.canonical_name);
      expect(names.some((n) => n.includes("304"))).toBe(true);
      expect(names.some((n) => n.includes("316L"))).toBe(true);

      const structural = getGradesByFamily("Structural Carbon Steel");
      expect(structural.length).toBe(1);
      expect(structural[0].id).toBe("astm-a36");
    });

    it("should correctly filter grades by minimum yield strength threshold", () => {
      const highYieldGrades = getGradesByMinYield(50.0);
      expect(highYieldGrades.length).toBeGreaterThanOrEqual(4);

      for (const grade of highYieldGrades) {
        expect(grade.mechanical_properties.yield_strength.min).toBeGreaterThanOrEqual(50.0);
      }

      // Duplex 2205 (min 65 ksi) and AISI 4140 (min 95 ksi) must be included
      const ids = highYieldGrades.map((g) => g.id);
      expect(ids).toContain("duplex-2205");
      expect(ids).toContain("aisi-4140");
      expect(ids).toContain("astm-a572-50");
    });

    it("should search grades by application keywords", () => {
      const bridgeGrades = getGradesByUseCase("bridge");
      expect(bridgeGrades.length).toBeGreaterThanOrEqual(3);
      const bridgeIds = bridgeGrades.map((g) => g.id);
      expect(bridgeIds).toContain("astm-a36");
      expect(bridgeIds).toContain("astm-a572-50");
      expect(bridgeIds).toContain("astm-a588");

      const marineGrades = getGradesByUseCase("marine");
      const marineIds = marineGrades.map((g) => g.id);
      expect(marineIds).toContain("aisi-316l");
      expect(marineIds).toContain("duplex-2205");
    });

    it("should provide an accurate review status summary", () => {
      const summary = getKnowledgeBaseSummary();
      expect(summary.totalGrades).toBe(10);
      expect(summary.fullyCheckedCount).toBe(10);
      expect(summary.needsReviewCount).toBe(0);
      expect(summary.families.length).toBeGreaterThanOrEqual(6);
      expect(summary.notice).toContain("Informational guidance only");
    });
  });
});
