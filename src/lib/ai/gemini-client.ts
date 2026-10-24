// =====================================================================
// MillProof: Centralized Gemini Client, Model Routing & Resilient Telemetry
// Single-caller per operation, operation-specific deadlines, cancellation,
// safe structured metrics, and strict availability-only fallback.
// =====================================================================

import { GoogleGenAI } from "@google/genai";

export interface GeminiConfig {
  apiKey?: string;
  primaryModel: string;
  mtrModel: string;
  fallbackModel?: string;
  defaultTimeoutMs: number;
  mtrTimeoutMs: number;
}

export type GeminiErrorType =
  | "TIMEOUT"
  | "ABORTED"
  | "RESOURCE_EXHAUSTED"
  | "UNAVAILABLE"
  | "BAD_REQUEST"
  | "AUTH_ERROR"
  | "SCHEMA_ERROR"
  | "UNKNOWN";

export class GeminiOperationError extends Error {
  readonly type: GeminiErrorType;
  readonly status: number;
  readonly modelUsed: string;
  readonly durationMs: number;
  readonly code: string;

  constructor(opts: {
    message: string;
    type: GeminiErrorType;
    status: number;
    modelUsed: string;
    durationMs: number;
    code?: string;
  }) {
    super(opts.message);
    this.name = "GeminiOperationError";
    this.type = opts.type;
    this.status = opts.status;
    this.modelUsed = opts.modelUsed;
    this.durationMs = opts.durationMs;
    this.code = opts.code || `GEMINI_${opts.type}`;
  }
}

export function getGeminiConfig(): GeminiConfig {
  const primaryModel = process.env.GEMINI_MODEL?.trim() || "gemini-3.5-flash-lite";
  const mtrModel = process.env.GEMINI_MTR_MODEL?.trim() || primaryModel;
  const fallbackModel = process.env.GEMINI_FALLBACK_MODEL?.trim() || "gemini-3.5-flash";

  const defaultTimeoutMs = parseInt(process.env.GEMINI_TIMEOUT_MS || "15000", 10);
  const mtrTimeoutMs = parseInt(process.env.GEMINI_MTR_TIMEOUT_MS || "45000", 10);

  return {
    apiKey: process.env.GEMINI_API_KEY?.trim(),
    primaryModel,
    mtrModel,
    fallbackModel,
    defaultTimeoutMs: Number.isFinite(defaultTimeoutMs) && defaultTimeoutMs > 0 ? defaultTimeoutMs : 15000,
    mtrTimeoutMs: Number.isFinite(mtrTimeoutMs) && mtrTimeoutMs > 0 ? mtrTimeoutMs : 45000,
  };
}

export interface GeminiMetricPayload {
  operation: string;
  model: string;
  elapsedMs: number;
  success: boolean;
  timedOut: boolean;
  httpStatus?: number;
  retryCount: number;
  isFallback: boolean;
  errorType?: GeminiErrorType;
}

/**
 * Log structured telemetry.
 * CRITICAL PRIVACY RULE: Never log API keys, document contents, prompts, or customer data.
 */
export function logGeminiLatency(metric: GeminiMetricPayload): void {
  const fields = [
    `operation="${metric.operation}"`,
    `model="${metric.model}"`,
    `elapsedMs=${metric.elapsedMs}`,
    `success=${metric.success}`,
    `timedOut=${metric.timedOut}`,
    metric.httpStatus ? `status=${metric.httpStatus}` : null,
    `retries=${metric.retryCount}`,
    `fallback=${metric.isFallback}`,
    metric.errorType ? `errorType="${metric.errorType}"` : null,
  ]
    .filter(Boolean)
    .join(" ");

  console.info(`[Gemini Metrics] ${fields}`);
}

export interface ClassifiedGeminiError {
  type: GeminiErrorType;
  status: number;
  message: string;
  isRetryableWithFallback: boolean;
}

