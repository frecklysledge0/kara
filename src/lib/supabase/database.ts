// =====================================================================
// MillProof: Typed Database Access Helpers & Repositories
// Implements canonical access for: sellers, listings, certificates, orders
// =====================================================================

import { getSupabaseServerClient } from "./server";
import {
  SellerRow,
  ListingRow,
  ListingInsert,
  CertificateRow,
  CertificateInsert,
  OrderRow,
  OrderInsert,
  ListingWithRelations,
  OrderWithListing,
  validateListingInput,
  validateOrderInput,
} from "@/types/database";
import {
  FIXTURE_SELLERS,
  FIXTURE_LISTINGS,
  FIXTURE_CERTIFICATES,
  FIXTURE_ORDERS,
  getFixtureListingsWithRelations,
  DEMO_MODE_METADATA,
} from "@/lib/data/fixtures";

export interface DatabaseResult<T> {
  data: T;
  source: "supabase_live" | "deterministic_fixture";
  isDemoEnvironment: boolean;
  error?: string;
}

/**
 * Checks whether Supabase credentials are configured in the active environment.
 */
export function isSupabaseConfigured(): boolean {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  return Boolean(url && key);
}

// ---------------------------------------------------------------------
// 1. Sellers Repository
// ---------------------------------------------------------------------
export async function fetchSellers(): Promise<DatabaseResult<SellerRow[]>> {
  const supabase = getSupabaseServerClient();

  if (!supabase) {
    return {
      data: FIXTURE_SELLERS,
      source: "deterministic_fixture",
      isDemoEnvironment: true,
    };
  }

  const { data, error } = await supabase
    .from("sellers")
    .select("*")
    .order("name", { ascending: true });

  if (error) {
    // CRITICAL: Never silently fall back to demo fixtures after a live database failure!
    throw new Error(`Live database failure fetching sellers: [${error.code}] ${error.message}`);
  }

  return {
    data: data || [],
    source: "supabase_live",
    isDemoEnvironment: false,
  };
}

// ---------------------------------------------------------------------
// 2. Listings Repository
// ---------------------------------------------------------------------
export interface ListingFilters {
  grade?: string;
  form?: string;
  status?: "draft" | "active" | "reserved" | "closed" | "ALL";
  search?: string;
  sellerId?: string;
}

export async function fetchListings(
  filters?: ListingFilters
): Promise<DatabaseResult<ListingWithRelations[]>> {
  const supabase = getSupabaseServerClient();

  if (!supabase) {
    let result = getFixtureListingsWithRelations();
    if (filters?.grade && filters.grade !== "ALL") {
      result = result.filter((l) => l.grade === filters.grade);
    }
    if (filters?.form && filters.form !== "ALL") {
      result = result.filter((l) => l.form === filters.form);
    }
    if (filters?.status && filters.status !== "ALL") {
      result = result.filter((l) => l.status === filters.status);
    }
    if (filters?.search) {
      const q = filters.search.toLowerCase();
      result = result.filter(
        (l) =>
          l.grade.toLowerCase().includes(q) ||
          l.form.toLowerCase().includes(q) ||
          l.seller?.name.toLowerCase().includes(q) ||
          l.certificate?.heat_number.toLowerCase().includes(q)
      );
    }
    return {
      data: result,
      source: "deterministic_fixture",
      isDemoEnvironment: true,
    };
  }

  let query = supabase
    .from("listings")
    .select(`
      *,
      seller:sellers(*),
      certificate:certificates(*)
    `)
    .order("created_at", { ascending: false });

  if (filters?.status && filters.status !== "ALL") {
    query = query.eq("status", filters.status);
  } else {
    query = query.in("status", ["active", "reserved"]);
  }

  if (filters?.grade && filters.grade !== "ALL") {
    query = query.eq("grade", filters.grade);
  }

  if (filters?.form && filters.form !== "ALL") {
    query = query.eq("form", filters.form);
  }

  if (filters?.sellerId) {
    query = query.eq("seller_id", filters.sellerId);
  }

  const { data, error } = await query;

  if (error) {
    throw new Error(`Live database failure fetching listings: [${error.code}] ${error.message}`);
  }

  let listings = (data as unknown as ListingWithRelations[]) || [];

  if (filters?.search) {
    const q = filters.search.toLowerCase();
    listings = listings.filter(
      (l) =>
        l.grade.toLowerCase().includes(q) ||
        l.form.toLowerCase().includes(q) ||
        l.seller?.name.toLowerCase().includes(q) ||
        l.certificate?.heat_number.toLowerCase().includes(q)
    );
  }

  return {
    data: listings,
    source: "supabase_live",
    isDemoEnvironment: false,
  };
}

