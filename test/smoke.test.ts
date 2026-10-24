import { describe, it, expect } from "vitest";
import { GRADE_STANDARDS_REGISTRY } from "@/lib/data/standards";
import { SYNTHETIC_LISTINGS, SYNTHETIC_SELLERS } from "@/lib/data/synthetic-listings";

describe("Phase 1 Baseline Sanity Tests", () => {
  it("should have registered core ASTM/AISI steel standards", () => {
    expect(GRADE_STANDARDS_REGISTRY["astm-a572-50"]).toBeDefined();
    expect(GRADE_STANDARDS_REGISTRY["astm-a36"]).toBeDefined();
    expect(GRADE_STANDARDS_REGISTRY["astm-a514"]).toBeDefined();
    expect(GRADE_STANDARDS_REGISTRY["astm-a516-70"]).toBeDefined();
    expect(GRADE_STANDARDS_REGISTRY["aisi-316l"]).toBeDefined();
  });

  it("should have synthetic demo sellers clearly marked", () => {
    expect(SYNTHETIC_SELLERS.length).toBeGreaterThanOrEqual(4);
    for (const seller of SYNTHETIC_SELLERS) {
      expect(seller.is_synthetic_demo).toBe(true);
      expect(seller.name).toContain("(Synthetic Demo)");
    }
  });

  it("should have synthetic inventory listings with valid weights and positive prices", () => {
    expect(SYNTHETIC_LISTINGS.length).toBeGreaterThanOrEqual(5);
    for (const listing of SYNTHETIC_LISTINGS) {
      expect(listing.total_weight_lbs).toBeGreaterThan(0);
      expect(listing.price_per_cwt).toBeGreaterThan(0);
      expect(listing.is_synthetic_demo).toBe(true);
      expect(listing.certificate).toBeDefined();
    }
  });
});