export function classifyGeminiError(err: unknown, wasTimedOut = false): ClassifiedGeminiError {
  if (wasTimedOut) {
    return {
      type: "TIMEOUT",
      status: 504,
      message: "Gemini operation timed out before completion",
      isRetryableWithFallback: false,
    };
  }

  if (!err) {
    return {
      type: "UNKNOWN",
      status: 500,
      message: "Unknown Gemini service error",
      isRetryableWithFallback: false,
    };
  }

  const errObj = err as Record<string, unknown>;
  const name = String(errObj.name || "");
  const msg = String(errObj.message || (err instanceof Error ? err.message : String(err)));
  const lowerMsg = msg.toLowerCase();

  // 1. Client Abort or Timeout
  if (name === "AbortError" || name === "TimeoutError" || lowerMsg.includes("abort") || lowerMsg.includes("cancelled") || lowerMsg.includes("canceled")) {
    const isTimeout = wasTimedOut || lowerMsg.includes("timeout") || name === "TimeoutError";
    return {
      type: isTimeout ? "TIMEOUT" : "ABORTED",
      status: isTimeout ? 504 : 499,
      message: isTimeout ? "Gemini request timed out" : "Gemini request was cancelled by client",
      isRetryableWithFallback: false,
    };
  }

  // 2. Extract HTTP status code if present
  let status: number | undefined;
  if (typeof errObj.status === "number") {
    status = errObj.status;
  } else if (typeof (errObj.error as Record<string, unknown>)?.code === "number") {
    status = (errObj.error as Record<string, unknown>).code as number;
  }

  // 3. Status-based classification first
  if (status === 503 || status === 502) {
    return {
      type: "UNAVAILABLE",
      status,
      message: msg || "Gemini model is currently experiencing high demand or unavailability.",
      isRetryableWithFallback: true,
    };
  }

  if (status === 429) {
    return {
      type: "RESOURCE_EXHAUSTED",
      status: 429,
      message: msg || "Gemini rate limit or quota exceeded. Please wait before retrying.",
      isRetryableWithFallback: false,
    };
  }

  if (status === 400 || status === 413) {
    return {
      type: "BAD_REQUEST",
      status,
      message: msg || "Invalid request payload sent to Gemini API.",
      isRetryableWithFallback: false,
    };
  }

  if (status === 401 || status === 403) {
    return {
      type: "AUTH_ERROR",
      status,
      message: msg || "Gemini API key is invalid or unauthorized.",
      isRetryableWithFallback: false,
    };
  }

  // 4. Message-based heuristics when status code is absent
  if (
    lowerMsg.includes("503") ||
    lowerMsg.includes("502") ||
    lowerMsg.includes("unavailable") ||
    lowerMsg.includes("high demand") ||
    lowerMsg.includes("spikes in demand") ||
    lowerMsg.includes("econnreset") ||
    lowerMsg.includes("socket hang up")
  ) {
    return {
      type: "UNAVAILABLE",
      status: 503,
      message: msg,
      isRetryableWithFallback: true,
    };
  }

  if (
    lowerMsg.includes("429") ||
    lowerMsg.includes("quota") ||
    lowerMsg.includes("resource_exhausted")
  ) {
    return {
      type: "RESOURCE_EXHAUSTED",
      status: 429,
      message: msg,
      isRetryableWithFallback: false,
    };
  }

  if (lowerMsg.includes("bad request") || lowerMsg.includes("invalid argument")) {
    return {
      type: "BAD_REQUEST",
      status: 400,
      message: msg,
      isRetryableWithFallback: false,
    };
  }

  if (lowerMsg.includes("api key") || lowerMsg.includes("unauthenticated")) {
    return {
      type: "AUTH_ERROR",
      status: 401,
      message: msg,
      isRetryableWithFallback: false,
    };
  }

  return {
    type: "UNKNOWN",
    status: status || 500,
    message: msg,
    isRetryableWithFallback: false,
  };
}

export interface GeminiPart {
  text?: string;
  inlineData?: {
    mimeType: string;
    data: string;
  };
}

export interface GeminiModelsClient {
  generateContent: (params: {
    model: string;
    contents: Parameters<GoogleGenAI["models"]["generateContent"]>[0]["contents"];
    config?: {
      systemInstruction?: string;
      responseMimeType?: string;
      temperature?: number;
      abortSignal?: AbortSignal;
      httpOptions?: { timeout?: number; retryOptions?: { attempts?: number } };
    };
  }) => Promise<{ text?: string | null }>;
}

export interface ExecuteGeminiParams {
  operationName: string;
  model?: string;
  contents: Array<{
    role?: string;
    parts: GeminiPart[];
  }>;
  systemInstruction?: string;
  responseMimeType?: string;
  temperature?: number;
  deadlineMs?: number;
  clientSignal?: AbortSignal | null;
  allowFallback?: boolean;
  aiClient?: { models: GeminiModelsClient } | Pick<GoogleGenAI, "models">;
}

export interface ExecuteGeminiResult {
  text: string;
  modelUsed: string;
  durationMs: number;
  isFallback: boolean;
  retryCount: number;
}

function combineSignals(timeoutSignal: AbortSignal, clientSignal?: AbortSignal | null): AbortSignal {
  if (!clientSignal) return timeoutSignal;
  if (typeof AbortSignal.any === "function") {
    return AbortSignal.any([timeoutSignal, clientSignal]);
  }
  const ac = new AbortController();
  const onAbort = () => {
    ac.abort(clientSignal.reason || timeoutSignal.reason);
  };
  clientSignal.addEventListener("abort", onAbort, { once: true });
  timeoutSignal.addEventListener("abort", onAbort, { once: true });
  return ac.signal;
}

