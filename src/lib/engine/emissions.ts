// =====================================================================
// MillProof: Transparent Embodied Carbon & Logistics Emissions Module
// Calculates Scope 1, Scope 2, and Scope 3 (Category 4 Upstream Transport)
// System Boundary: EN 15804 / ISO 14040 Modules A1-A4 (Cradle-to-Jobsite Gate)
// =====================================================================

export type MillProductionRoute = "EAF" | "BOF";

export interface EmissionsCalculationParams {
  quantityTons: number; // in short tons (US) or metric tons
  tonUnit?: "us_short_ton" | "metric_ton";
  millRoute?: MillProductionRoute | string | null;
  materialFamily?: string;
  roadDistanceMiles?: number;
}

export interface EmissionsBreakdown {
  productionEmissionsMetricTons: number;
  transportEmissionsMetricTons: number;
  totalEmissionsMetricTons: number;
  emissionsIntensity_tCO2ePerTon: number; // metric tons CO2e per metric ton of steel
  uncertaintyRange: {
    minTotalMetricTons: number;
    maxTotalMetricTons: number;
    uncertaintyPct: number;
  };
  savingsVsGlobalAvgMetricTons: number;
  systemBoundary: string;
  dataSources: {
    production: string;
    transport: string;
  };
  disclaimer: string;
}

/**
 * Peer-reviewed benchmark emissions factors (A1-A3 Cradle-to-Mill Gate).
 * Values in metric tons CO2e per metric ton of crude steel product.
 * Source: World Steel Association (worldsteel) 2023 & ISSF Stainless LCI 2023.
 */
export const EMBODIED_CARBON_FACTORS = {
  // Electric Arc Furnace (primarily scrap + electric grid)
  EAF: {
    central: 0.42, // t CO2e / metric ton steel
    min: 0.35,
    max: 0.55,
    source: "World Steel Association (worldsteel) 2023 Sustainability Indicators: EAF Scrap-to-Steel Benchmark",
  },
  // Blast Furnace - Basic Oxygen Furnace (iron ore reduction via coking coal)
  BOF: {
    central: 2.05, // t CO2e / metric ton steel
    min: 1.80,
    max: 2.30,
    source: "World Steel Association (worldsteel) 2023 & IEA Iron and Steel Roadmap: BF-BOF Route Benchmark",
  },
  // Stainless Steel austenitic (300 series with embodied Cr & Ni)
  STAINLESS_AUSTENITIC: {
    central: 2.80,
    min: 2.30,
    max: 3.30,
    source: "International Stainless Steel Forum (ISSF) LCI Study (304 / 316L)",
  },
  // Duplex Stainless Steel (2205)
  STAINLESS_DUPLEX: {
    central: 2.65,
    min: 2.20,
    max: 3.10,
    source: "ISSF / Team Stainless Environmental Profiles: 2205 Duplex Stainless",
  },
  // Ferritic Stainless Steel (400 series, 409)
  STAINLESS_FERRITIC: {
    central: 1.45,
    min: 1.20,
    max: 1.70,
    source: "ISSF LCI Data: 400-Series Ferritic Stainless",
  },
  // Global Industry Average benchmark for comparison
  GLOBAL_INDUSTRY_AVERAGE: 1.89, // worldsteel 2023 global crude steel weighted average
};

/**
 * Upstream Highway Transportation Emission Factor (Module A4).
 * Class 8 Heavy-Duty Diesel Flatbed Tractor-Trailer.
 * Source: US EPA SmartWay Logistics GHG Factors / GLEC Framework v3.0.
 * Central: 161.8 grams CO2e per ton-mile (0.1618 kg CO2e / ton-mile = 0.0001618 t CO2e / ton-mile).
 * Uncertainty: ±10% based on highway grade and backhaul empty ratio.
 */
export const TRANSPORT_EMISSION_FACTOR = {
  kgCO2ePerTonMile: 0.1618,
  uncertaintyPct: 10,
  source: "EPA SmartWay Transportation Partnership & GLEC Framework v3.0 (Class 8 Combination Truck)",
};

/**
 * Calculates cradle-to-jobsite greenhouse gas emissions (Modules A1-A4).
 */
