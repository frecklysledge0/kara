import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

const NarrateRequestSchema = z.object({
  text: z.string().min(1, "Text is required for narration").max(2500, "Text exceeds maximum character limit of 2500"),
  voiceId: z.string().optional().default("21m00Tcm4TlvDq8ikWAM"), // Rachel (standard industrial/professional voice)
});

export const maxDuration = 20;

/**
 * POST /api/assistant/narrate
 * Synthesizes audio narration for existing sourcing recommendations using ElevenLabs.
 * 
 * Safety & Reliability Rules:
 * - Credentials (ELEVENLABS_API_KEY) stay strictly server-side.
 * - If unconfigured, returns an honest status `{ configured: false }`.
 * - Handles timeouts, quota limits (HTTP 429), and service degradation gracefully.
 * - Does not alter material data or trigger purchases.
 */
export async function POST(req: NextRequest) {
  try {
    const rawBody = await req.json();
    const parseResult = NarrateRequestSchema.safeParse(rawBody);

    if (!parseResult.success) {
      return NextResponse.json(
        {
          success: false,
          error: `Invalid narration request: ${parseResult.error.issues.map((i) => i.message).join("; ")}`,
        },
        { status: 400 }
      );
    }

    const { text, voiceId } = parseResult.data;
    const apiKey = process.env.ELEVENLABS_API_KEY;

    // Check if ElevenLabs credentials are configured
    if (!apiKey || apiKey.trim().length === 0) {
      return NextResponse.json(
        {
          success: false,
          configured: false,
          message: "ElevenLabs API key is not configured in environment variables (ELEVENLABS_API_KEY). Voice narration remains unconfigured.",
          fallbackAvailable: true,
        },
        { status: 200 } // Status 200 with configured: false allows clean client fallback
      );
    }

    // Call ElevenLabs Text-to-Speech API
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000); // 10-second timeout

    const url = `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`;
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "xi-api-key": apiKey,
        "Content-Type": "application/json",
        "Accept": "audio/mpeg",
      },
      body: JSON.stringify({
        text,
        model_id: "eleven_turbo_v2_5",
        voice_settings: {
          stability: 0.5,
          similarity_boost: 0.75,
        },
      }),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      let errorDetail = `ElevenLabs API HTTP ${response.status}`;
      try {
        const errorJson = await response.json();
        if (errorJson.detail?.message) {
          errorDetail = errorJson.detail.message;
        }
      } catch {
        // Response was not JSON
      }

      const isQuotaError = response.status === 429;
      return NextResponse.json(
        {
          success: false,
          configured: true,
          error: isQuotaError ? "ElevenLabs API rate limit or quota exceeded." : `ElevenLabs error: ${errorDetail}`,
          statusCode: response.status,
          fallbackAvailable: true,
        },
        { status: isQuotaError ? 429 : 502 }
      );
    }

    const audioBuffer = await response.arrayBuffer();

    return new Response(audioBuffer, {
      status: 200,
      headers: {
        "Content-Type": "audio/mpeg",
        "Content-Length": audioBuffer.byteLength.toString(),
        "Cache-Control": "public, max-age=3600",
      },
    });
  } catch (err: unknown) {
    const isAbort = (err as Error)?.name === "AbortError";
    const errorMessage = isAbort
      ? "ElevenLabs request timed out after 10 seconds."
      : (err as Error)?.message || "Internal server error during speech synthesis.";

    console.warn("ElevenLabs narration API warning:", errorMessage);

    return NextResponse.json(
      {
        success: false,
        configured: Boolean(process.env.ELEVENLABS_API_KEY),
        error: errorMessage,
        fallbackAvailable: true,
      },
      { status: 504 }
    );
  }
}
