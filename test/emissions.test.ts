import { describe, it, expect } from "vitest";
import {
  calculateEmissions,
  EMBODIED_CARBON_FACTORS,
  TRANSPORT_EMISSION_FACTOR,
} from "@/lib/engine/emissions";

describe("MillProof Embodied Carbon & Logistics Emissions Module (A1-A4)", () => {
  it("calculates low-carbon footprint for EAF scrap-based mini-mill structural steel", () => {
    const result = calculateEmissions({
      quantityTons: 20.0, // 20 US short tons
      tonUnit: "us_short_ton",
      millRoute: "EAF",
      materialFamily: "Structural Carbon Steel",
      roadDistanceMiles: 100,
    });

    // 20 short tons = 18.14 metric tons. At 0.42 t/t: ~7.62 metric tons CO2e
    expect(result.productionEmissionsMetricTons).toBeGreaterThan(6.0);
    expect(result.productionEmissionsMetricTons).toBeLessThan(9.0);

    // Transport: 100 miles * 20 short tons * 0.1618 kg = 323.6 kg = 0.32 metric tons CO2e
    expect(result.transportEmissionsMetricTons).toBeCloseTo(0.32, 1);

    // Total should equal production + transport
    expect(result.totalEmissionsMetricTons).toBeCloseTo(
      result.productionEmissionsMetricTons + result.transportEmissionsMetricTons,
      1
    );

    // Intensity should be < 0.60 t CO2e/t
    expect(result.emissionsIntensity_tCO2ePerTon).toBeLessThan(0.60);

    // Should demonstrate significant savings vs 1.89 t/t global industry average
    expect(result.savingsVsGlobalAvgMetricTons).toBeGreaterThan(20.0);
  });

  it("calculates higher carbon footprint for BOF blast-furnace route", () => {
    const eafResult = calculateEmissions({
      quantityTons: 30.0,
      millRoute: "EAF",
      roadDistanceMiles: 200,
    });

    const bofResult = calculateEmissions({
      quantityTons: 30.0,
      millRoute: "BOF",
      roadDistanceMiles: 200,
    });

    // BOF intensity (~2.05 t/t) is significantly higher than EAF (~0.42 t/t)
    expect(bofResult.productionEmissionsMetricTons).toBeGreaterThan(eafResult.productionEmissionsMetricTons * 4);
    expect(bofResult.emissionsIntensity_tCO2ePerTon).toBeGreaterThan(2.0);
  });

  it("applies austenitic stainless steel benchmark factors correctly", () => {
    const result = calculateEmissions({
      quantityTons: 10.0,
      millRoute: "EAF",
      materialFamily: "Austenitic Stainless Steel",
      roadDistanceMiles: 50,
    });

    // Austenitic stainless central factor is 2.80 t CO2e/t
    expect(result.productionEmissionsMetricTons).toBeGreaterThan(20.0);
    expect(result.dataSources.production).toContain("ISSF");
  });

  it("reports explicit uncertainty bounds reflecting published LCI variances", () => {
    const result = calculateEmissions({
      quantityTons: 25.0,
      millRoute: "EAF",
      roadDistanceMiles: 150,
    });

    const { minTotalMetricTons, maxTotalMetricTons, uncertaintyPct } = result.uncertaintyRange;

    expect(minTotalMetricTons).toBeLessThan(result.totalEmissionsMetricTons);
    expect(maxTotalMetricTons).toBeGreaterThan(result.totalEmissionsMetricTons);
    expect(uncertaintyPct).toBeGreaterThanOrEqual(10);
    expect(uncertaintyPct).toBeLessThanOrEqual(25);
  });

  it("provides comprehensive system boundary definition and data attribution", () => {
    const result = calculateEmissions({
      quantityTons: 15.0,
      millRoute: "EAF",
      roadDistanceMiles: 80,
    });

    expect(result.systemBoundary).toContain("Modules A1-A4");
    expect(result.dataSources.production).toBe(EMBODIED_CARBON_FACTORS.EAF.source);
    expect(result.dataSources.transport).toBe(TRANSPORT_EMISSION_FACTOR.source);
    expect(result.disclaimer).toContain("Modeled engineering estimate");
  });
});
