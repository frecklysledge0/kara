import { NextRequest, NextResponse } from "next/server";
import { GoogleGenAI } from "@google/genai";
import { TranslatedRequirement } from "@/types/steel";
import { ALL_GRADE_STANDARDS } from "@/lib/data/standards";

export const maxDuration = 30;

export async function POST(req: NextRequest) {
  try {
    const apiKey = process.env.GEMINI_API_KEY;
    const body = await req.json();
    const { prompt } = body;

    if (!prompt || typeof prompt !== "string" || prompt.trim().length === 0) {
      return NextResponse.json(
        { error: "A non-empty requirement description is required." },
        { status: 400 }
      );
    }

    if (!apiKey) {
      return NextResponse.json(
        {
          error: "GEMINI_API_KEY is not configured on the server. Please verify your environment variables.",
          code: "MISSING_GEMINI_API_KEY"
        },
        { status: 500 }
      );
    }

    const ai = new GoogleGenAI({ apiKey });

    // Standards library reference for the prompt context
    const standardsContext = ALL_GRADE_STANDARDS.map(
      (g) => `${g.id} (${g.grade_name}): category=${g.category}, minYield=${g.mech_limits.yield_min_ksi ?? "none"} ksi, maxCEV=${g.max_cev ?? "none"}, applications=${g.typical_applications.join("; ")}`
    ).join("\n");

    const systemInstruction = `
You are a senior metallurgical engineering consultant for industrial steel procurement.
Given a customer's engineering requirements, map their application to the most appropriate steel grades from the following standards catalog:
${standardsContext}

Output strictly structured JSON adhering to this schema:
{
  "suggestedGrades": [
    {
      "gradeId": "exact id from catalog (e.g. astm-a572-50, astm-a514, astm-a516-70, aisi-316l, astm-a36)",
      "gradeName": "standard grade name",
      "matchReason": "clear technical metallurgical justification",
      "suitabilityScore": number between 0 and 100,
      "considerations": ["technical fabrication, preheat, or welding considerations"]
    }
  ],
  "keyMechanicalCriteria": {
    "minYieldKsi": number,
    "minTensileKsi": number,
    "charpyImpactRequired": boolean,
    "charpyTempF": number (optional, e.g. -20 or -50 if low temp)
  },
  "keyChemicalCriteria": {
    "maxCev": number,
    "weldabilityRequirement": "string describing preheat or welding constraints"
  },
  "recommendedProductForms": ["Plate", "Hot Rolled Coil", "Wide Flange Beam", etc.],
  "assumptionsMade": ["clear list of engineering assumptions made regarding design codes, temperatures, and structural loadings"]
}
`;

    // Resilient model cascade: try fast reliable flash model, fallback to 3.8 and latest
    const candidateModels = ["gemini-3.5-flash", "gemini-3.8-flash", "gemini-flash-latest"];
    let responseText: string | null = null;
    let modelUsed = candidateModels[0];

    for (const model of candidateModels) {
      try {
        const response = await ai.models.generateContent({
          model,
          contents: [
            {
              role: "user",
              parts: [{ text: `Customer Application Requirements: "${prompt.trim()}"` }]
            }
          ],
          config: {
            systemInstruction,
            responseMimeType: "application/json",
            temperature: 0.2
          }
        });

        if (response.text) {
          responseText = response.text;
          modelUsed = model;
          break;
        }
      } catch (callErr: unknown) {
        const errorMsg = callErr instanceof Error ? callErr.message : String(callErr);
        console.warn(`Model ${model} unavailable (${errorMsg}), trying next candidate...`);
      }
    }
    if (!responseText) {
      return NextResponse.json(
        { error: "Model returned an empty response. Please rephrase your requirements." },
        { status: 502 }
      );
    }

    let parsed: TranslatedRequirement;
    try {
      parsed = JSON.parse(responseText);
    } catch {
      return NextResponse.json(
        { error: "Failed to parse structured JSON from translation output.", raw: responseText },
        { status: 502 }
      );
    }

    return NextResponse.json({
      success: true,
      translation: parsed,
      provenance: {
        engine: "Gemini 2.5 Flash Server-Side",
        rule: "Translates natural-language requirements into ASTM grade candidates. Numeric acceptance thresholds are enforced by deterministic rules."
      }
    });
  } catch (error: unknown) {
    console.error("Requirement translation error:", error);
    const errorMessage = error instanceof Error ? error.message : "Translation service failed";
    return NextResponse.json(
      {
        error: `Requirement Translation Failed: ${errorMessage}`,
        code: "TRANSLATION_API_ERROR"
      },
      { status: 500 }
    );
  }
}
