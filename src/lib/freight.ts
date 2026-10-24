// =====================================================================
// MillProof: Pure, Typed Logistics & Freight Estimation Module
// =====================================================================
// All formulas and constants represent transparent, configurable engineering
// heuristics and demo assumptions until live carrier telemetry is integrated.
// =====================================================================

import { resolveCoordinates } from "@/lib/data/zip-coords";

/**
 * Standard unit definitions for physical steel tonnage.
 * - us_short_ton: 2,000 lbs (907.18474 kg) - US industrial standard
 * - metric_ton: 1,000 kg (~2,204.62262 lbs) - International ISO standard
 */
export type TonUnit = "us_short_ton" | "metric_ton";

export const LBS_PER_SHORT_TON = 2000.0;
export const KG_PER_SHORT_TON = 907.18474;
export const KG_PER_METRIC_TON = 1000.0;
export const LBS_PER_METRIC_TON = 2204.62262;

/**
 * Mean Earth radius in statute miles for Haversine calculations (WGS84 spherical approximation).
 */
export const EARTH_RADIUS_MILES = 3958.7613;

/**
 * Default transport heuristics for US domestic commercial flatbed logistics.
 */
export const DEFAULT_ROAD_DISTANCE_MULTIPLIER = 1.15; // 15% circuity over great-circle path
export const DEFAULT_MAX_LEGAL_FLATBED_PAYLOAD_LBS = 45000; // 45,000 lbs legal trailer payload
export const DEFAULT_FUEL_SURCHARGE_RATE = 0.185; // 18.5% national diesel benchmark
export const DEFAULT_MINIMUM_DROP_CHARGE = 350.0; // Minimum dispatch charge per truckload
export const DEFAULT_LOADING_BUSINESS_DAYS = 1; // Staging, banding, and rigging window
export const DEFAULT_DRIVING_MILES_PER_DAY = 500; // Federal Motor Carrier Safety Admin (FMCSA) 11h driving limit

/**
 * Geographic coordinates representation.
 */
export interface Coordinates {
  lat: number;
  lng: number;
  city?: string;
  state?: string;
  zip?: string;
}

/**
 * Configurable freight and logistics assumptions.
 */
export interface FreightCalculationConfig {
  /** Road-distance multiplier over straight-line Haversine (e.g., 1.15) */
  roadDistanceMultiplier?: number;
  /** Maximum legal truckload payload in lbs (default: 45,000 lbs) */
  truckCapacityWeightLbs?: number;
  /** Explicit per-mile freight rate. If omitted, tiered rates apply. */
  costPerMile?: number;
  /** Diesel fuel surcharge percentage (e.g., 0.185 for 18.5%) */
  fuelSurchargeRate?: number;
  /** Minimum dispatch charge per truck */
  minimumDropCharge?: number;
  /** Warehouse staging and loading days (default: 1) */
  loadingBusinessDays?: number;
  /** Average highway miles per driving day (default: 500) */
  drivingMilesPerDay?: number;
  /** Truckload allocation model: dedicated full trailer or prorated partial */
  partialTruckloadModel?: "full_truckload" | "prorated_partial";
}

/**
 * Inputs for the pure logistics calculation.
 */
export interface FreightCalculationInput {
  /** Origin/seller warehouse coordinates */
  sellerLocation?: Coordinates | null;
  /** Destination/buyer location: coordinates object or 5-digit ZIP code string */
  buyerLocation?: Coordinates | string | null;
  /** Order quantity in the specified ton unit */
  quantity: number;
  /** Explicit ton unit */
  unit: TonUnit;
  /** Base FOB price per ton in the specified unit */
  pricePerTon: number;
  /** Currency code (default: USD) */
  currency?: string;
  /** Optional custom freight parameters */
  config?: FreightCalculationConfig;
}

/**
 * Detailed output from the pure logistics calculation.
 */
export interface FreightCalculationResult {
  success: boolean;
  error?: string;

  // Geographic & Distance
  sellerLocation?: Coordinates;
  buyerLocation?: Coordinates;
  straightLineDistanceMiles: number;
  estimatedRoadDistanceMiles: number;
  distanceApproximationNotice: string;

