import { NextRequest, NextResponse } from "next/server";
import { parseBuyerRequirements } from "@/lib/engine/requirements-parser";
import { matchGradesToSpecification } from "@/lib/engine/grade-matcher";
import { queryAndRankInventory } from "@/lib/engine/assistant-ranker";
import { explainRankedCandidates } from "@/lib/engine/assistant-explainer";
import { 
  AssistantResponse, 
  BuyerSpecification, 
  BuyerSpecificationSchema 
} from "@/types/assistant";

export const maxDuration = 45;

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { prompt, specification, weights } = body;

    let parsedSpec: BuyerSpecification;

    // Mode A: User supplied an already refined/edited specification
    if (specification && typeof specification === "object") {
      const specValidation = BuyerSpecificationSchema.safeParse(specification);
      if (!specValidation.success) {
        return NextResponse.json(
          {
            success: false,
            error: `Invalid specification: ${specValidation.error.issues.map((i) => i.message).join("; ")}`,
          },
          { status: 400 }
        );
      }
      parsedSpec = specValidation.data;
    }
    // Mode B: User entered a natural language prompt
    else if (prompt && typeof prompt === "string" && prompt.trim().length > 0) {
      parsedSpec = await parseBuyerRequirements(prompt, req.signal);
    } else {
      return NextResponse.json(
        {
          success: false,
          error: "Either a non-empty 'prompt' or a validated 'specification' object is required.",
        },
        { status: 400 }
      );
    }

    // Step 2: Deterministic Grade Matching against Curated Knowledge Base
    const matchOutcome = matchGradesToSpecification(parsedSpec);

    // Step 3 & 4: Inventory Query & Multi-Attribute Ranking
    let inventoryWarning: string | undefined;
    // Supplier outages must not discard a buyer's deterministic grade guidance.
    const rankedListings = await queryAndRankInventory(parsedSpec, matchOutcome.eligible_grades, weights).catch(() => {
      inventoryWarning = "Supplier inventory is temporarily unavailable. Your grade guidance is ready; retry the supplier search to check availability.";
      return [];
    });

    // Step 5: Gemini Result Explanations (concise rationale, trade-offs, assumptions)
    const explanationsMap = await explainRankedCandidates(parsedSpec, rankedListings, req.signal);

    // Merge explanations into ranked listings
    const rankedWithExplanations = rankedListings.map((candidate) => ({
      ...candidate,
      explanation: explanationsMap.get(candidate.listing_id),
    }));

    const response: AssistantResponse = {
      success: true,
      parsed_specification: parsedSpec,
      eligible_grades: matchOutcome.eligible_grades,
      ineligible_grades: matchOutcome.ineligible_grades,
      ranked_listings: rankedWithExplanations,
      clarification_questions: matchOutcome.clarification_questions,
      summary_guidance: matchOutcome.summary_guidance,
      notice: "Informational guidance only. Not intended as engineering certification or WPS qualification.",
      ...(inventoryWarning ? { inventory_warning: inventoryWarning } : {}),
    };

    return NextResponse.json(response);
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : "Unknown error in sourcing assistant pipeline";
    console.error("API /api/assistant error:", err);
    return NextResponse.json(
      {
        success: false,
        error: errorMsg,
      },
      { status: 500 }
    );
  }
}