/**
 * Executes a Gemini generation with single-model call, operation-specific deadlines,
 * genuine SDK cancellation via abortSignal, and strict server-unavailability fallback.
 */
export async function executeGeminiGenerate(params: ExecuteGeminiParams): Promise<ExecuteGeminiResult> {
  const config = getGeminiConfig();

  const apiKey = config.apiKey;
  if (!apiKey && !params.aiClient) {
    const err = new GeminiOperationError({
      message: "GEMINI_API_KEY is not configured on the server.",
      type: "AUTH_ERROR",
      status: 500,
      modelUsed: "none",
      durationMs: 0,
      code: "MISSING_GEMINI_API_KEY",
    });
    logGeminiLatency({
      operation: params.operationName,
      model: "none",
      elapsedMs: 0,
      success: false,
      timedOut: false,
      httpStatus: 500,
      retryCount: 0,
      isFallback: false,
      errorType: "AUTH_ERROR",
    });
    throw err;
  }

  const ai = params.aiClient || new GoogleGenAI({ apiKey: apiKey! });

  // Resolve operation deadline and model
  const deadlineMs =
    params.deadlineMs && params.deadlineMs > 0
      ? params.deadlineMs
      : params.operationName === "extract-mtr"
      ? config.mtrTimeoutMs
      : config.defaultTimeoutMs;

  const primaryModel =
    params.model ||
    (params.operationName === "extract-mtr" ? config.mtrModel : config.primaryModel);

  const opStart = Date.now();
  const timeoutSignal = AbortSignal.timeout(deadlineMs);
  const activeSignal = combineSignals(timeoutSignal, params.clientSignal);

  let primaryFailedDueToUnavailable = false;

  try {
    const response = await ai.models.generateContent({
      model: primaryModel,
      contents: params.contents as Parameters<GoogleGenAI["models"]["generateContent"]>[0]["contents"],
      config: {
        systemInstruction: params.systemInstruction,
        responseMimeType: params.responseMimeType,
        temperature: params.temperature ?? 0.1,
        abortSignal: activeSignal,
        httpOptions: {
          timeout: deadlineMs,
          retryOptions: { attempts: 1 },
        },
      },
    });

    const elapsed = Date.now() - opStart;
    logGeminiLatency({
      operation: params.operationName,
      model: primaryModel,
      elapsedMs: elapsed,
      success: true,
      timedOut: false,
      httpStatus: 200,
      retryCount: 0,
      isFallback: false,
    });

    return {
      text: response.text || "",
      modelUsed: primaryModel,
      durationMs: elapsed,
      isFallback: false,
      retryCount: 0,
    };
  } catch (err: unknown) {
    const elapsed = Date.now() - opStart;
    const wasTimedOut = timeoutSignal.aborted || elapsed >= deadlineMs;
    const classified = classifyGeminiError(err, wasTimedOut);

    logGeminiLatency({
      operation: params.operationName,
      model: primaryModel,
      elapsedMs: elapsed,
      success: false,
      timedOut: classified.type === "TIMEOUT",
      httpStatus: classified.status,
      retryCount: 0,
      isFallback: false,
      errorType: classified.type,
    });

    if (classified.isRetryableWithFallback) {
      primaryFailedDueToUnavailable = true;
    } else {
      throw new GeminiOperationError({
        message: classified.message,
        type: classified.type,
        status: classified.status,
        modelUsed: primaryModel,
        durationMs: elapsed,
      });
    }
  }

  // Single Fallback: Only on confirmed server unavailability if configured and remaining time > 3s
  const fallbackModel = config.fallbackModel;
  const remainingMs = deadlineMs - (Date.now() - opStart);

  if (
    primaryFailedDueToUnavailable &&
    params.allowFallback !== false &&
    fallbackModel &&
    fallbackModel !== primaryModel &&
    remainingMs > 3000 &&
    !params.clientSignal?.aborted
  ) {
    console.warn(
      `[Gemini Fallback] Model ${primaryModel} unavailable for ${params.operationName}. Switching to fallback model ${fallbackModel} (${remainingMs}ms remaining).`
    );

    const fallbackTimeoutSignal = AbortSignal.timeout(remainingMs);
    const fallbackActiveSignal = combineSignals(fallbackTimeoutSignal, params.clientSignal);

    try {
      const fallbackResponse = await ai.models.generateContent({
        model: fallbackModel,
        contents: params.contents as Parameters<GoogleGenAI["models"]["generateContent"]>[0]["contents"],
        config: {
          systemInstruction: params.systemInstruction,
          responseMimeType: params.responseMimeType,
          temperature: params.temperature ?? 0.1,
          abortSignal: fallbackActiveSignal,
          httpOptions: {
            timeout: remainingMs,
            retryOptions: { attempts: 1 },
          },
        },
      });

      const totalElapsed = Date.now() - opStart;
      logGeminiLatency({
        operation: params.operationName,
        model: fallbackModel,
        elapsedMs: totalElapsed,
        success: true,
        timedOut: false,
        httpStatus: 200,
        retryCount: 1,
        isFallback: true,
      });

      return {
        text: fallbackResponse.text || "",
        modelUsed: fallbackModel,
        durationMs: totalElapsed,
        isFallback: true,
        retryCount: 1,
      };
    } catch (fbErr: unknown) {
      const totalElapsed = Date.now() - opStart;
      const wasTimedOut = fallbackTimeoutSignal.aborted || totalElapsed >= deadlineMs;
      const fbClassified = classifyGeminiError(fbErr, wasTimedOut);

      logGeminiLatency({
        operation: params.operationName,
        model: fallbackModel,
        elapsedMs: totalElapsed,
        success: false,
        timedOut: fbClassified.type === "TIMEOUT",
        httpStatus: fbClassified.status,
        retryCount: 1,
        isFallback: true,
        errorType: fbClassified.type,
      });

      throw new GeminiOperationError({
        message: fbClassified.message,
        type: fbClassified.type,
        status: fbClassified.status,
        modelUsed: fallbackModel,
        durationMs: totalElapsed,
      });
    }
  }

  // If no fallback was possible or attempted, throw the primary unavailable error
  throw new GeminiOperationError({
    message: "Gemini model is currently unavailable.",
    type: "UNAVAILABLE",
    status: 503,
    modelUsed: primaryModel,
    durationMs: Date.now() - opStart,
  });
}

