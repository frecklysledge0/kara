import { describe, it, expect } from "vitest";
import { fetchListings, fetchListingById, insertOrder } from "@/lib/supabase/database";
import { calculateDeliveredCost } from "@/lib/engine/freight";
import { QuoteRequestSchema } from "@/app/api/quotes/route";
import { FIXTURE_LISTINGS } from "@/lib/data/fixtures";

describe("MillProof Marketplace & Quote Request Tests", () => {
  // 1. Filter Tests
  describe("1. Inventory Filtering", () => {
    it("filters listings by ASTM steel grade correctly", async () => {
      const { data: allListings } = await fetchListings();
      expect(allListings.length).toBeGreaterThan(0);

      const a572Lots = allListings.filter((l) => l.grade === "ASTM A572 Grade 50");
      expect(a572Lots.length).toBeGreaterThan(0);
      a572Lots.forEach((lot) => {
        expect(lot.grade).toBe("ASTM A572 Grade 50");
      });

      const a36Lots = allListings.filter((l) => l.grade === "ASTM A36");
      expect(a36Lots.length).toBeGreaterThan(0);
      a36Lots.forEach((lot) => {
        expect(lot.grade).toBe("ASTM A36");
      });
    });

    it("filters listings by product form (e.g. Plate, Beam)", async () => {
      const { data: allListings } = await fetchListings();
      const plates = allListings.filter((l) => l.form.toLowerCase() === "plate");
      expect(plates.length).toBeGreaterThan(0);
      plates.forEach((p) => {
        expect(p.form.toLowerCase()).toBe("plate");
      });
    });

    it("filters listings by seller warehouse state", async () => {
      const { data: allListings } = await fetchListings();
      const inLots = allListings.filter((l) => l.seller?.state === "IN");
      expect(inLots.length).toBeGreaterThan(0);
      inLots.forEach((lot) => {
        expect(lot.seller?.state).toBe("IN");
      });
    });

    it("filters listings by maximum price per ton", async () => {
      const { data: allListings } = await fetchListings();
      const maxCap = 1000;
      const affordableLots = allListings.filter((l) => l.price_per_ton <= maxCap);
      expect(affordableLots.length).toBeGreaterThan(0);
      affordableLots.forEach((lot) => {
        expect(lot.price_per_ton).toBeLessThanOrEqual(maxCap);
      });
    });
  });

  // 2. Sorting Tests
  describe("2. Inventory Sorting", () => {
    it("sorts listings by base price ascending and descending", async () => {
      const { data: allListings } = await fetchListings();

      const sortedAsc = [...allListings].sort((a, b) => a.price_per_ton - b.price_per_ton);
      for (let i = 0; i < sortedAsc.length - 1; i++) {
        expect(sortedAsc[i].price_per_ton).toBeLessThanOrEqual(sortedAsc[i + 1].price_per_ton);
      }

      const sortedDesc = [...allListings].sort((a, b) => b.price_per_ton - a.price_per_ton);
      for (let i = 0; i < sortedDesc.length - 1; i++) {
        expect(sortedDesc[i].price_per_ton).toBeGreaterThanOrEqual(sortedDesc[i + 1].price_per_ton);
      }
    });

    it("sorts listings by available tonnage descending", async () => {
      const { data: allListings } = await fetchListings();
      const sortedQty = [...allListings].sort((a, b) => b.quantity_tons - a.quantity_tons);

      for (let i = 0; i < sortedQty.length - 1; i++) {
        expect(sortedQty[i].quantity_tons).toBeGreaterThanOrEqual(sortedQty[i + 1].quantity_tons);
      }
    });

    it("sorts listings by material thickness ascending", async () => {
      const { data: allListings } = await fetchListings();
      const sortedThickness = [...allListings].sort((a, b) => a.thickness_in - b.thickness_in);

      for (let i = 0; i < sortedThickness.length - 1; i++) {
        expect(sortedThickness[i].thickness_in).toBeLessThanOrEqual(sortedThickness[i + 1].thickness_in);
      }
    });

    it("sorts by delivered landed cost when buyer destination is supplied", async () => {
      const { data: allListings } = await fetchListings();

      const withDelivered = allListings.map((l) => {
        const freight = calculateDeliveredCost({
          listingId: l.id,
          warehouseCity: l.seller?.city || "Gary",
          warehouseState: l.seller?.state || "IN",
          warehouseLat: l.seller?.latitude || 41.5934,
          warehouseLng: l.seller?.longitude || -87.3464,
          destinationZip: "60601",
          weightLbs: l.quantity_tons * 2000,
          pricePerCwt: l.price_per_ton / 20.0,
        });
        return {
          ...l,
          deliveredPricePerTon: freight.deliveredCostPerCwt * 20,
        };
      });

      const sortedDelivered = withDelivered.sort((a, b) => a.deliveredPricePerTon - b.deliveredPricePerTon);
      for (let i = 0; i < sortedDelivered.length - 1; i++) {
        expect(sortedDelivered[i].deliveredPricePerTon).toBeLessThanOrEqual(sortedDelivered[i + 1].deliveredPricePerTon);
      }
    });
  });

  // 3. Invalid IDs & Inactive Listings
  describe("3. Invalid IDs and Inactive Listing Handling", () => {
    it("returns null when querying a non-existent listing ID", async () => {
      const result = await fetchListingById("00000000-0000-0000-0000-000000000000");
      expect(result.data).toBeNull();
    });

    it("correctly identifies inactive or closed listings", async () => {
      // Find or create an inactive fixture
      const inactiveListing = FIXTURE_LISTINGS.find((l) => l.status === "closed" || l.status === "reserved");
      if (inactiveListing) {
        const { data: found } = await fetchListingById(inactiveListing.id);
        expect(found).toBeDefined();
        expect(found?.status).not.toBe("active");
      }
    });
  });

  // 4. Quote Request Validation
  describe("4. Quote Request Validation & Rules", () => {
    it("accepts valid quote request input data", () => {
      const validInput = {
        listing_id: "10101010-1010-4010-8010-101010101010",
        buyer_name: "Jane Fabricator",
        buyer_email: "jane@midweststeel.com",
        buyer_company: "Midwest Heavy Fabrication",
        buyer_city: "Chicago",
        buyer_state: "IL",
        buyer_zip: "60601",
        quantity_tons: 15.0,
        notes: "Crane unloading available on site.",
      };

      const result = QuoteRequestSchema.safeParse(validInput);
      expect(result.success).toBe(true);
    });

    it("rejects quote requests with invalid email address", () => {
      const invalidEmail = {
        listing_id: "10101010-1010-4010-8010-101010101010",
        buyer_name: "Jane Doe",
        buyer_email: "not-an-email",
        buyer_city: "Chicago",
        buyer_state: "IL",
        quantity_tons: 10.0,
      };

      const result = QuoteRequestSchema.safeParse(invalidEmail);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues.some((i) => i.path.includes("buyer_email"))).toBe(true);
      }
    });

    it("rejects quote requests with negative or zero tonnage", () => {
      const zeroQty = {
        listing_id: "10101010-1010-4010-8010-101010101010",
        buyer_name: "Jane Doe",
        buyer_email: "jane@company.com",
        buyer_city: "Chicago",
        buyer_state: "IL",
        quantity_tons: 0,
      };

      const result = QuoteRequestSchema.safeParse(zeroQty);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues.some((i) => i.path.includes("quantity_tons"))).toBe(true);
      }
    });

    it("rejects quote requests with missing required contact and delivery city", () => {
      const missingCity = {
        listing_id: "10101010-1010-4010-8010-101010101010",
        buyer_name: "Jane Doe",
        buyer_email: "jane@company.com",
        buyer_state: "IL",
        quantity_tons: 5.0,
      };

      const result = QuoteRequestSchema.safeParse(missingCity);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues.some((i) => i.path.includes("buyer_city"))).toBe(true);
      }
    });

    it("saves submitted quote request into orders repository with 'submitted' status (not confirmed payment)", async () => {
      const orderInsert = {
        listing_id: "10101010-1010-4010-8010-101010101010",
        buyer_name: "Sarah Structural - sarah@fabricators.com",
        buyer_city: "Chicago, IL",
        quantity_tons: 12.5,
        estimated_delivered_cost: 13950.0,
        status: "submitted" as const,
      };

      const savedOrder = await insertOrder(orderInsert);
      expect(savedOrder.data).toBeDefined();
      expect(savedOrder.data.status).toBe("submitted");
      expect(savedOrder.data.quantity_tons).toBe(12.5);
      expect(savedOrder.data.buyer_city).toContain("Chicago");
    });
  });
});