  // Material & Weight Breakdown
  unit: TonUnit;
  quantity: number;
  totalWeightLbs: number;
  totalWeightKg: number;
  pricePerTon: number;
  currency: string;
  materialSubtotal: number;

  // Freight & Truckload Logistics
  truckloadsRequired: number;
  truckCapacityLbs: number;
  isPartialTruckload: boolean;
  payloadUtilizationPct: number;
  baseMileageRate: number;
  baseFreightCost: number;
  fuelSurcharge: number;
  estimatedShipmentFreight: number;
  freightPerTon: number;

  // Landed Commercial Totals
  estimatedDeliveredTotal: number;
  estimatedDeliveredPricePerTon: number;

  // Lead Time Heuristic
  approximateLeadTimeDaysMin: number;
  approximateLeadTimeDaysMax: number;
  approximateLeadTimeText: string;
  leadTimeDisclaimer: string;

  // Assumptions & Transparency Disclosures
  assumptions: string[];
  isDemoAssumption: boolean;
}

/**
 * Validates coordinate numbers for finite ranges:
 * - Latitude: [-90, 90]
 * - Longitude: [-180, 180]
 * - Rejects (0, 0) as an uninitialized placeholder coordinate.
 */
export function isValidCoordinates(coords?: Coordinates | null): boolean {
  if (!coords) return false;
  const { lat, lng } = coords;

  if (typeof lat !== "number" || typeof lng !== "number") return false;
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return false;
  if (lat < -90 || lat > 90) return false;
  if (lng < -180 || lng > 180) return false;

  // Disallow (0, 0) Null Island placeholder coordinates
  if (Math.abs(lat) < 0.0001 && Math.abs(lng) < 0.0001) {
    return false;
  }

  return true;
}

/**
 * Converts a given quantity from the specified ton unit into total pounds (lbs).
 */
export function convertTonsToLbs(quantity: number, unit: TonUnit): number {
  if (!Number.isFinite(quantity) || quantity < 0) return 0;
  if (unit === "metric_ton") {
    return Number((quantity * LBS_PER_METRIC_TON).toFixed(2));
  }
  return Number((quantity * LBS_PER_SHORT_TON).toFixed(2));
}

/**
 * Converts a given quantity from the specified ton unit into total kilograms (kg).
 */
export function convertTonsToKg(quantity: number, unit: TonUnit): number {
  if (!Number.isFinite(quantity) || quantity < 0) return 0;
  if (unit === "metric_ton") {
    return Number((quantity * KG_PER_METRIC_TON).toFixed(2));
  }
  return Number((quantity * KG_PER_SHORT_TON).toFixed(2));
}

/**
 * Calculates straight-line distance in statute miles using the Haversine formula.
 * Returns 0 if coordinates are identical.
 * Returns NaN if coordinates are invalid.
 */
export function calculateHaversineDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  if (
    !Number.isFinite(lat1) ||
    !Number.isFinite(lon1) ||
    !Number.isFinite(lat2) ||
    !Number.isFinite(lon2)
  ) {
    return NaN;
  }

  if (lat1 === lat2 && lon1 === lon2) {
    return 0;
  }

  const toRad = (deg: number) => (deg * Math.PI) / 180.0;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) *
      Math.cos(toRad(lat2)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);

  const clampedA = Math.min(1, Math.max(0, a));
  const c = 2 * Math.atan2(Math.sqrt(clampedA), Math.sqrt(1 - clampedA));

  return Number((EARTH_RADIUS_MILES * c).toFixed(1));
}

/**
 * Applies a road-distance multiplier (e.g., 1.15) to straight-line distance.
 * Returns 0 if straight-line distance is 0.
 * Enforces a minimum realistic local dispatch distance of 15 miles when locations differ.
 */
export function estimateRoadDistance(
  straightLineMiles: number,
  multiplier: number = DEFAULT_ROAD_DISTANCE_MULTIPLIER
): number {
  if (!Number.isFinite(straightLineMiles) || straightLineMiles < 0) return 0;
  if (straightLineMiles === 0) return 0;

  const validMultiplier = Number.isFinite(multiplier) && multiplier >= 1.0 ? multiplier : DEFAULT_ROAD_DISTANCE_MULTIPLIER;
  const roadMiles = straightLineMiles * validMultiplier;
  return Math.max(15, Math.round(roadMiles));
}