export interface ExecuteGeminiJsonParams<T> extends Omit<ExecuteGeminiParams, "responseMimeType"> {
  schemaValidator?: (data: unknown) => { success: true; data: T } | { success: false; error: unknown };
}

export interface ExecuteGeminiJsonResult<T> {
  data: T;
  modelUsed: string;
  durationMs: number;
  isFallback: boolean;
  retryCount: number;
}

/**
 * Executes a Gemini request expecting structured JSON.
 * Throws a clean 502 SCHEMA_ERROR if output is unparseable or fails schema validation.
 */
export async function executeGeminiJson<T>(
  params: ExecuteGeminiJsonParams<T>
): Promise<ExecuteGeminiJsonResult<T>> {
  const result = await executeGeminiGenerate({
    ...params,
    responseMimeType: "application/json",
  });

  if (!result.text || result.text.trim().length === 0) {
    logGeminiLatency({
      operation: params.operationName,
      model: result.modelUsed,
      elapsedMs: result.durationMs,
      success: false,
      timedOut: false,
      httpStatus: 502,
      retryCount: result.retryCount,
      isFallback: result.isFallback,
      errorType: "SCHEMA_ERROR",
    });

    throw new GeminiOperationError({
      message: `Gemini returned an empty response for ${params.operationName}.`,
      type: "SCHEMA_ERROR",
      status: 502,
      modelUsed: result.modelUsed,
      durationMs: result.durationMs,
    });
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(result.text);
  } catch {
    logGeminiLatency({
      operation: params.operationName,
      model: result.modelUsed,
      elapsedMs: result.durationMs,
      success: false,
      timedOut: false,
      httpStatus: 502,
      retryCount: result.retryCount,
      isFallback: result.isFallback,
      errorType: "SCHEMA_ERROR",
    });

    throw new GeminiOperationError({
      message: `Gemini response could not be parsed as valid JSON for ${params.operationName}.`,
      type: "SCHEMA_ERROR",
      status: 502,
      modelUsed: result.modelUsed,
      durationMs: result.durationMs,
    });
  }

  if (params.schemaValidator) {
    const validation = params.schemaValidator(parsed);
    if (!validation.success) {
      logGeminiLatency({
        operation: params.operationName,
        model: result.modelUsed,
        elapsedMs: result.durationMs,
        success: false,
        timedOut: false,
        httpStatus: 502,
        retryCount: result.retryCount,
        isFallback: result.isFallback,
        errorType: "SCHEMA_ERROR",
      });

      throw new GeminiOperationError({
        message: `Gemini JSON output did not match expected schema for ${params.operationName}.`,
        type: "SCHEMA_ERROR",
        status: 502,
        modelUsed: result.modelUsed,
        durationMs: result.durationMs,
      });
    }

    return {
      data: validation.data,
      modelUsed: result.modelUsed,
      durationMs: result.durationMs,
      isFallback: result.isFallback,
      retryCount: result.retryCount,
    };
  }

  return {
    data: parsed as T,
    modelUsed: result.modelUsed,
    durationMs: result.durationMs,
    isFallback: result.isFallback,
    retryCount: result.retryCount,
  };
}
