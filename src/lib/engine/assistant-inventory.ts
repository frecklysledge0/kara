import { getAllListings, inventoryListingToListingWithRelations } from "@/lib/data/listings-store";
import { fetchListings } from "@/lib/supabase/database";

/** Bridge the two existing stores without changing seller or quote repositories. */
export async function fetchAssistantInventory() {
  const [canonical, published] = await Promise.all([
    fetchListings({ status: "ALL" }),
    getAllListings(),
  ]);
  const byId = new Map(published.map((item) => [item.id, inventoryListingToListingWithRelations(item)]));
  // Canonical status wins, including closed/reserved listings.
  for (const item of canonical.data) byId.set(item.id, item);
  return [...byId.values()].filter((item) => item.status === "active" && item.quantity_tons > 0);
}
