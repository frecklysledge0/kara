import { NextRequest, NextResponse } from "next/server";
import { TranslatedRequirement } from "@/types/steel";
import { ALL_GRADE_STANDARDS } from "@/lib/data/standards";
import { executeGeminiJson, GeminiOperationError } from "@/lib/ai/gemini-client";

export const maxDuration = 30;

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { prompt } = body;

    if (!prompt || typeof prompt !== "string" || prompt.trim().length === 0) {
      return NextResponse.json(
        { error: "A non-empty requirement description is required.", code: "EMPTY_PROMPT" },
        { status: 400 }
      );
    }

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

    const result = await executeGeminiJson<TranslatedRequirement>({
      operationName: "translate-requirements",
      contents: [
        {
          role: "user",
          parts: [{ text: `Customer Application Requirements: "${prompt.trim()}"` }],
        },
      ],
      systemInstruction,
      temperature: 0.2,
      deadlineMs: 15000,
      clientSignal: req.signal,
      schemaValidator: (raw: unknown) => {
        const obj = raw as Record<string, unknown>;
        if (
          obj &&
          Array.isArray(obj.suggestedGrades) &&
          obj.keyMechanicalCriteria &&
          typeof obj.keyMechanicalCriteria === "object"
        ) {
          return { success: true, data: raw as TranslatedRequirement };
        }
        return { success: false, error: "Missing required translation fields" };
      },
    });

    return NextResponse.json({
      success: true,
      translation: result.data,
      provenance: {
        engine: `Gemini (${result.modelUsed}) Server-Side`,
        modelUsed: result.modelUsed,
        durationMs: result.durationMs,
        isFallback: result.isFallback,
        rule: "Translates natural-language requirements into ASTM grade candidates. Numeric acceptance thresholds are enforced by deterministic rules.",
      },
    });
  } catch (error: unknown) {
    if (error instanceof GeminiOperationError) {
      return NextResponse.json(
        {
          error: `Requirement Translation Failed: ${error.message}`,
          code: error.code,
          durationMs: error.durationMs,
          modelUsed: error.modelUsed,
        },
        { status: error.status }
      );
    }

    const errorMessage = error instanceof Error ? error.message : "Translation service failed";
    return NextResponse.json(
      {
        error: `Requirement Translation Failed: ${errorMessage}`,
        code: "TRANSLATION_API_ERROR",
      },
      { status: 500 }
    );
  }
}
