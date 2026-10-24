// =====================================================================
// MillProof: Server-Side MTR Extraction & Quality-Control Pipeline
// Multimodal document OCR via Gemini API + Private Supabase Storage +
// Deterministic ASTM/SAE rules audit + 0-100 review score calculation.
// =====================================================================

import { NextRequest, NextResponse } from "next/server";
import { GoogleGenAI } from "@google/genai";
import {
  MTRExtractionSchema,
  MTRExtraction,
  MTRExtractionPipelineResponse,
} from "@/types/mtr";
import { evaluateMTRComplianceAndRisk } from "@/lib/engine/mtr-qc";
import {
  uploadPrivateMTRDocument,
  validateDocumentMagicBytes,
  checkRateLimit,
  MAX_FILE_SIZE_BYTES,
  ALLOWED_MIME_TYPES,
} from "@/lib/supabase/storage";
import { findExistingCertificatesForHeat } from "@/lib/supabase/database";
import { SYNTHETIC_MTR_FIXTURES } from "@/lib/data/synthetic-mtr-fixtures";

export const maxDuration = 60; // Allow sufficient time for vision/document processing

export async function POST(req: NextRequest) {
  try {
    // 1. In-process demo rate limiting
    const clientIp = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "127.0.0.1";
    const rateCheck = checkRateLimit(clientIp);
    if (!rateCheck.allowed) {
      return NextResponse.json(
        {
          error: "Rate limit exceeded. Please wait 1 minute before uploading additional documents.",
          code: "RATE_LIMIT_EXCEEDED",
        },
        { status: 429 }
      );
    }

    const body = await req.json();
    const { sampleId, fileData, fileName, mimeType, sellerId } = body;

    // 2. Fast-path: Synthetic Benchmark Fixture Demo (All labeled DEMO)
    if (sampleId) {
      const benchmark = SYNTHETIC_MTR_FIXTURES.find((s) => s.id === sampleId);
      if (!benchmark) {
        return NextResponse.json(
          { error: `Benchmark sample ID '${sampleId}' not recognized.` },
          { status: 404 }
        );
      }

      // Check for duplicate heat records across database/fixtures
      const existingRecords = await findExistingCertificatesForHeat(benchmark.data.heat_number || "");
      const reviewResult = evaluateMTRComplianceAndRisk(benchmark.data, {
        existingCertificates: existingRecords,
      });

      const response: MTRExtractionPipelineResponse = {
        success: true,
        certificate_id: `demo-${benchmark.id}`,
        document_sha256: `demo-hash-${benchmark.id}`,
        file_path: `fixtures/${benchmark.id}.pdf`,
        extracted_data: benchmark.data,
        review_result: reviewResult,
        provenance: {
          ocr_model: "Synthetic Benchmark Fixture Suite (DEMO)",
          engine: "MillProof ASTM Rule Engine v1.0",
          rules_version: "2026.1 ASTM/SAE Unified Matrix",
          disclaimer:
            "This is a pre-validated synthetic test certificate labeled as DEMO for system verification. Review score measures data completeness and standard compliance, not proof of authenticity.",
        },
      };

      return NextResponse.json(response);
    }

    // 3. User Document Upload Validation
    if (!fileData) {
      return NextResponse.json(
        { error: "No document data provided. Please upload a PDF or image MTR document." },
        { status: 400 }
      );
    }

    // Extract base64 payload
    const base64Data = fileData.replace(/^data:([A-Za-z-+/]+);base64,/, "");
    const fileBuffer = Buffer.from(base64Data, "base64");

    // File size check (max 20MB)
    if (fileBuffer.length > MAX_FILE_SIZE_BYTES) {
      return NextResponse.json(
        {
          error: `Document exceeds maximum allowable file size (${(MAX_FILE_SIZE_BYTES / (1024 * 1024)).toFixed(0)}MB).`,
          code: "FILE_TOO_LARGE",
        },
        { status: 413 }
      );
    }

    // Content validation via magic bytes (anti-spoofing)
    const magicCheck = validateDocumentMagicBytes(fileBuffer);
    if (!magicCheck.valid) {
      return NextResponse.json(
        {
          error: "Uploaded file is not a valid PDF or supported image document.",
          code: "INVALID_FILE_SIGNATURE",
        },
        { status: 400 }
      );
    }

    const detectedMime = magicCheck.detectedType || mimeType || "application/pdf";
    if (!ALLOWED_MIME_TYPES.includes(detectedMime)) {
      return NextResponse.json(
        {
          error: `Unsupported MIME type '${detectedMime}'. Allowed types: PDF, PNG, JPEG, TIFF, WEBP.`,
          code: "UNSUPPORTED_MIME_TYPE",
        },
        { status: 415 }
      );
    }

    // 4. Store the file privately in Supabase Storage
    const originalName = fileName || `document_${Date.now()}.${detectedMime.includes("pdf") ? "pdf" : "png"}`;
    const storageResult = await uploadPrivateMTRDocument(
      fileBuffer,
      originalName,
      detectedMime,
      sellerId
    );

    // 5. Query Gemini API with Strict Schema
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        {
          error: "GEMINI_API_KEY is not configured on the server. Please check your environment variables.",
          code: "MISSING_GEMINI_API_KEY",
        },
        { status: 500 }
      );
    }

    const ai = new GoogleGenAI({ apiKey });

    const systemInstruction = `
You are a licensed metallurgist and certified materials test engineer auditing industrial Mill Test Reports (MTRs, Mill Test Certificates, EN 10204 3.1 / 3.2).
Your objective is to extract all verifiable technical data from the provided document into strict structured JSON.

CRITICAL EXTRACTION RULES:
1. NEVER invent absent values. If a field or element is not explicitly written on the document, set its value to null.
2. Distinguish ladle analysis (heat chemistry) from check/product analysis if both appear; prioritize ladle analysis.
3. Extract exact verbatim quotations from the document for "field_evidence" to cite where each key field was found.
4. If any section is torn, blurred, illegible, or cropped, add the name of the section to "unreadable_or_missing_fields".
5. For mechanical tension tests:
   - Extract yield strength value and unit (e.g., ksi or MPa).
   - Extract tensile strength value and unit (e.g., ksi or MPa).
   - Extract elongation % value and gauge length in test_context.
   - Extract hardness if present (e.g., HBW, HRB, HRC).
   - Extract Charpy V-Notch impact if present (ft-lbs or Joules, and test temperature).
6. For chemistry:
   - Extract each reported element percentage by weight (C, Mn, P, S, Si, Cr, Ni, Mo, Cu, V, Nb, Ti, Al, B, N).
7. If a printed carbon equivalent is present (e.g., "CE", "CEV", "CE (IIW)"), extract it as a number in "printed_cev".
8. Assess overall extraction confidence as "high", "medium", or "low", and note reasons in "confidence_notes".

JSON SCHEMA STRUCTURE TO RETURN:
{
  "mill_name": string or null,
  "heat_number": string or null,
  "grade": string or null,
  "standard": string or null,
  "product_form": string or null,
  "melt_and_pour_country": string or null,
  "chemistry": {
    "C": { "value": number or null, "unit": "% by weight" },
    "Mn": { "value": number or null, "unit": "% by weight" },
    ...
  },
  "mechanical_properties": {
    "yield_strength": { "value": number or null, "unit": "ksi" or "MPa", "test_context": string or null },
    "tensile_strength": { "value": number or null, "unit": "ksi" or "MPa", "test_context": string or null },
    "elongation_pct": { "value": number or null, "unit": "%", "test_context": string or null },
    "hardness": { "value": number or null, "scale": "HBW" or "HRB" or "HRC" or null },
    "charpy_impact": { "value": number or null, "unit": "ft-lbs" or "J" or null, "test_temp_f": number or null }
  },
  "dimensions": {
    "thickness_in": number or null,
    "width_in": number or null,
    "length_in": number or null,
    "weight_lbs": number or null
  },
  "printed_cev": number or null,
  "unreadable_or_missing_fields": [string],
  "field_evidence": {
    "heat_number": { "quote": string, "page": 1, "confidence": "high" | "medium" | "low" },
    ...
  },
  "overall_confidence": "high" | "medium" | "low",
  "confidence_notes": string or null
}
`;

    // Resilient model cascade
    const candidateModels = ["gemini-3.5-flash", "gemini-3.8-flash", "gemini-flash-latest"];
    let responseText: string | null = null;
    let selectedModel = candidateModels[0];

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
                    mimeType: detectedMime,
                    data: base64Data,
                  },
                },
                {
                  text: "Extract all chemical ladle analysis, mechanical tension tests, heat number, and specification from this Mill Test Report into structured JSON adhering strictly to instructions.",
                },
              ],
            },
          ],
          config: {
            systemInstruction,
            responseMimeType: "application/json",
            temperature: 0.1,
          },
        });

        if (response.text) {
          responseText = response.text;
          selectedModel = model;
          break;
        }
      } catch (callErr: unknown) {
        console.warn(`Extraction model ${model} unavailable, trying fallback...`, callErr);
      }
    }

    if (!responseText) {
      return NextResponse.json(
        {
          error: "Model returned an empty response. The document may be corrupted or unreadable.",
          code: "OCR_EXTRACTION_EMPTY",
        },
        { status: 502 }
      );
    }

    // 6. Server-side validation of Gemini response
    let rawParsed: unknown;
    try {
      rawParsed = JSON.parse(responseText);
    } catch {
      return NextResponse.json(
        {
          error: "Failed to parse JSON structure from extraction model output. The document format may be unreadable or malformed.",
          code: "JSON_PARSE_ERROR",
        },
        { status: 502 }
      );
    }

    const validation = MTRExtractionSchema.safeParse(rawParsed);
    let extractedMTR: MTRExtraction;

    if (!validation.success) {
      console.warn("MTR schema validation warning:", validation.error.format());
      // Gracefully coerce / fill defaults while preserving extracted fields
      extractedMTR = {
        mill_name: (rawParsed as Record<string, unknown>)?.mill_name as string || null,
        heat_number: (rawParsed as Record<string, unknown>)?.heat_number as string || null,
        grade: (rawParsed as Record<string, unknown>)?.grade as string || null,
        standard: (rawParsed as Record<string, unknown>)?.standard as string || null,
        product_form: (rawParsed as Record<string, unknown>)?.product_form as string || null,
        melt_and_pour_country: (rawParsed as Record<string, unknown>)?.melt_and_pour_country as string || null,
        chemistry: ((rawParsed as Record<string, unknown>)?.chemistry as MTRExtraction["chemistry"]) || {},
        mechanical_properties: {
          yield_strength: { value: null, unit: "ksi" },
          tensile_strength: { value: null, unit: "ksi" },
          elongation_pct: { value: null, unit: "%" },
          hardness: { value: null, scale: null },
          charpy_impact: { value: null, unit: "ft-lbs" },
          ...(((rawParsed as Record<string, unknown>)?.mechanical_properties as object) || {}),
        },
        dimensions: {
          thickness_in: null,
          width_in: null,
          length_in: null,
          weight_lbs: null,
          ...(((rawParsed as Record<string, unknown>)?.dimensions as object) || {}),
        },
        printed_cev: ((rawParsed as Record<string, unknown>)?.printed_cev as number) ?? null,
        unreadable_or_missing_fields: Array.isArray((rawParsed as Record<string, unknown>)?.unreadable_or_missing_fields)
          ? ((rawParsed as Record<string, unknown>).unreadable_or_missing_fields as string[])
          : [],
        field_evidence: ((rawParsed as Record<string, unknown>)?.field_evidence as MTRExtraction["field_evidence"]) || {},
        overall_confidence: "medium",
        confidence_notes: "Schema recovered gracefully with partial defaults.",
      };
    } else {
      extractedMTR = validation.data;
    }

    // 7. Check Duplicate Heat Numbers Against Registry
    const existingRecords = await findExistingCertificatesForHeat(extractedMTR.heat_number || "");

    // 8. Run Pure Deterministic Quality-Control Engine
    const reviewResult = evaluateMTRComplianceAndRisk(extractedMTR, {
      existingCertificates: existingRecords,
    });

    // 9. Assemble Secure Pipeline Response
    const pipelineResponse: MTRExtractionPipelineResponse = {
      success: true,
      document_sha256: storageResult.documentSha256,
      file_path: storageResult.filePath,
      signed_preview_url: storageResult.signedUrl,
      extracted_data: extractedMTR,
      review_result: reviewResult,
      provenance: {
        ocr_model: `${selectedModel} Server-Side Vision / OCR`,
        engine: "MillProof ASTM Rule Engine v1.0",
        rules_version: "2026.1 ASTM/SAE Unified Matrix",
        disclaimer:
          "AI was utilized exclusively for optical character recognition. Pass/fail compliance, Carbon Equivalent, and review risk score were computed deterministically by software rules against published standards. A clean review score is not a guarantee of certificate authenticity.",
      },
    };

    return NextResponse.json(pipelineResponse);
  } catch (err: unknown) {
    console.error("MTR extraction pipeline fatal error:", err);
    const msg = err instanceof Error ? err.message : "Unknown server error in MTR extraction pipeline";
    return NextResponse.json(
      {
        error: `MTR Pipeline Processing Error: ${msg}`,
        code: "PIPELINE_ERROR",
      },
      { status: 500 }
    );
  }
}
