import { describe, it, expect } from "vitest";
import { 
  calculateHaversineDistance, 
  getPerMileFreightRate, 
  calculateDeliveredCost 
} from "@/lib/engine/freight";

describe("Deterministic Freight & Landed Cost Engine Tests", () => {
  it("calculates accurate highway distance between Gary IN and Chicago IL", () => {
    // Gary (41.5934, -87.3464) to Chicago (41.8781, -87.6298) is approx ~30-35 highway miles
    const distance = calculateHaversineDistance(41.5934, -87.3464, 41.8781, -87.6298);
    expect(distance).toBeGreaterThanOrEqual(25);
    expect(distance).toBeLessThanOrEqual(45);
  });

  it("calculates accurate long-haul distance between Gary IN and Houston TX", () => {
    // Gary to Houston is approx ~1,050 to 1,150 highway route miles
    const distance = calculateHaversineDistance(41.5934, -87.3464, 29.7604, -95.3698);
    expect(distance).toBeGreaterThan(950);
    expect(distance).toBeLessThan(1250);
  });

  it("applies tiered mileage rates for local, regional, and long-haul distances", () => {
    expect(getPerMileFreightRate(100)).toBe(4.50); // <= 150 miles
    expect(getPerMileFreightRate(350)).toBe(3.85); // 151 - 500 miles
    expect(getPerMileFreightRate(900)).toBe(3.25); // > 500 miles
  });

  it("requires multiple truckloads when payload exceeds 45,000 lbs legal limit", () => {
    const delivered = calculateDeliveredCost({
      listingId: "test-listing-1",
      warehouseCity: "Gary",
      warehouseState: "IN",
      warehouseLat: 41.5934,
      warehouseLng: -87.3464,
      destinationZip: "46402", // local Gary
      weightLbs: 61200, // Exceeds 45k lbs
      pricePerCwt: 50.00
    });

    expect(delivered.truckloadsRequired).toBe(2);
    expect(delivered.totalTons).toBe(30.6);
    expect(delivered.baseMaterialCost).toBe((61200 / 100) * 50.0);
    expect(delivered.totalFreightCost).toBeGreaterThan(0);
    expect(delivered.totalDeliveredCost).toBe(delivered.baseMaterialCost + delivered.totalFreightCost);
  });

  it("adds oversize permit allowance when plate width exceeds 102 inches (8.5 ft)", () => {
    const normalLoad = calculateDeliveredCost({
      listingId: "test-normal",
      warehouseCity: "Gary",
      warehouseState: "IN",
      warehouseLat: 41.5934,
      warehouseLng: -87.3464,
      destinationZip: "60601",
      weightLbs: 20000,
      pricePerCwt: 50.00,
      widthInches: 96
    });

    const oversizeLoad = calculateDeliveredCost({
      listingId: "test-oversize",
      warehouseCity: "Gary",
      warehouseState: "IN",
      warehouseLat: 41.5934,
      warehouseLng: -87.3464,
      destinationZip: "60601",
      weightLbs: 20000,
      pricePerCwt: 50.00,
      widthInches: 120 // 10 ft wide -> requires oversize permit
    });

    expect(oversizeLoad.totalFreightCost).toBeGreaterThan(normalLoad.totalFreightCost);
    expect(oversizeLoad.assumptions.some((a) => a.includes("Oversize load surcharge"))).toBe(true);
  });

  it("explicitly documents all logistics assumptions and fuel surcharges", () => {
    const result = calculateDeliveredCost({
      listingId: "test-listing-audit",
      warehouseCity: "Pittsburgh",
      warehouseState: "PA",
      warehouseLat: 40.4406,
      warehouseLng: -79.9959,
      destinationZip: "77002",
      weightLbs: 38000,
      pricePerCwt: 65.00
    });

    expect(result.assumptions.length).toBeGreaterThanOrEqual(4);
    expect(result.assumptions.some((a) => a.includes("FOB origin"))).toBe(true);
    expect(result.assumptions.some((a) => a.includes("Fuel surcharge"))).toBe(true);
    expect(result.deliveredCostPerCwt).toBeGreaterThan(65.00); // Base price + freight markup
  });
});
