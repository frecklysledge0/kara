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
  OrderUpdate,
  QuoteStatus,
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

function isSchemaUnprovisioned(code?: string): boolean {
  return code === "PGRST205" || code === "42P01" || code === "PGRST200" || code === "PGRST204";
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
    if (isSchemaUnprovisioned(error.code)) {
      return {
        data: FIXTURE_SELLERS,
        source: "deterministic_fixture",
        isDemoEnvironment: true,
      };
    }
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
    if (isSchemaUnprovisioned(error.code)) {
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
      if (filters?.sellerId) {
        result = result.filter((l) => l.seller_id === filters.sellerId);
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
    if (isSchemaUnprovisioned(error.code)) {
      const fixtures = getFixtureListingsWithRelations();
      const found = fixtures.find((l) => l.id === id) || null;
      return {
        data: found,
        source: "deterministic_fixture",
        isDemoEnvironment: true,
      };
    }
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
    if (isSchemaUnprovisioned(error.code)) {
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
    if (isSchemaUnprovisioned(error.code)) {
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
    if (isSchemaUnprovisioned(error.code)) {
      const cert = FIXTURE_CERTIFICATES.find((c) => c.id === id) || null;
      return {
        data: cert,
        source: "deterministic_fixture",
        isDemoEnvironment: true,
      };
    }
    throw new Error(`Live database failure fetching certificate ${id}: [${error.code}] ${error.message}`);
  }

  return {
    data: data || null,
    source: "supabase_live",
    isDemoEnvironment: false,
  };
}

export async function insertCertificate(
  certData: CertificateInsert
): Promise<DatabaseResult<CertificateRow>> {
  const supabase = getSupabaseServerClient();

  if (!supabase) {
    const newCert: CertificateRow = {
      id: certData.id || `cert-${Date.now()}`,
      seller_id: certData.seller_id || null,
      file_path: certData.file_path,
      original_filename: certData.original_filename,
      document_sha256: certData.document_sha256,
      heat_number: certData.heat_number,
      mill_name: certData.mill_name,
      grade: certData.grade,
      melt_pour_country: certData.melt_pour_country || "USA",
      chemistry: certData.chemistry || {},
      mechanical: certData.mechanical || {},
      extraction_status: certData.extraction_status || "completed",
      review_status: certData.review_status || "unreviewed",
      risk_score: certData.risk_score ?? null,
      flags: certData.flags || [],
      extraction_metadata: certData.extraction_metadata || {},
      created_at: new Date().toISOString(),
    };
    FIXTURE_CERTIFICATES.unshift(newCert);
    return {
      data: newCert,
      source: "deterministic_fixture",
      isDemoEnvironment: true,
    };
  }

  const { data, error } = await supabase
    .from("certificates")
    .insert({
      id: certData.id,
      seller_id: certData.seller_id,
      file_path: certData.file_path,
      original_filename: certData.original_filename,
      document_sha256: certData.document_sha256,
      heat_number: certData.heat_number,
      mill_name: certData.mill_name,
      grade: certData.grade,
      melt_pour_country: certData.melt_pour_country,
      chemistry: certData.chemistry,
      mechanical: certData.mechanical,
      extraction_status: certData.extraction_status || "completed",
      review_status: certData.review_status || "unreviewed",
      risk_score: certData.risk_score,
      flags: certData.flags,
      extraction_metadata: certData.extraction_metadata,
    })
    .select()
    .single();

  if (error) {
    if (isSchemaUnprovisioned(error.code)) {
      const newCert: CertificateRow = {
        id: certData.id || `cert-${Date.now()}`,
        seller_id: certData.seller_id || null,
        file_path: certData.file_path,
        original_filename: certData.original_filename,
        document_sha256: certData.document_sha256,
        heat_number: certData.heat_number,
        mill_name: certData.mill_name,
        grade: certData.grade,
        melt_pour_country: certData.melt_pour_country || "USA",
        chemistry: certData.chemistry || {},
        mechanical: certData.mechanical || {},
        extraction_status: certData.extraction_status || "completed",
        review_status: certData.review_status || "unreviewed",
        risk_score: certData.risk_score ?? null,
        flags: certData.flags || [],
        extraction_metadata: certData.extraction_metadata || {},
        created_at: new Date().toISOString(),
      };
      FIXTURE_CERTIFICATES.unshift(newCert);
      return {
        data: newCert,
        source: "deterministic_fixture",
        isDemoEnvironment: true,
      };
    }
    throw new Error(`Failed to insert certificate into live database: [${error.code}] ${error.message}`);
  }

  return {
    data,
    source: "supabase_live",
    isDemoEnvironment: false,
  };
}

export async function findExistingCertificatesForHeat(
  heatNumber: string
): Promise<Array<{ heat_number: string; mill_name: string; grade: string; certificate_id?: string }>> {
  const cleanHeat = heatNumber.trim().toLowerCase();
  if (!cleanHeat) return [];

  const supabase = getSupabaseServerClient();

  if (!supabase) {
    return FIXTURE_CERTIFICATES.filter((c) => c.heat_number.toLowerCase() === cleanHeat).map((c) => ({
      heat_number: c.heat_number,
      mill_name: c.mill_name,
      grade: c.grade,
      certificate_id: c.id,
    }));
  }

  const { data, error } = await supabase
    .from("certificates")
    .select("id, heat_number, mill_name, grade")
    .ilike("heat_number", cleanHeat);

  if (error) {
    console.warn("Could not query certificates for heat duplicates:", error.message);
    // Fall back to fixture list if DB error occurs
    return FIXTURE_CERTIFICATES.filter((c) => c.heat_number.toLowerCase() === cleanHeat).map((c) => ({
      heat_number: c.heat_number,
      mill_name: c.mill_name,
      grade: c.grade,
      certificate_id: c.id,
    }));
  }

  return (data || []).map((c) => ({
    heat_number: c.heat_number,
    mill_name: c.mill_name,
    grade: c.grade,
    certificate_id: c.id,
  }));
}

// ---------------------------------------------------------------------
// 5. Orders Repository
// ---------------------------------------------------------------------
export interface OrderFilters {
  buyerName?: string;
  buyerId?: string;
  sellerId?: string;
  status?: string;
}

export async function fetchOrders(filters?: OrderFilters | string): Promise<DatabaseResult<OrderWithListing[]>> {
  const filterObj: OrderFilters = typeof filters === "string" ? { buyerName: filters } : filters || {};
  const supabase = getSupabaseServerClient();

  if (!supabase) {
    let orders = FIXTURE_ORDERS.map((o) => {
      const listing = getFixtureListingsWithRelations().find((l) => l.id === o.listing_id);
      return {
        ...o,
        listing,
      };
    });

    if (filterObj.buyerId) {
      orders = orders.filter((o) => o.buyer_id === filterObj.buyerId);
    }
    if (filterObj.sellerId) {
      orders = orders.filter((o) => o.seller_id === filterObj.sellerId || o.listing?.seller_id === filterObj.sellerId);
    }
    if (filterObj.status && filterObj.status !== "ALL") {
      orders = orders.filter((o) => o.status === filterObj.status);
    }
    if (filterObj.buyerName) {
      orders = orders.filter((o) => o.buyer_name.toLowerCase().includes(filterObj.buyerName!.toLowerCase()));
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

  if (filterObj.buyerId) {
    query = query.eq("buyer_id", filterObj.buyerId);
  }
  if (filterObj.sellerId) {
    query = query.eq("seller_id", filterObj.sellerId);
  }
  if (filterObj.status && filterObj.status !== "ALL") {
    query = query.eq("status", filterObj.status as QuoteStatus);
  }
  if (filterObj.buyerName) {
    query = query.ilike("buyer_name", `%${filterObj.buyerName}%`);
  }

  const { data, error } = await query;

  if (error) {
    if (isSchemaUnprovisioned(error.code)) {
      let orders = FIXTURE_ORDERS.map((o) => {
        const listing = getFixtureListingsWithRelations().find((l) => l.id === o.listing_id);
        return {
          ...o,
          listing,
        };
      });

      if (filterObj.buyerId) {
        orders = orders.filter((o) => o.buyer_id === filterObj.buyerId);
      }
      if (filterObj.sellerId) {
        orders = orders.filter((o) => o.seller_id === filterObj.sellerId || o.listing?.seller_id === filterObj.sellerId);
      }
      if (filterObj.status && filterObj.status !== "ALL") {
        orders = orders.filter((o) => o.status === filterObj.status);
      }
      if (filterObj.buyerName) {
        orders = orders.filter((o) => o.buyer_name.toLowerCase().includes(filterObj.buyerName!.toLowerCase()));
      }

      return {
        data: orders,
        source: "deterministic_fixture",
        isDemoEnvironment: true,
      };
    }
    throw new Error(`Live database failure fetching orders: [${error.code}] ${error.message}`);
  }

  return {
    data: (data as unknown as OrderWithListing[]) || [],
    source: "supabase_live",
    isDemoEnvironment: false,
  };
}

export async function fetchOrderById(id: string): Promise<DatabaseResult<OrderWithListing | null>> {
  const supabase = getSupabaseServerClient();

  if (!supabase) {
    const found = FIXTURE_ORDERS.find((o) => o.id === id);
    if (!found) {
      return { data: null, source: "deterministic_fixture", isDemoEnvironment: true };
    }
    const listing = getFixtureListingsWithRelations().find((l) => l.id === found.listing_id);
    return {
      data: { ...found, listing },
      source: "deterministic_fixture",
      isDemoEnvironment: true,
    };
  }

  const { data, error } = await supabase
    .from("orders")
    .select(`
      *,
      listing:listings(
        *,
        seller:sellers(*),
        certificate:certificates(*)
      )
    `)
    .eq("id", id)
    .maybeSingle();

  if (error) {
    if (isSchemaUnprovisioned(error.code)) {
      const found = FIXTURE_ORDERS.find((o) => o.id === id);
      if (!found) {
        return { data: null, source: "deterministic_fixture", isDemoEnvironment: true };
      }
      const listing = getFixtureListingsWithRelations().find((l) => l.id === found.listing_id);
      return {
        data: { ...found, listing },
        source: "deterministic_fixture",
        isDemoEnvironment: true,
      };
    }
    throw new Error(`Live database failure fetching order ${id}: [${error.code}] ${error.message}`);
  }

  return {
    data: (data as unknown as OrderWithListing) || null,
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
      buyer_id: orderData.buyer_id || "buyer-demo-01",
      seller_id: orderData.seller_id || null,
      buyer_name: orderData.buyer_name,
      buyer_email: orderData.buyer_email || undefined,
      buyer_company: orderData.buyer_company || null,
      buyer_city: orderData.buyer_city,
      buyer_state: orderData.buyer_state || undefined,
      buyer_zip: orderData.buyer_zip || null,
      quantity_tons: orderData.quantity_tons,
      estimated_delivered_cost: orderData.estimated_delivered_cost,
      original_price_per_ton: orderData.original_price_per_ton || undefined,
      original_estimated_delivered_cost: orderData.original_estimated_delivered_cost || orderData.estimated_delivered_cost,
      quoted_price_per_ton: orderData.quoted_price_per_ton || null,
      final_quoted_cost: orderData.final_quoted_cost || null,
      is_estimate: orderData.is_estimate ?? true,
      quoted_at: orderData.quoted_at || null,
      seller_notes: orderData.seller_notes || null,
      buyer_notes: orderData.buyer_notes || null,
      decline_reason: orderData.decline_reason || null,
      status: orderData.status || "submitted",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
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
    if (isSchemaUnprovisioned(error.code)) {
      const newOrder: OrderRow = {
        id: orderData.id || `ord-${Date.now()}`,
        listing_id: orderData.listing_id,
        buyer_id: orderData.buyer_id || "buyer-demo-01",
        seller_id: orderData.seller_id || null,
        buyer_name: orderData.buyer_name,
        buyer_email: orderData.buyer_email || undefined,
        buyer_company: orderData.buyer_company || null,
        buyer_city: orderData.buyer_city,
        buyer_state: orderData.buyer_state || undefined,
        buyer_zip: orderData.buyer_zip || null,
        quantity_tons: orderData.quantity_tons,
        estimated_delivered_cost: orderData.estimated_delivered_cost,
        original_price_per_ton: orderData.original_price_per_ton || undefined,
        original_estimated_delivered_cost: orderData.original_estimated_delivered_cost || orderData.estimated_delivered_cost,
        quoted_price_per_ton: orderData.quoted_price_per_ton || null,
        final_quoted_cost: orderData.final_quoted_cost || null,
        is_estimate: orderData.is_estimate ?? true,
        quoted_at: orderData.quoted_at || null,
        seller_notes: orderData.seller_notes || null,
        buyer_notes: orderData.buyer_notes || null,
        decline_reason: orderData.decline_reason || null,
        status: orderData.status || "submitted",
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      FIXTURE_ORDERS.unshift(newOrder);
      return {
        data: newOrder,
        source: "deterministic_fixture",
        isDemoEnvironment: true,
      };
    }
    throw new Error(`Failed to insert order into live database: [${error.code}] ${error.message}`);
  }

  return {
    data,
    source: "supabase_live",
    isDemoEnvironment: false,
  };
}

export async function updateOrder(
  id: string,
  updates: Partial<OrderUpdate>
): Promise<DatabaseResult<OrderRow>> {
  const supabase = getSupabaseServerClient();

  if (!supabase) {
    const idx = FIXTURE_ORDERS.findIndex((o) => o.id === id);
    if (idx === -1) {
      throw new Error(`Order with ID '${id}' not found`);
    }
    FIXTURE_ORDERS[idx] = {
      ...FIXTURE_ORDERS[idx],
      ...updates,
      updated_at: new Date().toISOString(),
    } as OrderRow;
    return {
      data: FIXTURE_ORDERS[idx],
      source: "deterministic_fixture",
      isDemoEnvironment: true,
    };
  }

  const { data, error } = await supabase
    .from("orders")
    .update({
      ...updates,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .select()
    .single();

  if (error) {
    if (isSchemaUnprovisioned(error.code)) {
      const idx = FIXTURE_ORDERS.findIndex((o) => o.id === id);
      if (idx !== -1) {
        FIXTURE_ORDERS[idx] = {
          ...FIXTURE_ORDERS[idx],
          ...updates,
          updated_at: new Date().toISOString(),
        } as OrderRow;
        return {
          data: FIXTURE_ORDERS[idx],
          source: "deterministic_fixture",
          isDemoEnvironment: true,
        };
      }
    }
    throw new Error(`Failed to update order ${id}: [${error.code}] ${error.message}`);
  }

  return {
    data,
    source: "supabase_live",
    isDemoEnvironment: false,
  };
}
