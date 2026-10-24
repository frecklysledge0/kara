import { NextRequest, NextResponse } from "next/server";
import { GoogleGenAI, Type, Schema } from "@google/genai";
import { evaluateMTR } from "@/lib/engine/compliance";
import { GRADE_STANDARDS_REGISTRY } from "@/lib/data/standards";
import { ChemicalAnalysis, MechanicalResults } from "@/types/steel";

export const maxDuration = 60; // Allow sufficient time for multimodal document OCR

interface MTRParsedResponse {
  heatNumber: string;
  certNumber: string;
  millName: string;
  millCountry: string;
  specification: string;
  standardGradeId?: string;
  productForm: string;
  dimensions: {
    thickness_in: number;
    width_in: number;
    length_in: number;
    weight_lbs: number;
  };
  chemicalAnalysis: ChemicalAnalysis;
  mechanicalResults: MechanicalResults;
  heatTreatment: string;
  en10204Type: string;
  notes: string;
}

export async function POST(req: NextRequest) {
  try {
    const apiKey = process.env.GEMINI_API_KEY;

    const body = await req.json();
    const { sampleId, fileData, mimeType, standardGradeId } = body;

    // Handle explicit sample test case selection
    if (sampleId) {
      return handleSampleMTR(sampleId, standardGradeId);
    }

    if (!fileData) {
      return NextResponse.json(
        { error: "No document data provided. Please upload a PDF or image MTR document." },
        { status: 400 }
      );
    }

    if (!apiKey) {
      return NextResponse.json(
        {
          error: "GEMINI_API_KEY is not configured on the server. Please check your environment variables.",
          code: "MISSING_GEMINI_API_KEY"
        },
        { status: 500 }
      );
    }

    // Call server-side Gemini SDK
    const ai = new GoogleGenAI({ apiKey });

    const systemInstruction = `
You are a licensed metallurgist and certified quality control inspector auditing industrial Mill Test Reports (MTRs / MTC EN 10204 3.1).
Extract all technical data with high precision:
- Heat Number (Ladle / Melt number)
- Certificate Number
- Mill Name and Country of Origin
- Governing Specification (e.g., ASTM A572 Grade 50, ASTM A516 Grade 70, etc.)
- Product Form (Plate, Hot Rolled Coil, Beam, Tube, Round Bar)
- Dimensions: thickness (in inches), width (in inches), length (in inches, or 0 if coil), total weight (in lbs)
- Chemical Analysis (heat/ladle percentages for C, Mn, P, S, Si, Cr, Ni, Mo, Cu, V, Nb, Ti, Al, B, N)
- Mechanical Results: Yield Strength (in ksi, convert from psi or MPa if necessary: 1 ksi = 1000 psi = 6.89476 MPa), Tensile Strength (in ksi), Elongation % (in 2-inch or 50mm gage length), Hardness (HBW/HRC if present), Charpy Impact (ft-lbs and test temp in °F)
- Heat Treatment condition (As-Rolled, Normalized, Quenched & Tempered, Annealed)
- EN 10204 Certificate Type (3.1 or 3.2)
Return structured JSON only. Never fabricate values that are missing or illegible.
`;

    // Extract base64 content
    const base64Data = fileData.replace(/^data:([A-Za-z-+/]+);base64,/, "");

    // Resilient model cascade
    const candidateModels = ["gemini-3.5-flash", "gemini-3.8-flash", "gemini-flash-latest"];
    let responseText: string | null = null;

    for (const model of candidateModels) {
      try {
        const response = await ai.models.generateContent({
          model,
          contents: [
            {
              role: "user",
              parts: [
                {
                  inlineData: {
                    mimeType: mimeType || "application/pdf",
                    data: base64Data
                  }
                },
                {
                  text: "Extract all chemical ladle analysis, mechanical tension tests, heat number, and specification from this Mill Test Report into structured JSON."
                }
              ]
            }
          ],
          config: {
            systemInstruction,
            responseMimeType: "application/json",
            temperature: 0.1
          }
        });

        if (response.text) {
          responseText = response.text;
          break;
        }
      } catch (callErr: any) {
        console.warn(`Extraction model ${model} unavailable, trying next...`);
      }
    }
    if (!responseText) {
      return NextResponse.json(
        { error: "Model returned an empty response. Document may be illegible or corrupt." },
        { status: 502 }
      );
    }

    let parsed: MTRParsedResponse;
    try {
      parsed = JSON.parse(responseText);
    } catch {
      return NextResponse.json(
        { error: "Failed to parse structured JSON from extraction output.", raw: responseText },
        { status: 502 }
      );
    }

    // Determine target grade standard for deterministic compliance evaluation
    const targetGradeKey = standardGradeId || mapSpecificationToGradeId(parsed.specification);
    const standard = GRADE_STANDARDS_REGISTRY[targetGradeKey] || GRADE_STANDARDS_REGISTRY["astm-a572-50"];

    // Execute pure deterministic compliance audit
    const qcSummary = evaluateMTR(parsed.chemicalAnalysis, parsed.mechanicalResults, standard);

    return NextResponse.json({
      success: true,
      extractedData: parsed,
      targetGrade: standard,
      qcSummary,
      extractionProvenance: {
        engine: "Gemini 2.5 Flash Server-Side Vision / OCR",
        deterministicEngine: "MillProof ASTM Rule Engine v1.0",
        notice: "AI was utilized for text extraction only. Pass/fail compliance and Carbon Equivalent were determined mathematically by software rules against published standards."
      }
    });
  } catch (error: unknown) {
    console.error("MTR extraction error:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error during document extraction";
    return NextResponse.json(
      {
        error: `MTR Document Extraction Failed: ${errorMessage}`,
        code: "EXTRACTION_API_ERROR"
      },
      { status: 500 }
    );
  }
}

/**
 * Handles realistic pre-loaded synthetic test samples for seller demonstration.
 */
function handleSampleMTR(sampleId: string, customGradeId?: string) {
  let sampleData: MTRParsedResponse;
  let gradeId = customGradeId || "astm-a572-50";

  if (sampleId === "sample-a572-pass") {
    gradeId = "astm-a572-50";
    sampleData = {
      heatNumber: "H-784291",
      certNumber: "MTR-2026-GLS-0419",
      millName: "Burns Harbor Heavy Plate Works",
      millCountry: "USA",
      specification: "ASTM A572 Grade 50 / AASHTO M223",
      productForm: "Plate",
      dimensions: {
        thickness_in: 0.750,
        width_in: 96.0,
        length_in: 240.0,
        weight_lbs: 4896.0
      },
      chemicalAnalysis: {
        C: 0.18,
        Mn: 1.15,
        P: 0.015,
        S: 0.008,
        Si: 0.24,
        V: 0.035,
        Nb: 0.021,
        Cr: 0.04,
        Ni: 0.03,
        Mo: 0.01,
        Cu: 0.12
      },
      mechanicalResults: {
        yield_strength_ksi: 54.8,
        tensile_strength_ksi: 72.4,
        elongation_pct: 23.5
      },
      heatTreatment: "As-Rolled",
      en10204Type: "3.1",
      notes: "Sample 1: Fully compliant structural bridge plate with low carbon equivalent."
    };
  } else if (sampleId === "sample-a514-qt") {
    gradeId = "astm-a514";
    sampleData = {
      heatNumber: "H-643810",
      certNumber: "MTR-2026-AP-1033",
      millName: "Coatesville Specialty Rolling Mill",
      millCountry: "USA",
      specification: "ASTM A514 Grade B (T-1)",
      productForm: "Plate",
      dimensions: {
        thickness_in: 0.500,
        width_in: 96.0,
        length_in: 288.0,
        weight_lbs: 3916.8
      },
      chemicalAnalysis: {
        C: 0.17,
        Mn: 0.88,
        P: 0.014,
        S: 0.003,
        Si: 0.27,
        Cr: 0.52,
        Mo: 0.21,
        B: 0.0022
      },
      mechanicalResults: {
        yield_strength_ksi: 108.5,
        tensile_strength_ksi: 118.2,
        elongation_pct: 19.0,
        hardness_hbw: 269
      },
      heatTreatment: "Quenched @ 1650°F, Tempered @ 1150°F",
      en10204Type: "3.1",
      notes: "Sample 2: Quenched & Tempered 100 ksi minimum yield mining wear plate."
    };
  } else {
    // Problematic Out-of-Spec Batch
    gradeId = "astm-a572-50";
    sampleData = {
      heatNumber: "H-519022-FLAGGED",
      certNumber: "MTR-2026-DEV-9901",
      millName: "Synthetic Service Center Test Mill",
      millCountry: "USA",
      specification: "ASTM A572 Grade 50",
      productForm: "Plate",
      dimensions: {
        thickness_in: 0.625,
        width_in: 96.0,
        length_in: 240.0,
        weight_lbs: 4080.0
      },
      chemicalAnalysis: {
        C: 0.27, // VIOLATION: max is 0.23%
        Mn: 1.45, // VIOLATION: max is 1.35%
        P: 0.048, // VIOLATION: max is 0.040%
        S: 0.012,
        Si: 0.35,
        V: 0.02
      },
      mechanicalResults: {
        yield_strength_ksi: 48.2, // VIOLATION: min is 50.0 ksi
        tensile_strength_ksi: 74.0,
        elongation_pct: 15.0 // VIOLATION: min is 18.0%
      },
      heatTreatment: "As-Rolled",
      en10204Type: "3.1",
      notes: "Sample 3: Deliberately out-of-spec test batch demonstrating automatic deterministic quality flags."
    };
  }

  const standard = GRADE_STANDARDS_REGISTRY[gradeId] || GRADE_STANDARDS_REGISTRY["astm-a572-50"];
  const qcSummary = evaluateMTR(sampleData.chemicalAnalysis, sampleData.mechanicalResults, standard);

  return NextResponse.json({
    success: true,
    isSample: true,
    sampleId,
    extractedData: sampleData,
    targetGrade: standard,
    qcSummary,
    extractionProvenance: {
      engine: "Deterministic Synthetic Benchmark Suite",
      deterministicEngine: "MillProof ASTM Rule Engine v1.0",
      notice: "Pre-validated benchmark test certificate with realistic ladle analysis and tensile tests."
    }
  });
}

function mapSpecificationToGradeId(specString?: string): string {
  if (!specString) return "astm-a572-50";
  const s = specString.toLowerCase();
  if (s.includes("a36") || s.includes("a-36")) return "astm-a36";
  if (s.includes("572") || s.includes("gr 50") || s.includes("grade 50")) return "astm-a572-50";
  if (s.includes("514") || s.includes("t-1") || s.includes("t1")) return "astm-a514";
  if (s.includes("516") || s.includes("pvq") || s.includes("pressure vessel")) return "astm-a516-70";
  if (s.includes("304")) return "aisi-304l";
  if (s.includes("316")) return "aisi-316l";
  if (s.includes("4140")) return "aisi-4140";
  return "astm-a572-50";
}
