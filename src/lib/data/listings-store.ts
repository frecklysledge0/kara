import { InventoryListing } from "@/types/steel";
import { SYNTHETIC_LISTINGS } from "./synthetic-listings";
import { getSupabaseServerClient } from "../supabase/server";

// In-memory active store for session-persistent listings
const activeListingsStore: InventoryListing[] = [...SYNTHETIC_LISTINGS];

export async function getAllListings(): Promise<InventoryListing[]> {
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
        return data as unknown as InventoryListing[];
      }
    } catch (e) {
      console.warn("Supabase query error, falling back to local dataset:", e);
    }
  }

  return activeListingsStore;
}

export async function getListingById(id: string): Promise<InventoryListing | undefined> {
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
        return listing;
      }
    } catch (e) {
      console.warn("Supabase insert error, saving to local session store:", e);
    }
  }

  // Prepend to in-memory active store
  activeListingsStore.unshift(listing);
  return listing;
}