export function calculateEmissions(params: EmissionsCalculationParams): EmissionsBreakdown {
  const {
    quantityTons,
    tonUnit = "us_short_ton",
    millRoute = "EAF",
    materialFamily = "Structural Carbon Steel",
    roadDistanceMiles = 0,
  } = params;

  // Convert quantity to metric tons (1 US short ton = 0.907185 metric tons)
  const metricTons = tonUnit === "us_short_ton" ? quantityTons * 0.907185 : quantityTons;

  // 1. Resolve A1-A3 steelmaking factor based on material family and furnace route
  let factor = EMBODIED_CARBON_FACTORS.EAF;
  const fam = materialFamily.toLowerCase();

  if (fam.includes("austenitic") || fam.includes("316") || fam.includes("304")) {
    factor = EMBODIED_CARBON_FACTORS.STAINLESS_AUSTENITIC;
  } else if (fam.includes("duplex") || fam.includes("2205")) {
    factor = EMBODIED_CARBON_FACTORS.STAINLESS_DUPLEX;
  } else if (fam.includes("ferritic") || fam.includes("409")) {
    factor = EMBODIED_CARBON_FACTORS.STAINLESS_FERRITIC;
  } else if (millRoute === "BOF") {
    factor = EMBODIED_CARBON_FACTORS.BOF;
  }

  // A1-A3 production emissions (metric tons CO2e)
  const productionCentral = metricTons * factor.central;
  const productionMin = metricTons * factor.min;
  const productionMax = metricTons * factor.max;

  // 2. Resolve Module A4 transportation emissions (metric tons CO2e)
  // Distance in miles * quantity in short tons * EPA factor
  const shortTons = tonUnit === "metric_ton" ? quantityTons / 0.907185 : quantityTons;
  const transportKg = roadDistanceMiles * shortTons * TRANSPORT_EMISSION_FACTOR.kgCO2ePerTonMile;
  const transportCentral = transportKg / 1000.0;
  const transportMin = transportCentral * (1 - TRANSPORT_EMISSION_FACTOR.uncertaintyPct / 100);
  const transportMax = transportCentral * (1 + TRANSPORT_EMISSION_FACTOR.uncertaintyPct / 100);

  // Total Modules A1-A4
  const totalCentral = productionCentral + transportCentral;
  const totalMin = productionMin + transportMin;
  const totalMax = productionMax + transportMax;

  // Normalized intensity: metric tons CO2e per metric ton of steel delivered
  const intensity = metricTons > 0 ? totalCentral / metricTons : factor.central;

  // Savings vs global crude steel industry average (1.89 t CO2e / ton)
  const globalAvgEmissions = metricTons * EMBODIED_CARBON_FACTORS.GLOBAL_INDUSTRY_AVERAGE;
  const savings = Math.max(0, globalAvgEmissions - totalCentral);

  // Overall uncertainty percentage
  const uncertaintyPct = totalCentral > 0 ? Math.round(((totalMax - totalMin) / (2 * totalCentral)) * 100) : 15;

  return {
    productionEmissionsMetricTons: Number(productionCentral.toFixed(2)),
    transportEmissionsMetricTons: Number(transportCentral.toFixed(2)),
    totalEmissionsMetricTons: Number(totalCentral.toFixed(2)),
    emissionsIntensity_tCO2ePerTon: Number(intensity.toFixed(2)),
    uncertaintyRange: {
      minTotalMetricTons: Number(totalMin.toFixed(2)),
      maxTotalMetricTons: Number(totalMax.toFixed(2)),
      uncertaintyPct,
    },
    savingsVsGlobalAvgMetricTons: Number(savings.toFixed(2)),
    systemBoundary: "Modules A1-A4 (Cradle-to-Jobsite Gate): Raw Materials Extraction, Steelmaking, and Flatbed Highway Freight",
    dataSources: {
      production: factor.source,
      transport: TRANSPORT_EMISSION_FACTOR.source,
    },
    disclaimer: "Modeled engineering estimate using published international Life Cycle Inventory (LCI) factors. Does not replace mill-specific certified Environmental Product Declarations (EPDs).",
  };
}
