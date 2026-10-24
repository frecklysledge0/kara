import { 
  BuyerSpecification, 
  GradeSuitabilityResult, 
  RankedListingCandidate, 
  ScoreWeightConfig 
} from "@/types/assistant";
import { fetchListings } from "@/lib/supabase/database";
import { calculateDeliveredCost } from "@/lib/engine/freight";
import { ListingWithRelations } from "@/types/database";

// =====================================================================
// MillProof: Inventory Query & Ranking Engine (Step 3 & Step 4)
// Hard eligibility gating -> multi-criteria transparent normalization.
// 40% Material Fit, 30% Data Quality / MTR Completeness, 30% Delivered Cost.
// =====================================================================

const DEFAULT_WEIGHTS: ScoreWeightConfig = {
  fit: 0.40,
  quality: 0.30,
  cost: 0.30,
};

// Map knowledge base grade IDs to potential listing grade names/strings
function matchesGrade(listingGrade: string, gradeResult: GradeSuitabilityResult): boolean {
  const l = listingGrade.toLowerCase();
  const c = gradeResult.canonical_name.toLowerCase();
  const id = gradeResult.grade_id.toLowerCase();

  if (l.includes(c) || c.includes(l)) return true;
  if (id === "astm-a572-50" && (l.includes("a572") || l.includes("50"))) return true;
  if (id === "astm-a36" && l.includes("a36")) return true;
  if (id === "astm-a588" && (l.includes("a588") || l.includes("weathering"))) return true;
  if (id === "aisi-316l" && l.includes("316")) return true;
  if (id === "aisi-304" && l.includes("304")) return true;
  if (id === "duplex-2205" && (l.includes("2205") || l.includes("duplex"))) return true;
  if (id === "aisi-4140" && l.includes("4140")) return true;
  if (id === "sae-1018" && l.includes("1018")) return true;
  if (id === "sae-1045" && l.includes("1045")) return true;
  if (id === "aisi-409" && l.includes("409")) return true;

  return false;
}

