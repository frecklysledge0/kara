import { ChemicalAnalysis } from "@/types/steel";

export interface CEVResult {
  cev: number;
  formula: "IIW" | "Pcm";
  isEstimated: boolean;
  missingElements: string[];
  weldabilityRisk: "LOW" | "MODERATE" | "HIGH" | "CRITICAL";
  preheatRecommendation: string;
  notes: string;
}

export interface PRENResult {
  pren: number;
  isMarineSuitable: boolean;
  notes: string;
}

/**
 * Calculates Carbon Equivalent according to the International Institute of Welding (IIW) standard:
 * CEV = C + (Mn / 6) + ((Cr + Mo + V) / 5) + ((Ni + Cu) / 15)
 */
export function calculateIIWCarbonEquivalent(chem: ChemicalAnalysis): CEVResult {
  const c = chem.C ?? 0;
  const mn = chem.Mn ?? 0;
  const cr = chem.Cr ?? 0;
  const mo = chem.Mo ?? 0;
  const v = chem.V ?? 0;
  const ni = chem.Ni ?? 0;
  const cu = chem.Cu ?? 0;

  const missing: string[] = [];
  if (chem.C === undefined) missing.push("C");
  if (chem.Mn === undefined) missing.push("Mn");
  if (chem.Cr === undefined) missing.push("Cr");
  if (chem.Mo === undefined) missing.push("Mo");
  if (chem.V === undefined) missing.push("V");
  if (chem.Ni === undefined) missing.push("Ni");
  if (chem.Cu === undefined) missing.push("Cu");

  const cevRaw = c + (mn / 6) + ((cr + mo + v) / 5) + ((ni + cu) / 15);
  const cev = Number(cevRaw.toFixed(3));

  let weldabilityRisk: CEVResult["weldabilityRisk"] = "LOW";
  let preheatRecommendation = "";

  if (cev <= 0.40) {
    weldabilityRisk = "LOW";
    preheatRecommendation = "Excellent weldability. Standard preheat not required for plates <= 1.0 inch under AWS D1.1.";
  } else if (cev <= 0.45) {
    weldabilityRisk = "MODERATE";
    preheatRecommendation = "Good weldability. Preheat required (150°F / 65°C) for thicknesses > 0.75 inch or high restraint.";
  } else if (cev <= 0.52) {
    weldabilityRisk = "HIGH";
    preheatRecommendation = "Requires strict hydrogen control, preheat to 250°F - 300°F (120°C - 150°C), and low-hydrogen electrodes.";
  } else {
    weldabilityRisk = "CRITICAL";
    preheatRecommendation = "High risk of delayed cold cracking. Mandatory preheat >= 350°F (175°C) and qualified Welding Procedure Specification (WPS).";
  }

  return {
    cev,
    formula: "IIW",
    isEstimated: missing.length > 0,
    missingElements: missing,
    weldabilityRisk,
    preheatRecommendation,
    notes: missing.length > 0
      ? `CEV calculated with ${missing.join(", ")} assumed as 0.00% (unreported on MTR).`
      : "Full 7-element chemical analysis provided for IIW calculation."
  };
}

/**
 * Calculates Ito-Bessyo Crack Parameter (Pcm) for modern low-carbon HSLA steels (C <= 0.16%):
 * Pcm = C + (Si / 30) + ((Mn + Cu + Cr) / 20) + (Ni / 60) + (Mo / 15) + (V / 10) + (5 * B)
 */
export function calculatePcm(chem: ChemicalAnalysis): number {
  const c = chem.C ?? 0;
  const si = chem.Si ?? 0;
  const mn = chem.Mn ?? 0;
  const cu = chem.Cu ?? 0;
  const cr = chem.Cr ?? 0;
  const ni = chem.Ni ?? 0;
  const mo = chem.Mo ?? 0;
  const v = chem.V ?? 0;
  const b = chem.B ?? 0;

  const pcmRaw = c + (si / 30) + ((mn + cu + cr) / 20) + (ni / 60) + (mo / 15) + (v / 10) + (5 * b);
  return Number(pcmRaw.toFixed(3));
}

/**
 * Calculates Pitting Resistance Equivalent Number (PREN) for stainless steels:
 * PREN = Cr + 3.3 * Mo + 16 * N
 */
export function calculatePREN(chem: ChemicalAnalysis): PRENResult {
  const cr = chem.Cr ?? 0;
  const mo = chem.Mo ?? 0;
  const n = chem.N ?? 0;

  const pren = Number((cr + (3.3 * mo) + (16 * n)).toFixed(1));
  const isMarineSuitable = pren >= 22.0;

  return {
    pren,
    isMarineSuitable,
    notes: isMarineSuitable
      ? `PREN of ${pren} satisfies typical marine and coastal atmospheric chloride exposure standards.`
      : `PREN of ${pren} is lower than 22.0 benchmark; higher pitting susceptibility in saltwater splash zones.`
  };
}
