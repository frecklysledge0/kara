import { fetchAssistantInventory } from "@/lib/engine/assistant-inventory";
import { getAllListings } from "@/lib/data/listings-store";
import { CURATED_GRADES } from "@/lib/data/grades";
import { publicContacts, validCoordinates } from "@/lib/customer/catalog";
import type { CustomerListing } from "@/types/customer";

const normalize = (value: string) => value.toLowerCase().replace(/grade/g, "").replace(/[^a-z0-9]/g, "");

/** Public display data only. Ranking continues to use the existing assistant pipeline. */
export async function fetchCustomerInventory(): Promise<CustomerListing[]> {
  const [listings, legacy] = await Promise.all([fetchAssistantInventory(), getAllListings()]);
  const legacyById = new Map(legacy.map((item) => [item.id, item]));
  return listings.map((item) => {
    const raw = legacyById.get(item.id);
    const demo = item.seller?.demo_status === "synthetic_demo" || Boolean(raw?.is_synthetic_demo);
    const grade = CURATED_GRADES.find((entry) => entry.id === raw?.grade_id
      || normalize(entry.canonical_name) === normalize(item.grade)
      || normalize(entry.id) === normalize(item.grade));
    const price = raw ? raw.price_per_cwt * 20 : item.price_per_ton;
    let coordinates = validCoordinates(item.seller?.latitude, item.seller?.longitude);
    // Legacy publishing silently supplied Gary coordinates. Do not map a conflicting city.
    if (coordinates?.lat === 41.5934 && coordinates.lng === -87.3464
      && item.seller?.city.toLowerCase() !== "gary") coordinates = null;
    return {
      id: item.id,
      grade_id: grade?.id ?? null,
      grade_name: item.grade,
      form: item.form,
      quantity_tons: item.quantity_tons,
      price_per_ton: Number.isFinite(price) && price > 0 ? price : null,
      seller_name: item.seller?.name || "Supplier name not published",
      city: item.seller?.city || "Location not published",
      state: item.seller?.state || "",
      is_demo: demo,
      coordinates,
      contact: publicContacts((raw?.seller ?? item.seller) as unknown as Record<string, unknown>, demo),
      details: {
        thickness_in: raw?.thickness_in ?? item.thickness_in ?? null,
        heat_number: raw ? raw.certificate?.heat_number ?? null : item.certificate?.heat_number ?? null,
        certificate: Boolean(raw ? raw.certificate?.id || raw.certificate_id : item.certificate_id),
        mill_route: item.seller?.mill_route ?? null,
        origin: raw ? raw.certificate?.mill_country ?? null : item.certificate?.melt_pour_country ?? null,
        chemistry: (raw ? raw.certificate?.chemical_analysis : item.certificate?.chemistry) as Record<string, number | null> ?? {},
      },
    };
  });
}