/**
 * Returns benchmark flatbed freight rate per mile based on trip distance bands.
 */
export function getDefaultPerMileRate(distanceMiles: number): number {
  if (distanceMiles <= 150) {
    return 4.50; // Short-haul local flatbed
  } else if (distanceMiles <= 500) {
    return 3.85; // Regional corridor flatbed
  } else {
    return 3.25; // Long-haul interstate flatbed
  }
}

/**
 * Heuristic lead time calculation based on road distance and warehouse staging windows.
 */
export function estimateLeadTime(
  roadMiles: number,
  loadingDays: number = DEFAULT_LOADING_BUSINESS_DAYS,
  milesPerDay: number = DEFAULT_DRIVING_MILES_PER_DAY
): {
  minDays: number;
  maxDays: number;
  text: string;
  disclaimer: string;
} {
  const disclaimer =
    "Heuristic estimate based on standard 500 mi/day DOT transit limits and mill dispatch staging. Not a carrier-confirmed or guaranteed delivery date.";

  if (roadMiles === 0) {
    return {
      minDays: 0,
      maxDays: 1,
      text: "Same-day or next-day on-site pickup",
      disclaimer,
    };
  }

  const transitDays = Math.max(1, Math.ceil(roadMiles / milesPerDay));
  const minDays = loadingDays + transitDays;
  const maxDays = minDays + (roadMiles > 500 ? 2 : 1);

  return {
    minDays,
    maxDays,
    text: `${minDays}–${maxDays} business days`,
    disclaimer,
  };
}

/**
 * Resolves destination input (either Coordinates object or ZIP string) into validated Coordinates.
 */
export function resolveBuyerCoordinates(
  buyerLocation?: Coordinates | string | null
): Coordinates | null {
  if (!buyerLocation) return null;

  if (typeof buyerLocation === "string") {
    const clean = buyerLocation.trim();
    if (!clean) return null;
    const geo = resolveCoordinates(clean);
    return {
      lat: geo.lat,
      lng: geo.lng,
      city: geo.city,
      state: geo.state,
      zip: clean.length === 5 ? clean : undefined,
    };
  }

  if (isValidCoordinates(buyerLocation)) {
    return buyerLocation;
  }

  return null;
}

/**
 * Pure, transparent freight and delivered cost calculator.
 * All units, conversions, and assumptions are fully exposed in the return payload.
 */
