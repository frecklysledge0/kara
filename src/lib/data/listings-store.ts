import fs from "fs";
import path from "path";
import { InventoryListing } from "@/types/steel";
import { SYNTHETIC_LISTINGS } from "./synthetic-listings";
import { getSupabaseServerClient } from "../supabase/server";
import { ListingWithRelations } from "@/types/database";

const CACHE_FILE = path.join(process.cwd(), ".listings-cache.json");

function loadInitialListings(): InventoryListing[] {
  try {
    if (fs.existsSync(CACHE_FILE)) {
      const content = fs.readFileSync(CACHE_FILE, "utf-8");
      const parsed = JSON.parse(content);
      if (Array.isArray(parsed) && parsed.length > 0) {
        // Merge with SYNTHETIC_LISTINGS ensuring no duplicates
        const existingIds = new Set(parsed.map((p) => p.id));
        const merged = [...parsed];
        for (const synth of SYNTHETIC_LISTINGS) {
          if (!existingIds.has(synth.id)) {
            merged.push(synth);
          }
        }
        return merged;
      }
    }
  } catch (err) {
    console.warn("Could not load .listings-cache.json:", err);
  }
  return [...SYNTHETIC_LISTINGS];
}

function persistCache(store: InventoryListing[]) {
  try {
    fs.writeFileSync(CACHE_FILE, JSON.stringify(store, null, 2), "utf-8");
  } catch (err) {
    console.warn("Could not save to .listings-cache.json:", err);
  }
}

// Active store with disk cache fallback
const activeListingsStore: InventoryListing[] = loadInitialListings();

export function inventoryListingToListingWithRelations(item: InventoryListing): ListingWithRelations {
  const tons = item.total_weight_lbs > 0 ? Number((item.total_weight_lbs / 2000).toFixed(2)) : 20;
  const pricePerTon = item.price_per_cwt > 0 ? item.price_per_cwt * 20 : 1200;
  const gradeName = typeof item.grade === "string"
    ? item.grade
    : ((item.grade as unknown as Record<string, unknown>)?.grade_name as string) || item.grade_id || "ASTM A572 Grade 50";

  const certFlags = Array.isArray(item.certificate?.qc_summary?.flags)
    ? item.certificate.qc_summary.flags
    : [];

  return {
    id: item.id,
    seller_id: item.seller_id || "11111111-1111-4111-8111-111111111111",
    grade: gradeName,
    form: item.product_form || "Plate",
    thickness_in: item.thickness_in || 0.5,
    quantity_tons: tons,
    price_per_ton: pricePerTon,
    certificate_id: item.certificate?.id || item.certificate_id || null,
    status: (item.status as "draft" | "active" | "reserved" | "closed") || "active",
    created_at: item.created_at || "2026-10-20T10:00:00.000Z",
    updated_at: item.created_at || "2026-10-20T10:00:00.000Z",
    seller: {
      id: item.seller?.id || item.seller_id || "11111111-1111-4111-8111-111111111111",
      name: item.seller?.name || "Supplier name not provided",
      city: item.warehouse_city || item.seller?.headquarters_city || "",
      state: item.warehouse_state || item.seller?.headquarters_state || "",
      country: "USA",
      latitude: item.warehouse_lat ?? null,
      longitude: item.warehouse_lng ?? null,
      mill_route: null,
      description: null,
      demo_status: item.is_synthetic_demo || item.seller?.is_synthetic_demo ? "synthetic_demo" : "",
      created_at: item.created_at || "2026-10-20T10:00:00.000Z",
    },
    certificate: item.certificate
      ? {
          id: item.certificate.id || `cert-${item.id}`,
          seller_id: item.seller_id || null,
          file_path: "certs/Certified_MTR.pdf",
          original_filename: "Certified_MTR.pdf",
          document_sha256: "sha256-verified-demo",
          heat_number: item.certificate.heat_number || "Certified Heat",
          mill_name: item.certificate.mill_name || item.seller?.name || "Burns Harbor Heavy Plate Works",
          grade: gradeName,
          melt_pour_country: item.certificate.mill_country || "USA",
          chemistry: (item.certificate.chemical_analysis as unknown as Record<string, number | null>) || {},
          mechanical: (item.certificate.mechanical_results as unknown as Record<string, number | null>) || {},
          extraction_status: "completed",
          review_status: item.certificate.qc_status === "passed" ? "approved" : "unreviewed",
          risk_score: item.certificate.qc_status === "passed" ? 3.5 : 45.0,
          flags: certFlags,
          extraction_metadata: {
            model: item.certificate.extracted_by_model || "gemini-2.5",
            en10204_type: item.certificate.en10204_type || "3.1",
            specification: item.certificate.specification || gradeName,
          },
          created_at: item.created_at || "2026-10-20T10:00:00.000Z",
        }
      : null,
  };
}

export async function getAllListings(): Promise<InventoryListing[]> {
  // Route bundles/workers may have loaded before another request published a lot.
  // Re-read the shared fallback cache so a new search sees that publication.
  if (fs.existsSync(CACHE_FILE)) {
    activeListingsStore.splice(0, activeListingsStore.length, ...loadInitialListings());
  }
  const supabase = getSupabaseServerClient();

  if (supabase) {
    try {
      const { data, error } = await supabase
        .from("inventory_listings")
        .select(`
          *,
          seller:sellers(*),
          certificate:material_test_certificates(*),
          grade:grade_standards(*)
        `)
        .eq("status", "active")
        .order("created_at", { ascending: false });

      if (!error && data && data.length > 0) {
        const dbIds = new Set((data as Array<{ id: string }>).map((d) => d.id));
        const sessionOnly = activeListingsStore.filter((l) => !dbIds.has(l.id));
        return [...sessionOnly, ...(data as unknown as InventoryListing[])];
      }
    } catch (e) {
      console.warn("Supabase query error, falling back to local dataset:", e);
    }
  }

  return activeListingsStore;
}

export async function getListingById(id: string): Promise<InventoryListing | undefined> {
  const localMatch = activeListingsStore.find((l) => l.id === id);
  if (localMatch) return localMatch;

  const listings = await getAllListings();
  return listings.find((l) => l.id === id);
}

export async function addListing(listing: InventoryListing): Promise<InventoryListing> {
  const supabase = getSupabaseServerClient();

  if (supabase) {
    try {
      const { data, error } = await supabase
        .from("inventory_listings")
        .insert({
          id: listing.id,
          seller_id: listing.seller_id,
          certificate_id: listing.certificate_id,
          grade_id: listing.grade_id,
          title: listing.title,
          product_form: listing.product_form,
          dimensions_display: listing.dimensions_display,
          thickness_in: listing.thickness_in,
          width_in: listing.width_in,
          length_in: listing.length_in,
          pieces_available: listing.pieces_available,
          total_weight_lbs: listing.total_weight_lbs,
          price_per_cwt: listing.price_per_cwt,
          warehouse_city: listing.warehouse_city,
          warehouse_state: listing.warehouse_state,
          warehouse_lat: listing.warehouse_lat,
          warehouse_lng: listing.warehouse_lng,
          min_order_quantity_lbs: listing.min_order_quantity_lbs,
          status: "active",
          is_synthetic_demo: true
        })
        .select()
        .single();

      if (!error && data) {
        // Also add to local store
        activeListingsStore.unshift(listing);
        persistCache(activeListingsStore);
        return listing;
      }
    } catch (e) {
      console.warn("Supabase insert error, saving to local session store:", e);
    }
  }

  // Prepend to in-memory active store and persist cache
  activeListingsStore.unshift(listing);
  persistCache(activeListingsStore);
  return listing;
}
