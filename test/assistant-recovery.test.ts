import { describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { POST } from "@/app/api/assistant/route";

vi.mock("@/lib/engine/assistant-ranker", () => ({ queryAndRankInventory: vi.fn().mockRejectedValue(new Error("Inventory offline")) }));
vi.mock("@/lib/engine/assistant-explainer", () => ({ explainRankedCandidates: vi.fn().mockResolvedValue(new Map()) }));

describe("Buyer guidance during an inventory outage", () => {
  it("returns deterministic grade guidance and an honest availability warning", async () => {
    const response = await POST(new NextRequest("http://localhost/api/assistant", {
      method: "POST", body: JSON.stringify({ specification: { use_case: "Indoor structural shelving", quantity_tons: 20, budget_total: 25000 } }),
    }));
    const body = await response.json();
    expect(response.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.eligible_grades.length).toBeGreaterThan(0);
    expect(body.ranked_listings).toEqual([]);
    expect(body.inventory_warning).toContain("temporarily unavailable");
    expect(body.parsed_specification.budget_total).toBe(25000);
  });
});
