// =====================================================================
// MillProof: US Industrial Geographic Coordinates Index
// Supports deterministic freight distance calculations
// =====================================================================

export interface GeoLocation {
  city: string;
  state: string;
  lat: number;
  lng: number;
}

export const US_INDUSTRIAL_HUBS: Record<string, GeoLocation> = {
  // Industrial Steel Hubs
  "46402": { city: "Gary", state: "IN", lat: 41.5934, lng: -87.3464 },
  "77002": { city: "Houston", state: "TX", lat: 29.7604, lng: -95.3698 },
  "15222": { city: "Pittsburgh", state: "PA", lat: 40.4406, lng: -79.9959 },
  "60601": { city: "Chicago", state: "IL", lat: 41.8781, lng: -87.6298 },
  "44114": { city: "Cleveland", state: "OH", lat: 41.4993, lng: -81.6944 },
  "48226": { city: "Detroit", state: "MI", lat: 42.3314, lng: -83.0458 },
  "36602": { city: "Mobile", state: "AL", lat: 30.6954, lng: -88.0399 },
  "35203": { city: "Birmingham", state: "AL", lat: 33.5186, lng: -86.8104 },
  "75201": { city: "Dallas", state: "TX", lat: 32.7767, lng: -96.7970 },
  "30303": { city: "Atlanta", state: "GA", lat: 33.7490, lng: -84.3880 },
  "19107": { city: "Philadelphia", state: "PA", lat: 39.9526, lng: -75.1652 },
  "28202": { city: "Charlotte", state: "NC", lat: 35.2271, lng: -80.8431 },
  "90012": { city: "Los Angeles", state: "CA", lat: 34.0522, lng: -118.2437 },
  "98104": { city: "Seattle", state: "WA", lat: 47.6062, lng: -122.3321 },
  "63101": { city: "St. Louis", state: "MO", lat: 38.6270, lng: -90.1994 },
  "80202": { city: "Denver", state: "CO", lat: 39.7392, lng: -104.9903 },
  "55401": { city: "Minneapolis", state: "MN", lat: 44.9778, lng: -93.2650 }
};

/**
 * Resolves a 5-digit US ZIP code to latitude/longitude coordinates.
 * Falls back to matching 3-digit SCF postal code or default central US coordinate.
 */
export function resolveCoordinates(zipCode: string): GeoLocation {
  const cleanZip = zipCode.trim().slice(0, 5);
  if (US_INDUSTRIAL_HUBS[cleanZip]) {
    return US_INDUSTRIAL_HUBS[cleanZip];
  }

  // Fallback prefix grouping for US zones
  const prefix = cleanZip.slice(0, 3);
  const match = Object.entries(US_INDUSTRIAL_HUBS).find(([zip]) => zip.startsWith(prefix));
  if (match) {
    return match[1];
  }

  // General default (Midwest US manufacturing belt center)
  return {
    city: "Regional Distribution Center",
    state: "US",
    lat: 39.8283,
    lng: -98.5795
  };
}
