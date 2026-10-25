import { describe, it, expect } from "vitest";
import { buildNarrationBriefing } from "@/lib/engine/assistant-narrator";
import { AssistantResponse } from "@/types/assistant";
import { POST } from "@/app/api/assistant/narrate/route";
import { NextRequest } from "next/server";

describe("Assistant Voice Narration Module", () => {
  const sampleAssistantData: AssistantResponse = {
    success: true,
    parsed_specification: {
      use_case: "marine coastal offshore platform structure",
      environment: "marine_atmospheric",
      required_properties: ["corrosion_resistance", "high_yield_strength"],
      prohibited_materials_or_constraints: ["uncoated_carbon_steel"],
      quantity_tons: 40,
      form: "Plate",
      thickness_in: 0.5,
      buyer_city: "Chicago",
      state_or_country: "IL",
      budget_per_ton: 1200,
      budget_total: null,
      applicable_standard: "ASTM",
      explicit_requirements: ["40 tons plate", "marine atmospheric"],
      inferred_assumptions: ["Severe coastal salt fog"],
      missing_information: [],
    },
    eligible_grades: [
      {
        grade_id: "A588",
        canonical_name: "ASTM A588 Grade A (Cor-Ten)",
        material_family: "Weathering Structural Steel",
        applicable_standard: "ASTM A588/A588M",
        is_eligible: true,
        suitability_score: 0.94,
        fit_reasons: ["Atmospheric corrosion resistance 4x carbon steel"],
        limitations: ["Unsuitable for submerged seawater"],
        incompatibilities: [],
        unresolved_engineering_requirements: [],
        relative_cost_tier: 2,
      },
    ],
    ineligible_grades: [
      {
        grade_id: "A36",
        canonical_name: "ASTM A36 Carbon Steel",
        material_family: "Structural Carbon Steel",
        applicable_standard: "ASTM A36/A36M",
        is_eligible: false,
        suitability_score: 0.2,
        fit_reasons: [],
        limitations: [],
        incompatibilities: ["Rapid rust oxidation in coastal marine air without zinc coating"],
        unresolved_engineering_requirements: [],
        relative_cost_tier: 1,
      },
    ],
    ranked_listings: [
      {
        listing_id: "lot-marine-plate-01",
        grade_id: "A588",
        grade_name: "ASTM A588 Grade A",
        material_family: "Weathering Structural Steel",
        form: "Plate",
        thickness_in: 0.5,
        quantity_tons: 40,
        price_per_ton: 1050,
        seller_name: "Midwest Steel Distribution",
        seller_city: "Gary",
        seller_state: "IN",
        mill_route: "EAF",
        has_certificate: true,
        certificate_id: "cert-01",
        heat_number: "H-8821",
        is_demo: false,
        destination_city: "Chicago",
        destination_state: "IL",
        destination_zip: "60601",
        delivered_cost_per_ton: 1115,
        total_delivered_cost: 44600,
        freight_breakdown: {
          distance_miles: 45,
          truckloads: 2,
          freight_total: 2600,
          base_material_total: 42000,
        },
        score_material_fit: 0.95,
        score_data_quality: 0.90,
        score_delivered_cost: 0.88,
        total_score: 91,
        effective_weights: { fit: 0.4, quality: 0.3, cost: 0.3 },
        score_explanation: "Top score based on 40t plate availability and close warehouse proximity.",
        explanation: {
          listing_id: "lot-marine-plate-01",
          why_matched: "Exact match for 40 ton weathering plate requirement.",
          key_trade_offs: ["Delivered in 2 standard 45k lb flatbed shipments."],
          price_and_freight_assumptions: ["Includes diesel surcharge"],
          relevant_limitations: ["Unpainted weathering layer requires wetting/drying cycles"],
          unknowns_requiring_confirmation: [],
        },
      },
    ],
    clarification_questions: ["Will the steel be painted or exposed to unpainted weathering?"],
    summary_guidance: "ASTM A588 is selected for adherence to high-yield weathering criteria.",
    notice: "Informational guidance only.",
  };

  it("builds an objective narration briefing reading existing server recommendations verbatim", () => {
    const script = buildNarrationBriefing(sampleAssistantData);

    // Checks that application and grade match server data
    expect(script).toContain("marine coastal offshore platform structure");
    expect(script).toContain("ASTM A588 Grade A (Cor-Ten)");
    expect(script).toContain("Midwest Steel Distribution");
    expect(script).toContain("91 percent");
    expect(script).toContain("Delivered in 2 standard 45k lb flatbed shipments.");
    expect(script).toContain("1 candidate grade was excluded");
    expect(script).toContain("informational procurement guidance only");

    // Strictly no purchasing or checkout actions
    expect(script.toLowerCase()).not.toContain("buying now");
    expect(script.toLowerCase()).not.toContain("purchasing order");
    expect(script.toLowerCase()).not.toContain("credit card");
  });

  it("validates narration request input and rejects empty or invalid payloads", async () => {
    const emptyReq = new NextRequest("http://localhost:3000/api/assistant/narrate", {
      method: "POST",
      body: JSON.stringify({ text: "" }),
    });
    const emptyRes = await POST(emptyReq);
    expect(emptyRes.status).toBe(400);

    const emptyBody = await emptyRes.json();
    expect(emptyBody.success).toBe(false);
    expect(emptyBody.error).toContain("Text is required");
  });

  it("returns transparent configured: false fallback when ELEVENLABS_API_KEY is not set", async () => {
    // Save current key if any
    const originalKey = process.env.ELEVENLABS_API_KEY;
    delete process.env.ELEVENLABS_API_KEY;

    try {
      const validReq = new NextRequest("http://localhost:3000/api/assistant/narrate", {
        method: "POST",
        body: JSON.stringify({
          text: "Procurement briefing testing fallback state.",
        }),
      });

      const res = await POST(validReq);
      expect(res.status).toBe(200);

      const body = await res.json();
      expect(body.success).toBe(false);
      expect(body.configured).toBe(false);
      expect(body.message).toContain("ElevenLabs API key is not configured");
      expect(body.fallbackAvailable).toBe(true);
    } finally {
      if (originalKey) {
        process.env.ELEVENLABS_API_KEY = originalKey;
      }
    }
  });

  it("strictly maintains score and eligibility immutability", () => {
    // Ensure that generating a narration briefing never mutates input data
    const inputCopy = JSON.parse(JSON.stringify(sampleAssistantData));
    const script = buildNarrationBriefing(sampleAssistantData);
    expect(script).toBeTruthy();
    expect(sampleAssistantData).toEqual(inputCopy);
  });
});