export async function queryAndRankInventory(
  spec: BuyerSpecification,
  eligibleGrades: GradeSuitabilityResult[],
  customWeights?: Partial<ScoreWeightConfig>
): Promise<RankedListingCandidate[]> {
  if (eligibleGrades.length === 0) {
    return [];
  }

  // 1. Fetch active listings from Supabase layer
  const { data: allListings } = await fetchListings({ status: "active" });

  if (!allListings || allListings.length === 0) {
    return [];
  }

  // 2. Filter listings strictly matching ELIGIBLE grades (hard suitability constraint)
  const candidateListings: Array<{
    listing: ListingWithRelations;
    matchedGrade: GradeSuitabilityResult;
  }> = [];

  for (const listing of allListings) {
    for (const eg of eligibleGrades) {
      if (matchesGrade(listing.grade, eg)) {
        candidateListings.push({ listing, matchedGrade: eg });
        break;
      }
    }
  }

  if (candidateListings.length === 0) {
    return [];
  }

  // 3. Resolve destination for delivered cost calculations
  const destZip = resolveDestinationZip(spec.buyer_city, spec.state_or_country);
  const destCity = spec.buyer_city || "Chicago";
  const destState = spec.state_or_country || "IL";

  // Configured weights
  const weights: ScoreWeightConfig = {
    fit: customWeights?.fit ?? DEFAULT_WEIGHTS.fit,
    quality: customWeights?.quality ?? DEFAULT_WEIGHTS.quality,
    cost: customWeights?.cost ?? DEFAULT_WEIGHTS.cost,
  };

  // 4. Calculate raw metrics for all candidates
  const evaluatedCandidates = candidateListings.map(({ listing, matchedGrade }) => {
    // A. Material Fit (0.0 to 1.0)
    let materialFit = matchedGrade.suitability_score;

    // Form match adjustment
    if (spec.form) {
      if (listing.form.toLowerCase() === spec.form.toLowerCase()) {
        materialFit = Math.min(1.0, materialFit + 0.05);
      } else {
        materialFit = Math.max(0.20, materialFit * 0.70);
      }
    }

    // Thickness proximity adjustment
    if (spec.thickness_in && listing.thickness_in > 0) {
      const ratio = listing.thickness_in / spec.thickness_in;
      if (ratio >= 0.8 && ratio <= 1.25) {
        materialFit = Math.min(1.0, materialFit + 0.05);
      }
    }

    // B. Documented Listing Completeness / Seller Data Quality (0.0 to 1.0)
    // Never treat a seller's unverified claims as proven trustworthiness.
    let dataQuality = 0.0;
    const cert = listing.certificate;

    if (cert && cert.id) {
      dataQuality += 0.40; // Verified MTR PDF in storage

      const chem = cert.chemistry as Record<string, unknown> | null;
      if (chem && Object.keys(chem).length >= 4) {
        dataQuality += 0.20; // Granular ladle chemistry
      }

      const mech = cert.mechanical as Record<string, unknown> | null;
      if (mech && Object.keys(mech).length >= 2) {
        dataQuality += 0.20; // Physical tension test results
      }

      if (cert.review_status === "approved" || cert.extraction_status === "completed") {
        dataQuality += 0.10; // QC rules executed
      }
    }

    if (listing.seller?.mill_route) {
      dataQuality += 0.10; // Known mill melting route (EAF/BOF)
    }

    dataQuality = Math.min(1.0, Math.max(0.10, Math.round(dataQuality * 100) / 100));

    // C. Delivered Cost Calculation
    const orderQty = spec.quantity_tons ? Math.min(listing.quantity_tons, spec.quantity_tons) : Math.min(listing.quantity_tons, 20.0);
    const weightLbs = orderQty * 2000;
    const pricePerCwt = listing.price_per_ton / 20.0;
    const warehouseLat = listing.seller?.latitude || 41.5934;
    const warehouseLng = listing.seller?.longitude || -87.3464;

    const freightResult = calculateDeliveredCost({
      listingId: listing.id,
      warehouseCity: listing.seller?.city || "Gary",
      warehouseState: listing.seller?.state || "IN",
      warehouseLat,
      warehouseLng,
      destinationZip: destZip,
      weightLbs,
      pricePerCwt,
      widthInches: 96,
      singlePieceWeightLbs: weightLbs,
    });

    const totalDeliveredCost = freightResult.totalDeliveredCost;
    const deliveredCostPerTon = Number((freightResult.deliveredCostPerCwt * 20.0).toFixed(2));

    return {
      listing,
      matchedGrade,
      materialFit,
      dataQuality,
      deliveredCostPerTon,
      totalDeliveredCost,
      freightResult,
    };
  });

  // 5. Cost Score Normalization: lowest delivered cost gets 1.0
  const validDeliveredCosts = evaluatedCandidates
    .map((c) => c.deliveredCostPerTon)
    .filter((c): c is number => typeof c === "number" && c > 0);

  const minDeliveredCost = validDeliveredCosts.length > 0 ? Math.min(...validDeliveredCosts) : null;

  // 6. Handle missing cost or location with dynamic weight renormalization
  const hasValidCost = minDeliveredCost !== null && minDeliveredCost > 0;
  let effectiveWeights: ScoreWeightConfig = { ...weights };

  if (!hasValidCost) {
    // Renormalize fit and quality
    const remainingWeight = weights.fit + weights.quality;
    effectiveWeights = {
      fit: Math.round((weights.fit / remainingWeight) * 100) / 100,
      quality: Math.round((weights.quality / remainingWeight) * 100) / 100,
      cost: 0.0,
    };
  }

  // 7. Combine into final ranked candidates
  const ranked: RankedListingCandidate[] = evaluatedCandidates.map((c) => {
    let costScore = 0.50; // Default fallback if missing

    if (hasValidCost && minDeliveredCost !== null && c.deliveredCostPerTon && c.deliveredCostPerTon > 0) {
      // Relative delivered cost: min / candidate, capped at 1.0
      costScore = Math.min(1.0, Math.max(0.10, minDeliveredCost / c.deliveredCostPerTon));
    }

    const fitScore = Math.min(1.0, Math.max(0.0, c.materialFit));
    const qualScore = Math.min(1.0, Math.max(0.0, c.dataQuality));

    // Weighted composite score (0 to 100)
    const compositeScore =
      effectiveWeights.fit * fitScore +
      effectiveWeights.quality * qualScore +
      effectiveWeights.cost * costScore;

    const totalScore = Math.round(compositeScore * 100);

    const explanationParts: string[] = [
      `Fit ${(fitScore * 100).toFixed(0)}% (wt ${(effectiveWeights.fit * 100).toFixed(0)}%)`,
      `MTR Quality ${(qualScore * 100).toFixed(0)}% (wt ${(effectiveWeights.quality * 100).toFixed(0)}%)`,
    ];
    if (effectiveWeights.cost > 0) {
      explanationParts.push(`Cost Efficiency ${(costScore * 100).toFixed(0)}% (wt ${(effectiveWeights.cost * 100).toFixed(0)}%)`);
    }

    return {
      listing_id: c.listing.id,
      grade_id: c.matchedGrade.grade_id,
      grade_name: c.listing.grade,
      material_family: c.matchedGrade.material_family,
      form: c.listing.form,
      thickness_in: c.listing.thickness_in,
      quantity_tons: c.listing.quantity_tons,
      price_per_ton: c.listing.price_per_ton,
      seller_name: c.listing.seller?.name || "Independent Steel Service Center",
      seller_city: c.listing.seller?.city || "Gary",
      seller_state: c.listing.seller?.state || "IN",
      mill_route: c.listing.seller?.mill_route || null,
      has_certificate: Boolean(c.listing.certificate?.id),
      certificate_id: c.listing.certificate_id,
      heat_number: c.listing.certificate?.heat_number || null,
      is_demo: Boolean(c.listing.seller?.demo_status),
      destination_city: destCity,
      destination_state: destState,
      destination_zip: destZip,
      delivered_cost_per_ton: c.deliveredCostPerTon,
      total_delivered_cost: c.totalDeliveredCost,
      freight_breakdown: c.freightResult
        ? {
            distance_miles: c.freightResult.distanceMiles,
            truckloads: c.freightResult.truckloadsRequired,
            freight_total: c.freightResult.totalFreightCost,
            base_material_total: c.freightResult.baseMaterialCost,
          }
        : null,
      score_material_fit: Math.round(fitScore * 100) / 100,
      score_data_quality: Math.round(qualScore * 100) / 100,
      score_delivered_cost: Math.round(costScore * 100) / 100,
      total_score: totalScore,
      effective_weights: effectiveWeights,
      score_explanation: explanationParts.join(" • "),
    };
  });

  // Sort descending by total score
  ranked.sort((a, b) => b.total_score - a.total_score);

  return ranked;
}

function resolveDestinationZip(city?: string | null, state?: string | null): string {
  if (!city) return "60601"; // Chicago benchmark default
  const c = city.toLowerCase();
  if (c.includes("chicago")) return "60601";
  if (c.includes("detroit")) return "48201";
  if (c.includes("houston")) return "77001";
  if (c.includes("pittsburgh")) return "15201";
  if (c.includes("cleveland")) return "44101";
  if (c.includes("gary")) return "46402";
  if (c.includes("philadelphia")) return "19101";
  if (c.includes("dallas")) return "75201";

  if (state?.toUpperCase() === "IL") return "60601";
  if (state?.toUpperCase() === "MI") return "48201";
  if (state?.toUpperCase() === "TX") return "77001";
  if (state?.toUpperCase() === "PA") return "15201";
  if (state?.toUpperCase() === "OH") return "44101";

  return "60601";
}
