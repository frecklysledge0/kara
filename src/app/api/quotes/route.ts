import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { fetchListingById, fetchOrders, insertOrder } from "@/lib/supabase/database";
import { estimateFreight } from "@/lib/freight";
import { canReadOrder, isDuplicateSubmission, validateOrderQuantity, AccessContext, UserRole } from "@/lib/engine/quote-lifecycle";

// Schema for quote request submission
export const QuoteRequestSchema = z.object({
  listing_id: z.string().min(1, "listing_id is required"),
  buyer_id: z.string().optional().default("buyer-demo-01"),
  buyer_name: z.string().min(2, "Buyer name must be at least 2 characters").max(100),
  buyer_email: z.string().email("A valid business email address is required"),
  buyer_phone: z.string().optional().nullable(),
  buyer_company: z.string().optional().nullable(),
  buyer_city: z.string().min(2, "Delivery city is required").max(100),
  buyer_state: z.string().length(2, "State must be a 2-letter postal abbreviation").toUpperCase(),
  buyer_zip: z.string().regex(/^\d{5}$/, "ZIP code must be 5 numeric digits").optional().nullable(),
  quantity_tons: z.number().positive("Quantity must be a positive number of tons"),
  needed_by_date: z.string().optional().nullable(),
  notes: z.string().max(1000, "Notes cannot exceed 1000 characters").optional().nullable(),
});

export type QuoteRequestInput = z.infer<typeof QuoteRequestSchema>;

/**
 * GET /api/quotes
 * Returns quote requests filtered by buyer_id, seller_id, or role with access control.
 */
export async function GET(req: NextRequest) {
  try {
    const searchParams = req.nextUrl.searchParams;
    const role = (searchParams.get("role") as UserRole) || "buyer";
    const actorId = searchParams.get("actorId") || (role === "buyer" ? "buyer-demo-01" : "seller-1");
    const actorEmail = searchParams.get("actorEmail") || undefined;
    const status = searchParams.get("status") || "ALL";

    const actor: AccessContext = { role, actorId, actorEmail };

    const { data: allOrders } = await fetchOrders({
      status: status !== "ALL" ? status : undefined,
    });

    // Enforce strict access control filter
    const authorizedOrders = allOrders.filter((order) => canReadOrder(order, actor));

    return NextResponse.json({
      success: true,
      orders: authorizedOrders,
      totalCount: authorizedOrders.length,
      actor,
    });
  } catch (err: unknown) {
    console.error("GET /api/quotes error:", err);
    const msg = err instanceof Error ? err.message : "Internal server error fetching quotes";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

/**
 * POST /api/quotes
 * Submits a new formal RFQ (not a completed purchase).
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    // 1. Server-side validation with strict Zod schema
    const parseResult = QuoteRequestSchema.safeParse(body);
    if (!parseResult.success) {
      const issues = parseResult.error.issues || [];
      const errorMsg = issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; ");
      return NextResponse.json(
        { error: `Validation Error: ${errorMsg}`, details: issues },
        { status: 400 }
      );
    }

    const {
      listing_id,
      buyer_id,
      buyer_name,
      buyer_email,
      buyer_company,
      buyer_city,
      buyer_state,
      buyer_zip,
      quantity_tons,
      notes,
    } = parseResult.data;

    // 2. Fetch real listing record from Supabase database layer
    const { data: listing, error: dbError } = await fetchListingById(listing_id);

    if (dbError || !listing) {
      return NextResponse.json(
        { error: `Listing with ID '${listing_id}' was not found in the active catalog.` },
        { status: 404 }
      );
    }

    // 3. Inactive or reserved listing check
    if (listing.status !== "active") {
      return NextResponse.json(
        {
          error: `Listing is currently ${listing.status}. Quotes can only be requested for active inventory lots.`,
          code: "INACTIVE_LISTING",
        },
        { status: 409 }
      );
    }

    // 4. Quantity availability constraint check
    const qtyCheck = validateOrderQuantity(quantity_tons, listing.quantity_tons);
    if (!qtyCheck.valid) {
      return NextResponse.json(
        {
          error: qtyCheck.error,
          code: "EXCESS_QUANTITY",
        },
        { status: 400 }
      );
    }

    // 5. Duplicate submission check (prevents double clicking within 15 seconds)
    const { data: existingOrders } = await fetchOrders();
    if (isDuplicateSubmission(existingOrders, buyer_id, listing_id, quantity_tons, 15)) {
      return NextResponse.json(
        {
          error: "A quote request for this inventory lot was already submitted moments ago. Please check your dashboard.",
          code: "DUPLICATE_SUBMISSION",
        },
        { status: 409 }
      );
    }

    // 6. Calculate estimated delivered freight using pure logistics engine
    const destinationZip = buyer_zip || "60601";
    const sellerCoords = listing.seller?.latitude && listing.seller?.longitude
      ? {
          lat: listing.seller.latitude,
          lng: listing.seller.longitude,
          city: listing.seller.city,
          state: listing.seller.state,
        }
      : {
          lat: 41.5934,
          lng: -87.3464,
          city: listing.seller?.city || "Gary",
          state: listing.seller?.state || "IN",
        };

    const freightResult = estimateFreight({
      sellerLocation: sellerCoords,
      buyerLocation: destinationZip,
      quantity: quantity_tons,
      unit: "us_short_ton",
      pricePerTon: listing.price_per_ton,
    });

    const estimatedDeliveredCost = freightResult.success
      ? freightResult.estimatedDeliveredTotal
      : Number((listing.price_per_ton * quantity_tons * 1.08).toFixed(2));

    // 7. Save quote request in Supabase orders table with preserved audit history
    // NOTE: This records a submitted RFQ, NOT a completed purchase.
    const orderResult = await insertOrder({
      listing_id: listing.id,
      buyer_id,
      seller_id: listing.seller_id,
      buyer_name: `${buyer_name}${buyer_company ? ` (${buyer_company})` : ""}`,
      buyer_email,
      buyer_company: buyer_company || null,
      buyer_city,
      buyer_state,
      buyer_zip: buyer_zip || null,
      quantity_tons,
      estimated_delivered_cost: estimatedDeliveredCost,
      original_price_per_ton: listing.price_per_ton,
      original_estimated_delivered_cost: estimatedDeliveredCost,
      is_estimate: true, // Remains an estimate until seller confirms
      status: "submitted",
      buyer_notes: notes || null,
    });

    return NextResponse.json({
      success: true,
      quote: {
        id: orderResult.data.id,
        listing_id: listing.id,
        grade: listing.grade,
        quantity_tons,
        estimated_delivered_cost: estimatedDeliveredCost,
        delivered_cost_per_ton: Number((estimatedDeliveredCost / quantity_tons).toFixed(2)),
        freight_estimate: {
          distance_miles: freightResult.estimatedRoadDistanceMiles,
          truckloads: freightResult.truckloadsRequired,
          freight_total: freightResult.estimatedShipmentFreight,
          lead_time: freightResult.approximateLeadTimeText,
        },
        status: "submitted",
        is_estimate: true,
        created_at: orderResult.data.created_at,
        notes: notes || undefined,
      },
      message:
        "Quote request successfully submitted. The producing seller has been notified for formal review.",
    });
  } catch (err: unknown) {
    console.error("Quote creation error:", err);
    const msg = err instanceof Error ? err.message : "Internal server error processing quote request";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
