import { afterEach, describe, expect, it, vi } from "vitest";
import { fetchWithTimeout, withTimeout } from "@/lib/network";

afterEach(() => { vi.unstubAllGlobals(); vi.useRealTimers(); });

describe("Bounded service requests", () => {
  it("aborts a stalled request rather than leaving a form waiting forever", async () => {
    vi.useFakeTimers();
    vi.stubGlobal("fetch", vi.fn((_input, init: RequestInit) => new Promise((_, reject) => {
      init.signal!.addEventListener("abort", () => reject(init.signal!.reason));
    })));
    const result = fetchWithTimeout("https://service.invalid", undefined, 100);
    const assertion = expect(result).rejects.toThrow("timed out");
    await vi.advanceTimersByTimeAsync(100);
    await assertion;
    expect(vi.getTimerCount()).toBe(0);
  });

  it("preserves caller cancellation and clears the timeout", async () => {
    vi.useFakeTimers();
    vi.stubGlobal("fetch", vi.fn((_input, init: RequestInit) => new Promise((_, reject) => {
      init.signal!.addEventListener("abort", () => reject(init.signal!.reason));
    })));
    const controller = new AbortController();
    const result = fetchWithTimeout("https://service.invalid", { signal: controller.signal });
    const assertion = expect(result).rejects.toThrow("cancelled");
    controller.abort(new Error("cancelled"));
    await assertion;
    expect(vi.getTimerCount()).toBe(0);
  });

  it("returns a completed response without leaving timeout work behind", async () => {
    vi.useFakeTimers();
    const response = new Response("ok");
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(response));
    expect(await fetchWithTimeout("https://service.invalid")).toBe(response);
    expect(vi.getTimerCount()).toBe(0);
  });

  it("releases a stalled auth session check even when its promise never settles", async () => {
    vi.useFakeTimers();
    const result = withTimeout(new Promise(() => {}), 100, "Please sign in again");
    const assertion = expect(result).rejects.toThrow("Please sign in again");
    await vi.advanceTimersByTimeAsync(100);
    await assertion;
    expect(vi.getTimerCount()).toBe(0);
  });
});