export async function fetchListingById(id: string): Promise<DatabaseResult<ListingWithRelations | null>> {
  const supabase = getSupabaseServerClient();

  if (!supabase) {
    const fixtures = getFixtureListingsWithRelations();
    const found = fixtures.find((l) => l.id === id) || null;
    return {
      data: found,
      source: "deterministic_fixture",
      isDemoEnvironment: true,
    };
  }

  const { data, error } = await supabase
    .from("listings")
    .select(`
      *,
      seller:sellers(*),
      certificate:certificates(*)
    `)
    .eq("id", id)
    .maybeSingle();

  if (error) {
    throw new Error(`Live database failure fetching listing ${id}: [${error.code}] ${error.message}`);
  }

  return {
    data: (data as unknown as ListingWithRelations) || null,
    source: "supabase_live",
    isDemoEnvironment: false,
  };
}

// ---------------------------------------------------------------------
// 3. Create Listing (with strict numeric & constraint validation)
// ---------------------------------------------------------------------
export async function insertListing(
  listingData: ListingInsert
): Promise<DatabaseResult<ListingRow>> {
  const validation = validateListingInput(listingData);
  if (!validation.valid) {
    throw new Error(`Listing validation failed: ${validation.errors.join("; ")}`);
  }

  const supabase = getSupabaseServerClient();

  if (!supabase) {
    const newListing: ListingRow = {
      id: listingData.id || `lst-${Date.now()}`,
      seller_id: listingData.seller_id,
      grade: listingData.grade,
      form: listingData.form,
      thickness_in: listingData.thickness_in,
      quantity_tons: listingData.quantity_tons,
      price_per_ton: listingData.price_per_ton,
      certificate_id: listingData.certificate_id || null,
      status: listingData.status || "active",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    FIXTURE_LISTINGS.unshift(newListing);
    return {
      data: newListing,
      source: "deterministic_fixture",
      isDemoEnvironment: true,
    };
  }

  const { data, error } = await supabase
    .from("listings")
    .insert({
      id: listingData.id,
      seller_id: listingData.seller_id,
      grade: listingData.grade,
      form: listingData.form,
      thickness_in: listingData.thickness_in,
      quantity_tons: listingData.quantity_tons,
      price_per_ton: listingData.price_per_ton,
      certificate_id: listingData.certificate_id || null,
      status: listingData.status || "active",
    })
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to insert listing into live database: [${error.code}] ${error.message}`);
  }

  return {
    data,
    source: "supabase_live",
    isDemoEnvironment: false,
  };
}

// ---------------------------------------------------------------------
// 4. Certificates Repository
// ---------------------------------------------------------------------
export async function fetchCertificates(
  sellerId?: string
): Promise<DatabaseResult<CertificateRow[]>> {
  const supabase = getSupabaseServerClient();

  if (!supabase) {
    let result = FIXTURE_CERTIFICATES;
    if (sellerId) {
      result = result.filter((c) => c.seller_id === sellerId);
    }
    return {
      data: result,
      source: "deterministic_fixture",
      isDemoEnvironment: true,
    };
  }

  let query = supabase.from("certificates").select("*").order("created_at", { ascending: false });

  if (sellerId) {
    query = query.eq("seller_id", sellerId);
  }

  const { data, error } = await query;

  if (error) {
    throw new Error(`Live database failure fetching certificates: [${error.code}] ${error.message}`);
  }

  return {
    data: data || [],
    source: "supabase_live",
    isDemoEnvironment: false,
  };
}

export async function fetchCertificateById(
  id: string
): Promise<DatabaseResult<CertificateRow | null>> {
  const supabase = getSupabaseServerClient();

  if (!supabase) {
    const cert = FIXTURE_CERTIFICATES.find((c) => c.id === id) || null;
    return {
      data: cert,
      source: "deterministic_fixture",
      isDemoEnvironment: true,
    };
  }

  const { data, error } = await supabase
    .from("certificates")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (error) {
    throw new Error(`Live database failure fetching certificate ${id}: [${error.code}] ${error.message}`);
  }

  return {
    data: data || null,
    source: "supabase_live",
    isDemoEnvironment: false,
  };
}

// ---------------------------------------------------------------------
// 5. Orders Repository
// ---------------------------------------------------------------------
export async function fetchOrders(buyerName?: string): Promise<DatabaseResult<OrderWithListing[]>> {
  const supabase = getSupabaseServerClient();

  if (!supabase) {
    let orders = FIXTURE_ORDERS.map((o) => {
      const listing = getFixtureListingsWithRelations().find((l) => l.id === o.listing_id);
      return {
        ...o,
        listing,
      };
    });

    if (buyerName) {
      orders = orders.filter((o) => o.buyer_name.toLowerCase().includes(buyerName.toLowerCase()));
    }

    return {
      data: orders,
      source: "deterministic_fixture",
      isDemoEnvironment: true,
    };
  }

  let query = supabase
    .from("orders")
    .select(`
      *,
      listing:listings(
        *,
        seller:sellers(*),
        certificate:certificates(*)
      )
    `)
    .order("created_at", { ascending: false });

  if (buyerName) {
    query = query.ilike("buyer_name", `%${buyerName}%`);
  }

  const { data, error } = await query;

  if (error) {
    throw new Error(`Live database failure fetching orders: [${error.code}] ${error.message}`);
  }

  return {
    data: (data as unknown as OrderWithListing[]) || [],
    source: "supabase_live",
    isDemoEnvironment: false,
  };
}

export async function insertOrder(orderData: OrderInsert): Promise<DatabaseResult<OrderRow>> {
  const validation = validateOrderInput(orderData);
  if (!validation.valid) {
    throw new Error(`Order validation failed: ${validation.errors.join("; ")}`);
  }

  const supabase = getSupabaseServerClient();

  if (!supabase) {
    const newOrder: OrderRow = {
      id: orderData.id || `ord-${Date.now()}`,
      listing_id: orderData.listing_id,
      buyer_name: orderData.buyer_name,
      buyer_city: orderData.buyer_city,
      quantity_tons: orderData.quantity_tons,
      estimated_delivered_cost: orderData.estimated_delivered_cost,
      status: orderData.status || "submitted",
      created_at: new Date().toISOString(),
    };
    FIXTURE_ORDERS.unshift(newOrder);
    return {
      data: newOrder,
      source: "deterministic_fixture",
      isDemoEnvironment: true,
    };
  }

  const { data, error } = await supabase
    .from("orders")
    .insert({
      id: orderData.id,
      listing_id: orderData.listing_id,
      buyer_name: orderData.buyer_name,
      buyer_city: orderData.buyer_city,
      quantity_tons: orderData.quantity_tons,
      estimated_delivered_cost: orderData.estimated_delivered_cost,
      status: orderData.status || "submitted",
    })
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to insert order into live database: [${error.code}] ${error.message}`);
  }

  return {
    data,
    source: "supabase_live",
    isDemoEnvironment: false,
  };
}
