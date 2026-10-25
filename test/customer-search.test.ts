import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { parseRequirementsDeterministic } from "@/lib/engine/requirements-parser";
import { BuyerSpecificationSchema } from "@/types/assistant";

const state = vi.hoisted(() => ({ cache: "", canonical: [] as import("@/types/database").ListingWithRelations[] }));
vi.mock("fs", () => ({ default: {
  existsSync: () => Boolean(state.cache),
  readFileSync: () => state.cache,
  writeFileSync: (_path: string, value: string) => { state.cache = value; },
} }));
vi.mock("@/lib/supabase/server", () => ({ getSupabaseServerClient: () => null }));
vi.mock("@/lib/supabase/database", () => ({ fetchListings: async () => ({ data: state.canonical }) }));

describe("Customer search integration", () => {
  beforeEach(() => { state.cache = ""; state.canonical = []; vi.resetModules(); });

  it("makes a published seller lot visible to the assistant, including a fresh route module", async () => {
    const { POST } = await import("@/app/api/listings/route");
    const response = await POST(new NextRequest("http://localhost/api/listings", {
      method: "POST",
      body: JSON.stringify({ title: "Customer search regression lot", grade_id: "astm-a36", product_form: "Plate", total_weight_lbs: 12000, price_per_cwt: 40 }),
    }));
    expect(response.status).toBe(200);
    const published = (await response.json()).listing;
    vi.resetModules();
    const { queryAndRankInventory } = await import("@/lib/engine/assistant-ranker");
    const { matchGradesToSpecification } = await import("@/lib/engine/grade-matcher");
    const spec = BuyerSpecificationSchema.parse({ use_case: "Indoor structural plate" });
    const ranked = await queryAndRankInventory(spec, matchGradesToSpecification(spec).eligible_grades);
    expect(ranked.find((item) => item.listing_id === published.id)).toMatchObject({ quantity_tons: 6, price_per_ton: 800, is_demo: true });
  });

  it("does not resurrect a canonical closed listing from the overlapping store", async () => {
    const { SYNTHETIC_LISTINGS } = await import("@/lib/data/synthetic-listings");
    const { inventoryListingToListingWithRelations } = await import("@/lib/data/listings-store");
    const listing = inventoryListingToListingWithRelations(SYNTHETIC_LISTINGS[0]);
    state.canonical = [{ ...listing, status: "closed" }];
    const { fetchAssistantInventory } = await import("@/lib/engine/assistant-inventory");
    expect((await fetchAssistantInventory()).some((item) => item.id === listing.id)).toBe(false);
  });

  it("deduplicates overlapping active lots", async () => {
    const { SYNTHETIC_LISTINGS } = await import("@/lib/data/synthetic-listings");
    const { inventoryListingToListingWithRelations } = await import("@/lib/data/listings-store");
    const listing = inventoryListingToListingWithRelations(SYNTHETIC_LISTINGS[0]);
    state.canonical = [listing];
    const { fetchAssistantInventory } = await import("@/lib/engine/assistant-inventory");
    expect((await fetchAssistantInventory()).filter((item) => item.id === listing.id)).toHaveLength(1);
  });

  it("does not label verified_live suppliers as synthetic", async () => {
    const { SYNTHETIC_LISTINGS } = await import("@/lib/data/synthetic-listings");
    const { inventoryListingToListingWithRelations } = await import("@/lib/data/listings-store");
    const listing = inventoryListingToListingWithRelations(SYNTHETIC_LISTINGS[0]);
    state.canonical = [{ ...listing, seller: { ...listing.seller!, demo_status: "verified_live" } }];
    const { queryAndRankInventory } = await import("@/lib/engine/assistant-ranker");
    const { matchGradesToSpecification } = await import("@/lib/engine/grade-matcher");
    const spec = BuyerSpecificationSchema.parse({ use_case: "Indoor structural plate" });
    const ranked = await queryAndRankInventory(spec, matchGradesToSpecification(spec).eligible_grades);
    expect(ranked.find((item) => item.listing_id === listing.id)?.is_demo).toBe(false);
  });
});

describe("Budget basis", () => {
  it.each(["$1,250 per ton", "$1,250/ton", "$1,250 a ton"])("recognizes an explicit unit price: %s", (budget) => {
    expect(parseRequirementsDeterministic(`20 tons of plate, ${budget}`)).toMatchObject({ budget_per_ton: 1250, budget_total: null });
  });
  it.each(["total budget $25,000", "$25k total", "project budget of $25,000"])("keeps a total separate: %s", (budget) => {
    expect(parseRequirementsDeterministic(`20 tons of plate, ${budget}`)).toMatchObject({ budget_per_ton: null, budget_total: 25000 });
  });
  it("asks about an ambiguous amount rather than assuming a unit price", () => {
    const spec = parseRequirementsDeterministic("20 tons of plate, budget $25,000");
    expect(spec.budget_per_ton).toBeNull();
    expect(spec.budget_total).toBeNull();
    expect(spec.missing_information).toContain("Is your budget a total project budget or a budget per ton?");
  });
});