export function estimateFreight(
  input: FreightCalculationInput
): FreightCalculationResult {
  const {
    sellerLocation,
    buyerLocation,
    quantity,
    unit = "us_short_ton",
    pricePerTon,
    currency = "USD",
    config = {},
  } = input;

  // 1. Resolve configuration with defaults
  const roadMultiplier = config.roadDistanceMultiplier ?? DEFAULT_ROAD_DISTANCE_MULTIPLIER;
  const truckCapacityLbs = config.truckCapacityWeightLbs ?? DEFAULT_MAX_LEGAL_FLATBED_PAYLOAD_LBS;
  const fuelRate = config.fuelSurchargeRate ?? DEFAULT_FUEL_SURCHARGE_RATE;
  const minDropCharge = config.minimumDropCharge ?? DEFAULT_MINIMUM_DROP_CHARGE;
  const loadingDays = config.loadingBusinessDays ?? DEFAULT_LOADING_BUSINESS_DAYS;
  const milesPerDay = config.drivingMilesPerDay ?? DEFAULT_DRIVING_MILES_PER_DAY;
  const partialModel = config.partialTruckloadModel ?? "full_truckload";

  // 2. Validate basic numerical quantities
  const safeQuantity = Number.isFinite(quantity) && quantity > 0 ? quantity : 0;
  const safePricePerTon = Number.isFinite(pricePerTon) && pricePerTon >= 0 ? pricePerTon : 0;
  const materialSubtotal = Number((safeQuantity * safePricePerTon).toFixed(2));

  const totalWeightLbs = convertTonsToLbs(safeQuantity, unit);
  const totalWeightKg = convertTonsToKg(safeQuantity, unit);

  // 3. Validate geographic inputs
  const resolvedSeller = isValidCoordinates(sellerLocation) ? sellerLocation! : null;
  const resolvedBuyer = resolveBuyerCoordinates(buyerLocation);

  const assumptions: string[] = [];
  const distanceApproximationNotice =
    "Geographic approximation: straight-line distance with a 1.15x commercial road circuity factor. Not an actual highway route or turn-by-turn navigation.";

  if (!resolvedSeller || !resolvedBuyer) {
    const missingWhat = !resolvedSeller && !resolvedBuyer
      ? "Origin (seller) and destination (buyer) locations"
      : !resolvedSeller
      ? "Origin (seller) location"
      : "Destination (buyer) location";

    assumptions.push(`[LOGISTICS NOTICE] ${missingWhat} missing or invalid. Freight could not be estimated.`);
    assumptions.push("[DEMO ASSUMPTION] Standard flatbed freight calculations require valid geographic coordinates.");

    return {
      success: false,
      error: `Missing or invalid location data: ${missingWhat}`,
      sellerLocation: resolvedSeller || undefined,
      buyerLocation: resolvedBuyer || undefined,
      straightLineDistanceMiles: 0,
      estimatedRoadDistanceMiles: 0,
      distanceApproximationNotice,
      unit,
      quantity: safeQuantity,
      totalWeightLbs,
      totalWeightKg,
      pricePerTon: safePricePerTon,
      currency,
      materialSubtotal,
      truckloadsRequired: safeQuantity > 0 ? Math.max(1, Math.ceil(totalWeightLbs / truckCapacityLbs)) : 0,
      truckCapacityLbs,
      isPartialTruckload: false,
      payloadUtilizationPct: 0,
      baseMileageRate: 0,
      baseFreightCost: 0,
      fuelSurcharge: 0,
      estimatedShipmentFreight: 0,
      freightPerTon: 0,
      estimatedDeliveredTotal: materialSubtotal,
      estimatedDeliveredPricePerTon: safeQuantity > 0 ? safePricePerTon : 0,
      approximateLeadTimeDaysMin: 0,
      approximateLeadTimeDaysMax: 0,
      approximateLeadTimeText: "Location pending",
      leadTimeDisclaimer: "Estimated lead time unavailable without delivery location.",
      assumptions,
      isDemoAssumption: true,
    };
  }

  // 4. Distance Calculation
  const straightLineDistance = calculateHaversineDistance(
    resolvedSeller.lat,
    resolvedSeller.lng,
    resolvedBuyer.lat,
    resolvedBuyer.lng
  );

  const estimatedRoadDistance = estimateRoadDistance(straightLineDistance, roadMultiplier);

  // 5. Truckload & Capacity Logistics
  const isIdenticalLocation = straightLineDistance === 0;
  const rawTruckloads = totalWeightLbs / truckCapacityLbs;
  const truckloadsRequired = safeQuantity === 0 ? 0 : Math.max(1, Math.ceil(rawTruckloads));
  const isPartialTruckload = rawTruckloads < 1.0 || (truckloadsRequired > 1 && rawTruckloads % 1 !== 0);
  const totalCapacityAllocated = truckloadsRequired * truckCapacityLbs;
  const payloadUtilizationPct = totalCapacityAllocated > 0
    ? Number(((totalWeightLbs / totalCapacityAllocated) * 100).toFixed(1))
    : 0;

  // 6. Mileage Freight & Rates
  const baseMileageRate = config.costPerMile ?? getDefaultPerMileRate(estimatedRoadDistance);

  let singleTruckBaseMileageCost = 0;
  if (isIdenticalLocation) {
    singleTruckBaseMileageCost = minDropCharge / 2.0; // Local yard transfer
  } else {
    singleTruckBaseMileageCost = Math.max(minDropCharge, estimatedRoadDistance * baseMileageRate);
  }

  let baseFreightCost = 0;
  if (partialModel === "prorated_partial" && rawTruckloads < 1.0) {
    // Shared trailer LTL model
    baseFreightCost = singleTruckBaseMileageCost * Math.max(0.35, rawTruckloads);
  } else {
    // Dedicated full truckload dispatch (standard flatbed steel logistics)
    baseFreightCost = singleTruckBaseMileageCost * truckloadsRequired;
  }
  baseFreightCost = Number(baseFreightCost.toFixed(2));

  const fuelSurcharge = Number((baseFreightCost * fuelRate).toFixed(2));
  const estimatedShipmentFreight = Number((baseFreightCost + fuelSurcharge).toFixed(2));
  const freightPerTon = safeQuantity > 0
    ? Number((estimatedShipmentFreight / safeQuantity).toFixed(2))
    : 0;

  // 7. Delivered Landed Totals
  const estimatedDeliveredTotal = Number((materialSubtotal + estimatedShipmentFreight).toFixed(2));
  const estimatedDeliveredPricePerTon = safeQuantity > 0
    ? Number((estimatedDeliveredTotal / safeQuantity).toFixed(2))
    : 0;

  // 8. Lead Time Heuristic
  const leadTime = estimateLeadTime(estimatedRoadDistance, loadingDays, milesPerDay);

  // 9. Transparent Documented Assumptions
  const originLabel = resolvedSeller.city && resolvedSeller.state
    ? `${resolvedSeller.city}, ${resolvedSeller.state}`
    : `(${resolvedSeller.lat.toFixed(4)}, ${resolvedSeller.lng.toFixed(4)})`;

  const destLabel = resolvedBuyer.city && resolvedBuyer.state
    ? `${resolvedBuyer.city}, ${resolvedBuyer.state}`
    : resolvedBuyer.zip
    ? `ZIP ${resolvedBuyer.zip}`
    : `(${resolvedBuyer.lat.toFixed(4)}, ${resolvedBuyer.lng.toFixed(4)})`;

  assumptions.push(`[DEMO ASSUMPTION] Route: FOB origin ${originLabel} to destination ${destLabel}.`);
  assumptions.push(
    `[DEMO ASSUMPTION] ${distanceApproximationNotice} (${straightLineDistance} straight-line miles -> ${estimatedRoadDistance} estimated route miles).`
  );

  const unitLabel = unit === "metric_ton" ? "metric tonnes" : "US short tons";
  assumptions.push(
    `[DEMO ASSUMPTION] Payload: ${safeQuantity.toFixed(2)} ${unitLabel} (${totalWeightLbs.toLocaleString()} lbs / ${totalWeightKg.toLocaleString()} kg).`
  );

  assumptions.push(
    `[DEMO ASSUMPTION] Standard 48'/53' flatbed trailer capacity of ${truckCapacityLbs.toLocaleString()} lbs applied: requires ${truckloadsRequired} truckload(s) (${payloadUtilizationPct}% trailer utilization).`
  );

  assumptions.push(
    `[DEMO ASSUMPTION] Flatbed mileage rate: $${baseMileageRate.toFixed(2)}/mile with ${(fuelRate * 100).toFixed(1)}% diesel fuel surcharge ($${fuelSurcharge.toFixed(2)}).`
  );

  assumptions.push(
    `[DEMO ASSUMPTION] Lead time estimate: ${leadTime.text}. ${leadTime.disclaimer}`
  );

  return {
    success: true,
    sellerLocation: resolvedSeller,
    buyerLocation: resolvedBuyer,
    straightLineDistanceMiles: straightLineDistance,
    estimatedRoadDistanceMiles: estimatedRoadDistance,
    distanceApproximationNotice,
    unit,
    quantity: safeQuantity,
    totalWeightLbs,
    totalWeightKg,
    pricePerTon: safePricePerTon,
    currency,
    materialSubtotal,
    truckloadsRequired,
    truckCapacityLbs,
    isPartialTruckload,
    payloadUtilizationPct,
    baseMileageRate,
    baseFreightCost,
    fuelSurcharge,
    estimatedShipmentFreight,
    freightPerTon,
    estimatedDeliveredTotal,
    estimatedDeliveredPricePerTon,
    approximateLeadTimeDaysMin: leadTime.minDays,
    approximateLeadTimeDaysMax: leadTime.maxDays,
    approximateLeadTimeText: leadTime.text,
    leadTimeDisclaimer: leadTime.disclaimer,
    assumptions,
    isDemoAssumption: true,
  };
}
