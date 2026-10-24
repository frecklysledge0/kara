import { GoogleGenAI } from "@google/genai";
import { 
  BuyerSpecification, 
  CandidateExplanation, 
  CandidateExplanationSchema, 
  RankedListingCandidate 
} from "@/types/assistant";
import { CURATED_GRADES } from "@/lib/data/grades";
import { z } from "zod";

// =====================================================================
// MillProof: Gemini Result Explainer (Step 5)
// Generates concise, validated explanations for pre-ranked candidates.
// NEVER alters or recalculates scores. Refers strictly to supplied facts.
// =====================================================================

const BatchExplanationSchema = z.array(CandidateExplanationSchema);

export async function explainRankedCandidates(
  spec: BuyerSpecification,
  candidates: RankedListingCandidate[]
): Promise<Map<string, CandidateExplanation>> {
  const explanationMap = new Map<string, CandidateExplanation>();

  if (candidates.length === 0) {
    return explanationMap;
  }

  // Only explain top candidates (max 5) to optimize tokens and response latency
  const topCandidates = candidates.slice(0, 5);

  const apiKey = process.env.GEMINI_API_KEY;

  if (apiKey) {
    try {
      const aiResults = await generateExplanationsWithGemini(spec, topCandidates, apiKey);
      if (aiResults) {
        for (const exp of aiResults) {
          explanationMap.set(exp.listing_id, exp);
        }
      }
    } catch (err) {
      console.warn("Gemini explanation generation failed, falling back to deterministic explanation:", err);
    }
  }

  // Fill in any missing or fallback candidates deterministically
  for (const cand of topCandidates) {
    if (!explanationMap.has(cand.listing_id)) {
      explanationMap.set(cand.listing_id, generateDeterministicExplanation(spec, cand));
    }
  }

  return explanationMap;
}

async function generateExplanationsWithGemini(
  spec: BuyerSpecification,
  candidates: RankedListingCandidate[],
  apiKey: string
): Promise<CandidateExplanation[] | null> {
  const ai = new GoogleGenAI({ apiKey });

  // Curate isolated facts for only the candidate grades
  const candidateGradeFacts = candidates.map((c) => {
    const grade = CURATED_GRADES.find((g) => g.id === c.grade_id);
    return {
      listing_id: c.listing_id,
      grade_name: c.grade_name,
      material_family: c.material_family,
      standard: grade?.applicable_standard || "ASTM Standard",
      description: grade?.description || "",
      corrosion_category: grade?.corrosion_resistance.category,
      weldability_rating: grade?.weldability.rating,
      known_limitations: grade?.limitations_and_guidance.known_limitations || [],
      price_per_ton: c.price_per_ton,
      delivered_cost_per_ton: c.delivered_cost_per_ton,
      total_score: c.total_score,
      fit_score: c.score_material_fit,
      quality_score: c.score_data_quality,
      cost_score: c.score_delivered_cost,
      distance_miles: c.freight_breakdown?.distance_miles,
      seller_location: `${c.seller_city}, ${c.seller_state}`,
      has_mtr: c.has_certificate,
    };
  });

  const systemInstruction = `
You are a metallurgical procurement engineer explaining pre-computed, deterministic steel marketplace rankings.

CRITICAL INSTRUCTIONS:
1. You CANNOT change, recalculate, or alter any numerical scores. The scores were computed by deterministic code.
2. Refer ONLY to the supplied listing IDs and metallurgical facts below.
3. For each listing, generate concise, technical explanations covering:
   - why_matched: 1-2 sentence engineering rationale for why this grade and batch fits the buyer's application.
   - key_trade_offs: array of 2-3 trade-offs (e.g. initial material cost vs corrosion protection, yield strength vs formability).
   - price_and_freight_assumptions: 1-2 bullet points explaining the delivered freight distance and FOB base price.
   - relevant_limitations: 1-2 limitations based directly on the grade standard (e.g., requires paint in marine zone, preheat requirements).
   - unknowns_requiring_confirmation: 1-2 engineering questions the buyer must confirm with their engineer (e.g. plate thickness, Charpy temperature).

Output strictly a JSON array of objects matching the schema:
[
  {
    "listing_id": "exact listing_id string from candidates",
    "why_matched": "concise technical rationale",
    "key_trade_offs": ["tradeoff 1", "tradeoff 2"],
    "price_and_freight_assumptions": ["freight assumption 1"],
    "relevant_limitations": ["limitation 1"],
    "unknowns_requiring_confirmation": ["unknown 1"]
  }
]
`;

  const promptContent = `
Buyer Specification:
${JSON.stringify(spec, null, 2)}

Candidate Batches & Computed Ranking Details:
${JSON.stringify(candidateGradeFacts, null, 2)}
`;

  const candidateModels = ["gemini-3.5-flash", "gemini-3.8-flash", "gemini-flash-latest"];

  for (const model of candidateModels) {
    try {
      const response = await ai.models.generateContent({
        model,
        contents: [{ role: "user", parts: [{ text: promptContent }] }],
        config: {
          systemInstruction,
          responseMimeType: "application/json",
          temperature: 0.2,
        },
      });

      if (response.text) {
        const parsed = JSON.parse(response.text);
        const validated = BatchExplanationSchema.safeParse(parsed);
        if (validated.success) {
          return validated.data;
        }
      }
    } catch (err) {
      console.warn(`Model ${model} failed in explanation generator:`, err);
    }
  }

  return null;
}

