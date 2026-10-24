import { DeliveredCostBreakdown } from "@/types/steel";
import { resolveCoordinates } from "../data/zip-coords";

export interface FreightOptions {
  listingId: string;
  warehouseCity: string;
  warehouseState: string;
  warehouseLat: number;
  warehouseLng: number;
  destinationZip: string;
  weightLbs: number;
  pricePerCwt: number;
  widthInches?: number;
  singlePieceWeightLbs?: number;
}

const EARTH_RADIUS_MILES = 3958.8;
const MAX_LEGAL_FLATBED_PAYLOAD_LBS = 45000; // 45,000 lbs legal payload per 48'/53' standard flatbed trailer
const FUEL_SURCHARGE_RATE = 0.185; // 18.5% national diesel benchmark
const MINIMUM_TRUCKLOAD_DROP_CHARGE = 350.0; // Baseline dispatch charge

/**
 * Calculates great-circle distance between two coordinates in miles using the Haversine formula.
 */
export function calculateHaversineDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const toRad = (angle: number) => (angle * Math.PI) / 180;

  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const rawMiles = EARTH_RADIUS_MILES * c;

  // Commercial road routing factor: highways are typically ~15% longer than straight great-circle paths
  const roadMileage = Math.max(15, Math.round(rawMiles * 1.15));
  return roadMileage;
}

/**
 * Determines per-mile flatbed freight rate based on trip distance bands.
 */
export function getPerMileFreightRate(distanceMiles: number): number {
  if (distanceMiles <= 150) {
    return 4.50; // Short-haul local flatbed
  } else if (distanceMiles <= 500) {
    return 3.85; // Regional flatbed
  } else {
    return 3.25; // Long-haul interstate flatbed
  }
}

/**
 * Computes deterministic delivered freight and total landed cost.
 */
export function calculateDeliveredCost(options: FreightOptions): DeliveredCostBreakdown {
  const {
    listingId,
    warehouseLat,
    warehouseLng,
    destinationZip,
    weightLbs,
    pricePerCwt,
    widthInches = 96,
    singlePieceWeightLbs = 0
  } = options;

  const destination = resolveCoordinates(destinationZip);
  const distanceMiles = calculateHaversineDistance(
    warehouseLat,
    warehouseLng,
    destination.lat,
    destination.lng
  );

  // Payload logistics constraints
  const truckloadsRequired = Math.max(1, Math.ceil(weightLbs / MAX_LEGAL_FLATBED_PAYLOAD_LBS));
  const totalTons = Number((weightLbs / 2000.0).toFixed(2));

  // Base material price
  const baseMaterialCost = Number(((weightLbs / 100.0) * pricePerCwt).toFixed(2));

  // Base mileage freight calculation per truckload
  const ratePerMile = getPerMileFreightRate(distanceMiles);
  const rawMileageCost = distanceMiles * ratePerMile;
  const singleTruckBaseFreight = Math.max(MINIMUM_TRUCKLOAD_DROP_CHARGE, rawMileageCost);

  // Dimensional extras
  let oversizeFeePerTruck = 0;
  const assumptions: string[] = [
    `FOB origin: ${options.warehouseCity}, ${options.warehouseState} to destination ZIP ${destinationZip} (${destination.city}, ${destination.state}).`,
    `Calculated highway distance: ${distanceMiles} route miles (includes 1.15x road routing factor over great circle).`,
    `Standard legal flatbed payload limit of 45,000 lbs applied: requires ${truckloadsRequired} truckload(s) for ${weightLbs.toLocaleString()} lbs (${totalTons} tons).`
  ];

  if (widthInches > 102) {
    // Width > 8.5 feet requires state wide-load transport permits
    oversizeFeePerTruck = 350.0;
    assumptions.push(`Oversize load surcharge applied: width (${widthInches} in) exceeds 102-inch standard trailer envelope.`);
  }

  if (singlePieceWeightLbs > 15000) {
    assumptions.push(`Heavy lift notice: individual piece weight (${singlePieceWeightLbs.toLocaleString()} lbs) requires certified rigging crane at receiving site.`);
  }

  const baseFreightSubtotal = singleTruckBaseFreight * truckloadsRequired;
  const permitsSubtotal = oversizeFeePerTruck * truckloadsRequired;
  const fuelSurcharge = Number(((baseFreightSubtotal + permitsSubtotal) * FUEL_SURCHARGE_RATE).toFixed(2));
  const totalFreightCost = Number((baseFreightSubtotal + permitsSubtotal + fuelSurcharge).toFixed(2));

  const totalDeliveredCost = Number((baseMaterialCost + totalFreightCost).toFixed(2));
  const deliveredCostPerCwt = Number((totalDeliveredCost / (weightLbs / 100.0)).toFixed(2));

  assumptions.push(`Fuel surcharge of ${(FUEL_SURCHARGE_RATE * 100).toFixed(1)}% applied based on national diesel benchmark index.`);
  assumptions.push("Freight rates assume standard 2-hour free unloading window; detention rates not included.");

  return {
    listingId,
    destinationZip,
    distanceMiles,
    weightLbs,
    totalTons,
    baseMaterialCost,
    truckloadsRequired,
    baseFreightRate: baseFreightSubtotal,
    fuelSurcharge,
    totalFreightCost,
    totalDeliveredCost,
    deliveredCostPerCwt,
    assumptions
  };
}
