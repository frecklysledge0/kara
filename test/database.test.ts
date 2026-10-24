import { describe, it, expect } from "vitest";
import {
  validateListingInput,
  validateOrderInput,
  ListingInsert,
  OrderInsert,
} from "@/types/database";
import {
  FIXTURE_SELLERS,
  FIXTURE_LISTINGS,
  FIXTURE_CERTIFICATES,
  FIXTURE_ORDERS,
  getFixtureListingsWithRelations,
  DEMO_MODE_METADATA,
} from "@/lib/data/fixtures";
import { fetchListings } from "@/lib/supabase/database";

describe("MillProof Database Layer & Validation Tests", () => {
  describe("1. Listing Input Validation", () => {
    it("should accept valid listing inputs with positive numeric quantities and prices", () => {
      const validListing: ListingInsert = {
        seller_id: "11111111-1111-4111-8111-111111111111",
        grade: "ASTM A572 Grade 50",
        form: "Plate",
        thickness_in: 0.75,
        quantity_tons: 24.5,
        price_per_ton: 1080.0,
        status: "active",
      };

      const result = validateListingInput(validListing);
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it("should reject negative or zero prices per ton", () => {
      const zeroPriceListing: ListingInsert = {
        seller_id: "11111111-1111-4111-8111-111111111111",
        grade: "ASTM A36",
        form: "Plate",
        thickness_in: 0.5,
        quantity_tons: 10.0,
        price_per_ton: 0,
      };

      const resultZero = validateListingInput(zeroPriceListing);
      expect(resultZero.valid).toBe(false);
      expect(resultZero.errors).toContain("price_per_ton must be a positive numeric value");

      const negPriceListing: ListingInsert = {
        ...zeroPriceListing,
        price_per_ton: -500,
      };
      const resultNeg = validateListingInput(negPriceListing);
      expect(resultNeg.valid).toBe(false);
      expect(resultNeg.errors).toContain("price_per_ton must be a positive numeric value");
    });

    it("should reject negative or zero tonnage quantities", () => {
      const invalidQtyListing: ListingInsert = {
        seller_id: "11111111-1111-4111-8111-111111111111",
        grade: "ASTM A36",
        form: "Plate",
        thickness_in: 0.5,
        quantity_tons: 0,
        price_per_ton: 950.0,
      };

      const result = validateListingInput(invalidQtyListing);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain("quantity_tons must be a positive numeric value");
    });

    it("should reject non-positive thickness values", () => {
      const invalidThickness: ListingInsert = {
        seller_id: "11111111-1111-4111-8111-111111111111",
        grade: "ASTM A36",
        form: "Plate",
        thickness_in: -0.25,
        quantity_tons: 15.0,
        price_per_ton: 950.0,
      };

      const result = validateListingInput(invalidThickness);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain("thickness_in must be a positive numeric value");
    });

    it("should reject invalid listing status values", () => {
      const invalidStatus: ListingInsert = {
        seller_id: "11111111-1111-4111-8111-111111111111",
        grade: "ASTM A36",
        form: "Plate",
        thickness_in: 0.5,
        quantity_tons: 10.0,
        price_per_ton: 950.0,
        status: "pending_approval" as unknown as "active",
      };

      const result = validateListingInput(invalidStatus);
      expect(result.valid).toBe(false);
      expect(result.errors[0]).toContain("Invalid status");
    });
  });

  describe("2. Order Input Validation", () => {
    it("should accept valid order inputs with positive tons and delivered cost", () => {
      const validOrder: OrderInsert = {
        listing_id: "10101010-1010-4010-8010-101010101010",
        buyer_name: "Apex Infrastructure",
        buyer_city: "Chicago",
        quantity_tons: 24.5,
        estimated_delivered_cost: 28588.58,
        status: "submitted",
      };

      const result = validateOrderInput(validOrder);
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it("should reject zero or negative estimated delivered costs", () => {
      const invalidCostOrder: OrderInsert = {
        listing_id: "10101010-1010-4010-8010-101010101010",
        buyer_name: "Apex Infrastructure",
        buyer_city: "Chicago",
        quantity_tons: 10.0,
        estimated_delivered_cost: 0,
      };

      const result = validateOrderInput(invalidCostOrder);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain("estimated_delivered_cost must be a positive numeric value");
    });

    it("should require buyer name and city", () => {
      const missingBuyerOrder: OrderInsert = {
        listing_id: "10101010-1010-4010-8010-101010101010",
        buyer_name: "   ",
        buyer_city: "",
        quantity_tons: 10.0,
        estimated_delivered_cost: 15000.0,
      };

      const result = validateOrderInput(missingBuyerOrder);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain("buyer_name is required");
      expect(result.errors).toContain("buyer_city is required");
    });
  });

  describe("3. Demo Seed Data & Seller Integrity", () => {
    it("should contain 4 to 6 fictional sellers in plausible US steel markets", () => {
      expect(FIXTURE_SELLERS.length).toBeGreaterThanOrEqual(4);
      expect(FIXTURE_SELLERS.length).toBeLessThanOrEqual(6);

      const cities = FIXTURE_SELLERS.map((s) => s.city);
      expect(cities).toContain("Gary");
      expect(cities).toContain("Houston");
      expect(cities).toContain("Pittsburgh");
    });

    it("should explicitly mark all sellers as synthetic demo entities", () => {
      for (const seller of FIXTURE_SELLERS) {
        expect(seller.demo_status).toBe("synthetic_demo");
        expect(seller.name).toContain("(Synthetic Demo)");
        expect(seller.latitude).not.toBeNull();
        expect(seller.longitude).not.toBeNull();
        if (seller.mill_route) {
          expect(["EAF", "BOF"]).toContain(seller.mill_route);
        }
      }
    });

    it("should contain approximately 20 synthetic listings across diverse forms and grades", () => {
      expect(FIXTURE_LISTINGS.length).toBeGreaterThanOrEqual(18);
      expect(FIXTURE_LISTINGS.length).toBeLessThanOrEqual(25);

      const grades = new Set(FIXTURE_LISTINGS.map((l) => l.grade));
      expect(grades.size).toBeGreaterThanOrEqual(5);
      expect(grades.has("ASTM A572 Grade 50")).toBe(true);
      expect(grades.has("ASTM A516 Grade 70")).toBe(true);
      expect(grades.has("ASTM A992")).toBe(true);

      const forms = new Set(FIXTURE_LISTINGS.map((l) => l.form));
      expect(forms.size).toBeGreaterThanOrEqual(3);
      expect(forms.has("Plate")).toBe(true);
      expect(forms.has("Wide Flange Beam")).toBe(true);

      for (const listing of FIXTURE_LISTINGS) {
        expect(listing.quantity_tons).toBeGreaterThan(0);
        expect(listing.price_per_ton).toBeGreaterThan(0);
        expect(listing.thickness_in).toBeGreaterThan(0);
        expect(["draft", "active", "reserved", "closed"]).toContain(listing.status);
      }
    });

    it("should include certificates with SHA-256 hashes and chemistry/mechanical JSON", () => {
      expect(FIXTURE_CERTIFICATES.length).toBeGreaterThanOrEqual(5);

      for (const cert of FIXTURE_CERTIFICATES) {
        expect(cert.document_sha256).toMatch(/^[a-f0-9]{64}$/);
        expect(cert.heat_number).toBeTruthy();
        expect(cert.mill_name).toBeTruthy();
        expect(cert.chemistry).toBeTypeOf("object");
        expect(cert.mechanical).toBeTypeOf("object");
        expect(["pending", "processing", "completed", "failed"]).toContain(cert.extraction_status);
        expect(["unreviewed", "flagged", "approved", "rejected"]).toContain(cert.review_status);
      }
    });

    it("should include valid sample procurement orders", () => {
      expect(FIXTURE_ORDERS.length).toBeGreaterThanOrEqual(3);

      for (const order of FIXTURE_ORDERS) {
        expect(order.quantity_tons).toBeGreaterThan(0);
        expect(order.estimated_delivered_cost).toBeGreaterThan(0);
        expect(order.buyer_name).toBeTruthy();
        expect(order.buyer_city).toBeTruthy();

        // Ensure listing foreign key references an existing listing
        const matchingListing = FIXTURE_LISTINGS.find((l) => l.id === order.listing_id);
        expect(matchingListing).toBeDefined();
      }
    });
  });

  describe("4. Fixture Mode & Filtering Logic", () => {
    it("should expose clear demo mode metadata", () => {
      expect(DEMO_MODE_METADATA.isDemoEnvironment).toBe(true);
      expect(DEMO_MODE_METADATA.environmentLabel).toContain("Synthetic Demo");
      expect(DEMO_MODE_METADATA.notice).toContain("synthetic demo records");
    });

    it("should populate relation data correctly in getFixtureListingsWithRelations", () => {
      const enriched = getFixtureListingsWithRelations();
      expect(enriched.length).toBe(FIXTURE_LISTINGS.length);

      for (const item of enriched) {
        expect(item.seller).toBeDefined();
        expect(item.seller?.name).toContain("(Synthetic Demo)");
        if (item.certificate_id) {
          expect(item.certificate).toBeDefined();
        }
      }
    });
  });
});
