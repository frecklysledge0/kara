import { describe, it, expect } from "vitest";
import {
  isValidCoordinates,
  calculateHaversineDistance,
  getDefaultPerMileRate,
  estimateLeadTime,
  convertTonsToLbs,
  convertTonsToKg,
  estimateFreight,
} from "@/lib/freight";
import { calculateDeliveredCost } from "@/lib/engine/freight";

describe("Pure Freight & Logistics Estimation Module (lib/freight.ts)", () => {
  // 1. Zero or Invalid Coordinates
  describe("Coordinate Validation and Edge Cases", () => {
    it("validates valid geographic coordinates", () => {
      expect(isValidCoordinates({ lat: 41.5934, lng: -87.3464 })).toBe(true); // Gary, IN
      expect(isValidCoordinates({ lat: 29.7604, lng: -95.3698 })).toBe(true); // Houston, TX
      expect(isValidCoordinates({ lat: 90, lng: 180 })).toBe(true); // Boundary
      expect(isValidCoordinates({ lat: -90, lng: -180 })).toBe(true); // Boundary
    });

    it("rejects zero coordinates (Null Island / uninitialized placeholder)", () => {
      expect(isValidCoordinates({ lat: 0, lng: 0 })).toBe(false);
      expect(isValidCoordinates({ lat: 0.00001, lng: -0.00001 })).toBe(false);
    });

    it("rejects out-of-range, NaN, or non-finite coordinates", () => {
      expect(isValidCoordinates({ lat: 95, lng: -87 })).toBe(false); // Lat > 90
      expect(isValidCoordinates({ lat: -91, lng: -87 })).toBe(false); // Lat < -90
      expect(isValidCoordinates({ lat: 41, lng: 185 })).toBe(false); // Lng > 180
      expect(isValidCoordinates({ lat: 41, lng: -185 })).toBe(false); // Lng < -180
      expect(isValidCoordinates({ lat: NaN, lng: -87 })).toBe(false);
      expect(isValidCoordinates({ lat: 41, lng: Infinity })).toBe(false);
      expect(isValidCoordinates(null)).toBe(false);
      expect(isValidCoordinates(undefined)).toBe(false);
    });

    it("gracefully returns failure and documents missing coordinates when inputs are invalid", () => {
      const result = estimateFreight({
        sellerLocation: { lat: 0, lng: 0 }, // Invalid zero origin
        buyerLocation: "60601",
        quantity: 20,
        unit: "us_short_ton",
        pricePerTon: 900,
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain("Origin (seller) location");
      expect(result.materialSubtotal).toBe(18000); // 20 * 900 still computes safely
      expect(result.estimatedShipmentFreight).toBe(0);
      expect(result.assumptions.some((a) => a.includes("[LOGISTICS NOTICE]"))).toBe(true);
    });

    it("gracefully handles missing destination coordinates", () => {
      const result = estimateFreight({
        sellerLocation: { lat: 41.5934, lng: -87.3464 },
        buyerLocation: null,
        quantity: 15,
        unit: "us_short_ton",
        pricePerTon: 800,
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain("Destination (buyer) location");
      expect(result.approximateLeadTimeText).toBe("Location pending");
    });
  });

  // 2. Identical Locations
  describe("Identical Location Handling", () => {
    it("returns zero distance and local yard transfer rate when origin and destination are identical", () => {
      const sameLocation = { lat: 41.5934, lng: -87.3464, city: "Gary", state: "IN" };
      const dist = calculateHaversineDistance(sameLocation.lat, sameLocation.lng, sameLocation.lat, sameLocation.lng);
      expect(dist).toBe(0);

      const result = estimateFreight({
        sellerLocation: sameLocation,
        buyerLocation: sameLocation,
        quantity: 20,
        unit: "us_short_ton",
        pricePerTon: 850,
      });

      expect(result.success).toBe(true);
      expect(result.straightLineDistanceMiles).toBe(0);
      expect(result.estimatedRoadDistanceMiles).toBe(0);
      expect(result.estimatedShipmentFreight).toBeGreaterThan(0); // Minimum local dispatch / yard transfer
      expect(result.approximateLeadTimeText).toContain("Same-day or next-day");
    });
  });

  // 3. Partial Truckloads & Capacity Allocation
  describe("Partial Truckloads & Trailer Utilization", () => {
    it("identifies partial truckloads under the 45,000 lb legal trailer limit", () => {
      // 10 short tons = 20,000 lbs (under 45,000 lbs)
      const result = estimateFreight({
        sellerLocation: { lat: 41.5934, lng: -87.3464, city: "Gary", state: "IN" },
        buyerLocation: "60601", // Chicago, IL (~34 road miles)
        quantity: 10,
        unit: "us_short_ton",
        pricePerTon: 950,
      });

      expect(result.success).toBe(true);
      expect(result.totalWeightLbs).toBe(20000);
      expect(result.truckloadsRequired).toBe(1);
      expect(result.isPartialTruckload).toBe(true);
      expect(result.payloadUtilizationPct).toBe(44.4); // 20000 / 45000 = 44.4%
      expect(result.assumptions.some((a) => a.includes("44.4% trailer utilization"))).toBe(true);
    });

    it("requires multiple truckloads when payload exceeds single trailer limit", () => {
      // 50 short tons = 100,000 lbs -> requires 3 trucks (45k + 45k + 10k)
      const result = estimateFreight({
        sellerLocation: { lat: 41.5934, lng: -87.3464, city: "Gary", state: "IN" },
        buyerLocation: "60601",
        quantity: 50,
        unit: "us_short_ton",
        pricePerTon: 900,
      });

      expect(result.truckloadsRequired).toBe(3);
      expect(result.isPartialTruckload).toBe(true); // 3rd truck is partial
      expect(result.payloadUtilizationPct).toBe(74.1); // 100,000 / 135,000 = 74.07% -> 74.1%
    });

    it("supports configurable partial truckload prorating (LTL shared trailer model)", () => {
      const fullTruckloadResult = estimateFreight({
        sellerLocation: { lat: 41.5934, lng: -87.3464, city: "Gary", state: "IN" },
        buyerLocation: "77002", // Houston, TX
        quantity: 10, // ~44% of trailer
        unit: "us_short_ton",
        pricePerTon: 1000,
        config: { partialTruckloadModel: "full_truckload" },
      });

      const proratedResult = estimateFreight({
        sellerLocation: { lat: 41.5934, lng: -87.3464, city: "Gary", state: "IN" },
        buyerLocation: "77002",
        quantity: 10,
        unit: "us_short_ton",
        pricePerTon: 1000,
        config: { partialTruckloadModel: "prorated_partial" },
      });

      // Dedicated full truckload charges for the whole trailer; prorated charges for fractional share
      expect(proratedResult.estimatedShipmentFreight).toBeLessThan(fullTruckloadResult.estimatedShipmentFreight);
    });
  });

  // 4. Different Ton Units (US Short Ton vs Metric Ton)
  describe("Ton Unit Handling & Conversions", () => {
    it("differentiates US short tons (2,000 lbs) from Metric tonnes (~2,204.62 lbs)", () => {
      const shortTonLbs = convertTonsToLbs(10, "us_short_ton");
      const metricTonLbs = convertTonsToLbs(10, "metric_ton");

      expect(shortTonLbs).toBe(20000);
      expect(metricTonLbs).toBeCloseTo(22046.23, 1);
      expect(metricTonLbs).toBeGreaterThan(shortTonLbs);

      const shortTonKg = convertTonsToKg(10, "us_short_ton");
      const metricTonKg = convertTonsToKg(10, "metric_ton");

      expect(shortTonKg).toBeCloseTo(9071.85, 1);
      expect(metricTonKg).toBe(10000);
    });

    it("calculates accurate delivered cost per ton for both US short tons and Metric tonnes", () => {
      const shortTonFreight = estimateFreight({
        sellerLocation: { lat: 41.5934, lng: -87.3464, city: "Gary", state: "IN" },
        buyerLocation: "48226", // Detroit, MI
        quantity: 20,
        unit: "us_short_ton",
        pricePerTon: 1000,
      });

      const metricTonFreight = estimateFreight({
        sellerLocation: { lat: 41.5934, lng: -87.3464, city: "Gary", state: "IN" },
        buyerLocation: "48226",
        quantity: 20,
        unit: "metric_ton",
        pricePerTon: 1000,
      });

      expect(shortTonFreight.unit).toBe("us_short_ton");
      expect(metricTonFreight.unit).toBe("metric_ton");
      expect(metricTonFreight.totalWeightLbs).toBeGreaterThan(shortTonFreight.totalWeightLbs);
      expect(shortTonFreight.materialSubtotal).toBe(20000);
      expect(metricTonFreight.materialSubtotal).toBe(20000);
    });
  });

  // 5. Quantity-Price Multiplication & Floating Point Safety
  describe("Quantity-Price Multiplication Precision", () => {
    it("multiplies quantity and price with exact 2-decimal financial precision", () => {
      const result = estimateFreight({
        sellerLocation: { lat: 41.5934, lng: -87.3464, city: "Gary", state: "IN" },
        buyerLocation: "60601",
        quantity: 33.33,
        unit: "us_short_ton",
        pricePerTon: 777.77,
      });

      // 33.33 * 777.77 = 25923.0741 -> rounds to 25923.07
      expect(result.materialSubtotal).toBe(25923.07);
      expect(result.estimatedDeliveredTotal).toBe(
        Number((result.materialSubtotal + result.estimatedShipmentFreight).toFixed(2))
      );
      expect(result.estimatedDeliveredPricePerTon).toBe(
        Number((result.estimatedDeliveredTotal / 33.33).toFixed(2))
      );
    });
  });

  // 6. Missing Rates & Configurable Overrides
  describe("Configurable Parameters & Missing Rate Fallbacks", () => {
    it("falls back to default tiered mileage rates ($4.50, $3.85, $3.25) when rate is unspecified", () => {
      expect(getDefaultPerMileRate(80)).toBe(4.50); // Short-haul <= 150 mi
      expect(getDefaultPerMileRate(300)).toBe(3.85); // Regional 151-500 mi
      expect(getDefaultPerMileRate(800)).toBe(3.25); // Long-haul > 500 mi
    });

    it("respects custom configurable freight rate overrides", () => {
      const customResult = estimateFreight({
        sellerLocation: { lat: 41.5934, lng: -87.3464, city: "Gary", state: "IN" },
        buyerLocation: "60601",
        quantity: 20,
        unit: "us_short_ton",
        pricePerTon: 900,
        config: {
          costPerMile: 6.50, // Custom premium flatbed rate
          fuelSurchargeRate: 0.25, // 25% custom fuel surcharge
          truckCapacityWeightLbs: 48000, // Heavy haul permit trailer
          roadDistanceMultiplier: 1.25, // Mountainous terrain circuity
        },
      });

      expect(customResult.baseMileageRate).toBe(6.50);
      expect(customResult.truckCapacityLbs).toBe(48000);
      expect(customResult.assumptions.some((a) => a.includes("$6.50/mile"))).toBe(true);
      expect(customResult.assumptions.some((a) => a.includes("25.0% diesel fuel surcharge"))).toBe(true);
    });
  });

  // 7. Consistent Rounding & Financial Sanitization
  describe("Consistent Rounding Standards", () => {
    it("ensures all currency and percentage outputs are rounded without float artifacts", () => {
      const result = estimateFreight({
        sellerLocation: { lat: 40.4406, lng: -79.9959, city: "Pittsburgh", state: "PA" },
        buyerLocation: "77002", // Houston, TX
        quantity: 21.45,
        unit: "us_short_ton",
        pricePerTon: 1125.65,
      });

      // Verify no float artifacts like 1234.567890123
      expect(String(result.materialSubtotal).split(".")[1]?.length || 0).toBeLessThanOrEqual(2);
      expect(String(result.estimatedShipmentFreight).split(".")[1]?.length || 0).toBeLessThanOrEqual(2);
      expect(String(result.fuelSurcharge).split(".")[1]?.length || 0).toBeLessThanOrEqual(2);
      expect(String(result.freightPerTon).split(".")[1]?.length || 0).toBeLessThanOrEqual(2);
      expect(String(result.estimatedDeliveredTotal).split(".")[1]?.length || 0).toBeLessThanOrEqual(2);
      expect(String(result.estimatedDeliveredPricePerTon).split(".")[1]?.length || 0).toBeLessThanOrEqual(2);
      expect(String(result.payloadUtilizationPct).split(".")[1]?.length || 0).toBeLessThanOrEqual(1);
    });
  });

  // 8. Lead Time Heuristics & Disclaimers
  describe("Lead Time Heuristics & Transparency Disclaimers", () => {
    it("computes reasonable lead time ranges and includes non-commitment disclaimers", () => {
      // Local delivery (<150 miles)
      const local = estimateLeadTime(45);
      expect(local.minDays).toBeGreaterThanOrEqual(1);
      expect(local.maxDays).toBeLessThanOrEqual(3);
      expect(local.disclaimer).toContain("Not a carrier-confirmed or guaranteed delivery date");

      // Long-haul delivery (>1,000 miles)
      const longHaul = estimateLeadTime(1200);
      expect(longHaul.minDays).toBeGreaterThanOrEqual(3);
      expect(longHaul.maxDays).toBeGreaterThanOrEqual(5);
    });
  });

  // 9. Documented Demo Assumptions Tagging
  describe("Assumption Tagging & Transparency", () => {
    it("tags all heuristic calculations clearly as demo assumptions", () => {
      const result = estimateFreight({
        sellerLocation: { lat: 41.5934, lng: -87.3464, city: "Gary", state: "IN" },
        buyerLocation: "60601",
        quantity: 25,
        unit: "us_short_ton",
        pricePerTon: 950,
      });

      expect(result.isDemoAssumption).toBe(true);
      expect(result.assumptions.length).toBeGreaterThanOrEqual(5);
      result.assumptions.forEach((assumption) => {
        expect(assumption.startsWith("[DEMO ASSUMPTION]")).toBe(true);
      });
      expect(result.distanceApproximationNotice).toContain("Geographic approximation");
    });
  });

  // 10. Backward Compatibility for Engine calculateDeliveredCost
  describe("Legacy calculateDeliveredCost Compatibility", () => {
    it("preserves calculateDeliveredCost signature and calculations", () => {
      const delivered = calculateDeliveredCost({
        listingId: "test-legacy",
        warehouseCity: "Gary",
        warehouseState: "IN",
        warehouseLat: 41.5934,
        warehouseLng: -87.3464,
        destinationZip: "60601",
        weightLbs: 40000,
        pricePerCwt: 50.00,
      });

      expect(delivered.listingId).toBe("test-legacy");
      expect(delivered.truckloadsRequired).toBe(1);
      expect(delivered.totalTons).toBe(20);
      expect(delivered.baseMaterialCost).toBe(20000);
      expect(delivered.totalDeliveredCost).toBe(delivered.baseMaterialCost + delivered.totalFreightCost);
      expect(delivered.assumptions.length).toBeGreaterThanOrEqual(3);
    });
  });
});