/**
 * Deterministic explanation builder used as fallback or verification baseline.
 */
export function generateDeterministicExplanation(
  spec: BuyerSpecification,
  candidate: RankedListingCandidate
): CandidateExplanation {
  const grade = CURATED_GRADES.find((g) => g.id === candidate.grade_id);

  const whyMatched =
    grade
      ? `${grade.canonical_name} (${grade.material_family}) meets the technical requirements for ${spec.use_case}. ${grade.description}`
      : `${candidate.grade_name} is compatible with ${spec.form || "structural"} requirements with an overall score of ${candidate.total_score}/100.`;

  const keyTradeOffs: string[] = [];
  if (candidate.score_material_fit >= 0.85) {
    keyTradeOffs.push(`High material fit (${(candidate.score_material_fit * 100).toFixed(0)}%) aligns directly with application stress and environment.`);
  }
  if (candidate.score_delivered_cost >= 0.85) {
    keyTradeOffs.push(`Competitive delivered landed cost at $${candidate.delivered_cost_per_ton?.toFixed(0) || candidate.price_per_ton.toFixed(0)}/ton.`);
  } else {
    keyTradeOffs.push(`Higher initial alloy cost offset by enhanced durability and reduced maintenance.`);
  }

  const freightAssumptions: string[] = [];
  if (candidate.freight_breakdown && typeof candidate.freight_breakdown.freight_total === "number") {
    freightAssumptions.push(
      `Flatbed highway transport from ${candidate.seller_city}, ${candidate.seller_state} to ${candidate.destination_city}, ${candidate.destination_state} (${candidate.freight_breakdown.distance_miles} miles).`
    );
    freightAssumptions.push(
      `Estimated freight: $${candidate.freight_breakdown.freight_total.toLocaleString()} across ${candidate.freight_breakdown.truckloads} flatbed truckload(s).`
    );
  } else {
    freightAssumptions.push(`Base FOB mill price: $${candidate.price_per_ton.toFixed(0)}/ton. Destination freight to be confirmed upon delivery address verification.`);
  }

  const relevantLimitations: string[] = [];
  if (grade?.limitations_and_guidance.known_limitations.length) {
    relevantLimitations.push(grade.limitations_and_guidance.known_limitations[0]);
  } else {
    relevantLimitations.push(`Material must be fabricated and welded according to applicable ${grade?.applicable_standard || "ASTM"} specifications.`);
  }

  const unknowns: string[] = [];
  if (!spec.thickness_in) {
    unknowns.push("Specific design thickness in inches requires confirmation by project engineer.");
  }
  if (candidate.has_certificate) {
    unknowns.push(`MTR on file (Heat #${candidate.heat_number || "Verified"}). Final weld procedure specification (WPS) must verify chemical carbon equivalent.`);
  } else {
    unknowns.push("Original mill test certificate must be reviewed prior to physical shipment.");
  }

  return {
    listing_id: candidate.listing_id,
    why_matched: whyMatched,
    key_trade_offs: keyTradeOffs,
    price_and_freight_assumptions: freightAssumptions,
    relevant_limitations: relevantLimitations,
    unknowns_requiring_confirmation: unknowns,
  };
}
