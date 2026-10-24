import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  executeGeminiGenerate,
  executeGeminiJson,
  classifyGeminiError,
  GeminiOperationError,
  GeminiModelsClient,
} from "@/lib/ai/gemini-client";

describe("Gemini Central Client & Telemetry Suite", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  describe("1. Error Classification", () => {
    it("classifies explicit timeout errors as 504 TIMEOUT and non-retryable", () => {
      const err = new Error("The operation timed out");
      const classified = classifyGeminiError(err, true);
      expect(classified.type).toBe("TIMEOUT");
      expect(classified.status).toBe(504);
      expect(classified.isRetryableWithFallback).toBe(false);
    });

    it("classifies client AbortError as 499 ABORTED and non-retryable", () => {
      const err = new Error("This operation was aborted");
      err.name = "AbortError";
      const classified = classifyGeminiError(err, false);
      expect(classified.type).toBe("ABORTED");
      expect(classified.status).toBe(499);
      expect(classified.isRetryableWithFallback).toBe(false);
    });

    it("classifies 429 quota exhaustion as 429 RESOURCE_EXHAUSTED and NEVER allows fallback", () => {
      const err = {
        status: 429,
        message: "Quota exceeded for model gemini-3.5-flash",
      };
      const classified = classifyGeminiError(err, false);
      expect(classified.type).toBe("RESOURCE_EXHAUSTED");
      expect(classified.status).toBe(429);
      expect(classified.isRetryableWithFallback).toBe(false);
    });

    it("classifies 503 high demand or unavailable as UNAVAILABLE and allows single fallback", () => {
      const err = {
        status: 503,
        message: "The model is currently experiencing high demand. Spikes in demand...",
      };
      const classified = classifyGeminiError(err, false);
      expect(classified.type).toBe("UNAVAILABLE");
      expect(classified.status).toBe(503);
      expect(classified.isRetryableWithFallback).toBe(true);
    });

    it("classifies 400 Bad Request as BAD_REQUEST and forbids fallback", () => {
      const err = {
        status: 400,
        message: "Invalid field in JSON schema specification",
      };
      const classified = classifyGeminiError(err, false);
      expect(classified.type).toBe("BAD_REQUEST");
      expect(classified.status).toBe(400);
      expect(classified.isRetryableWithFallback).toBe(false);
    });
  });

  describe("2. Execution & Successful JSON Generation", () => {
    it("successfully parses valid structured JSON without fallback", async () => {
      const mockGenerate = vi.fn().mockResolvedValue({
        text: JSON.stringify({
          status: "success",
          grade: "ASTM A572 Grade 50",
          yieldKsi: 54.2,
        }),
      });

      const mockAiClient: { models: GeminiModelsClient } = {
        models: {
          generateContent: mockGenerate,
        },
      };

      const result = await executeGeminiJson<{
        status: string;
        grade: string;
        yieldKsi: number;
      }>({
        operationName: "test-valid-json",
        contents: [{ parts: [{ text: "Parse grade specs" }] }],
        aiClient: mockAiClient,
        deadlineMs: 5000,
      });

      expect(result.data.status).toBe("success");
      expect(result.data.grade).toBe("ASTM A572 Grade 50");
      expect(result.data.yieldKsi).toBe(54.2);
      expect(result.isFallback).toBe(false);
      expect(result.retryCount).toBe(0);
      expect(mockGenerate).toHaveBeenCalledTimes(1);
    });

    it("validates schema when validator function is provided", async () => {
      const mockGenerate = vi.fn().mockResolvedValue({
        text: JSON.stringify({ count: 42 }),
      });

      const mockAiClient: { models: GeminiModelsClient } = {
        models: {
          generateContent: mockGenerate,
        },
      };

      const result = await executeGeminiJson<{ count: number }>({
        operationName: "test-validator",
        contents: [{ parts: [{ text: "Return count" }] }],
        aiClient: mockAiClient,
        schemaValidator: (raw: unknown) => {
          const rec = raw as Record<string, unknown>;
          if (typeof rec?.count === "number") {
            return { success: true, data: { count: rec.count } };
          }
          return { success: false, error: "Missing count" };
        },
      });

      expect(result.data.count).toBe(42);
    });
  });

  describe("3. Timeout and Native Cancellation", () => {
    it("cancels operation and throws 504 TIMEOUT when deadline expires", async () => {
      const mockGenerate = vi.fn().mockImplementation(async (params: {
        config?: { abortSignal?: AbortSignal };
      }) => {
        const signal = params.config?.abortSignal;
        return new Promise<{ text: string }>((resolve, reject) => {
          const timer = setTimeout(() => {
            resolve({ text: "{}" });
          }, 500);

          if (signal) {
            signal.addEventListener("abort", () => {
              clearTimeout(timer);
              const err = new Error("This operation was aborted due to timeout");
              err.name = "AbortError";
              reject(err);
            });
          }
        });
      });

      const mockAiClient: { models: GeminiModelsClient } = {
        models: {
          generateContent: mockGenerate,
        },
      };

      await expect(
        executeGeminiGenerate({
          operationName: "test-timeout",
          contents: [{ parts: [{ text: "Long operation" }] }],
          aiClient: mockAiClient,
          deadlineMs: 50, // Short deadline
        })
      ).rejects.toThrowError(GeminiOperationError);
    });

    it("immediately aborts when client signal is cancelled", async () => {
      const ac = new AbortController();

      const mockGenerate = vi.fn().mockImplementation(async (params: {
        config?: { abortSignal?: AbortSignal };
      }) => {
        const signal = params.config?.abortSignal;
        return new Promise<{ text: string }>((resolve, reject) => {
          if (signal?.aborted) {
            const err = new Error("This operation was aborted");
            err.name = "AbortError";
            return reject(err);
          }
          signal?.addEventListener("abort", () => {
            const err = new Error("This operation was aborted");
            err.name = "AbortError";
            reject(err);
          });
        });
      });

      const mockAiClient: { models: GeminiModelsClient } = {
        models: {
          generateContent: mockGenerate,
        },
      };

      // Trigger client cancellation
      setTimeout(() => ac.abort(), 20);

      await expect(
        executeGeminiGenerate({
          operationName: "test-client-abort",
          contents: [{ parts: [{ text: "Cancel me" }] }],
          aiClient: mockAiClient,
          clientSignal: ac.signal,
          deadlineMs: 2000,
        })
      ).rejects.toMatchObject({
        type: "ABORTED",
        status: 499,
      });
    });
  });

  describe("4. Error Handling: 429 Quota Exhaustion & 503 Fallback", () => {
    it("fails immediately on 429 RESOURCE_EXHAUSTED without retrying or fallback", async () => {
      const mockGenerate = vi.fn().mockRejectedValue({
        status: 429,
        message: "RESOURCE_EXHAUSTED: You exceeded your current quota",
      });

      const mockAiClient: { models: GeminiModelsClient } = {
        models: {
          generateContent: mockGenerate,
        },
      };

      await expect(
        executeGeminiGenerate({
          operationName: "test-429-quota",
          contents: [{ parts: [{ text: "Test prompt" }] }],
          aiClient: mockAiClient,
          allowFallback: true,
        })
      ).rejects.toMatchObject({
        type: "RESOURCE_EXHAUSTED",
        status: 429,
      });

      // Exactly ONE call was attempted; no second model was burned
      expect(mockGenerate).toHaveBeenCalledTimes(1);
    });

    it("falls back to secondary model on 503 UNAVAILABLE when configured and budget remains", async () => {
      let callCount = 0;
      const mockGenerate = vi.fn().mockImplementation(async (params: { model: string }) => {
        callCount++;
        if (callCount === 1) {
          // First model fails with 503
          const err = new Error("The model is currently experiencing high demand.");
          Object.assign(err, { status: 503 });
          throw err;
        }
        // Fallback model succeeds
        return {
          text: JSON.stringify({ success: true, model: params.model }),
        };
      });

      const mockAiClient: { models: GeminiModelsClient } = {
        models: {
          generateContent: mockGenerate,
        },
      };

      const result = await executeGeminiGenerate({
        operationName: "test-503-fallback",
        model: "gemini-3.5-flash-lite",
        contents: [{ parts: [{ text: "Test prompt" }] }],
        aiClient: mockAiClient,
        deadlineMs: 10000,
        allowFallback: true,
      });

      expect(callCount).toBe(2);
      expect(result.isFallback).toBe(true);
      expect(result.retryCount).toBe(1);
      expect(result.modelUsed).toBe("gemini-3.5-flash");
    });
  });

  describe("5. Invalid JSON and Schema Failure Handling", () => {
    it("throws 502 SCHEMA_ERROR if response text is malformed JSON", async () => {
      const mockGenerate = vi.fn().mockResolvedValue({
        text: "NOT_VALID_JSON { yield: 50, tensile: 70",
      });

      const mockAiClient: { models: GeminiModelsClient } = {
        models: {
          generateContent: mockGenerate,
        },
      };

      await expect(
        executeGeminiJson({
          operationName: "test-malformed-json",
          contents: [{ parts: [{ text: "Parse me" }] }],
          aiClient: mockAiClient,
        })
      ).rejects.toMatchObject({
        type: "SCHEMA_ERROR",
        status: 502,
      });
    });

    it("throws 502 SCHEMA_ERROR if response text is empty", async () => {
      const mockGenerate = vi.fn().mockResolvedValue({
        text: "",
      });

      const mockAiClient: { models: GeminiModelsClient } = {
        models: {
          generateContent: mockGenerate,
        },
      };

      await expect(
        executeGeminiJson({
          operationName: "test-empty-json",
          contents: [{ parts: [{ text: "Parse me" }] }],
          aiClient: mockAiClient,
        })
      ).rejects.toMatchObject({
        type: "SCHEMA_ERROR",
        status: 502,
      });
    });

    it("throws 502 SCHEMA_ERROR if schema validation returns false", async () => {
      const mockGenerate = vi.fn().mockResolvedValue({
        text: JSON.stringify({ wrongField: "no heat number" }),
      });

      const mockAiClient: { models: GeminiModelsClient } = {
        models: {
          generateContent: mockGenerate,
        },
      };

      await expect(
        executeGeminiJson({
          operationName: "test-schema-fail",
          contents: [{ parts: [{ text: "Parse me" }] }],
          aiClient: mockAiClient,
          schemaValidator: () => ({ success: false, error: "Validation failed" }),
        })
      ).rejects.toMatchObject({
        type: "SCHEMA_ERROR",
        status: 502,
      });
    });
  });
});
