import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { fetchListingById, fetchOrderById, updateOrder } from "@/lib/supabase/database";
import {
  applyStateTransition,
  canReadOrder,
  AccessContext,
  UserRole,
} from "@/lib/engine/quote-lifecycle";
import { QuoteStatus } from "@/types/database";

const TransitionSchema = z.object({
  toStatus: z.enum([
    "draft",
    "submitted",
    "under_review",
    "quoted",
    "accepted",
    "declined",
    "closed",
  ]),
  actor: z.object({
    role: z.enum(["buyer", "seller", "admin"]),
    actorId: z.string().min(1, "actorId is required"),
    actorEmail: z.string().optional(),
  }),
  quotedPricePerTon: z.number().positive().optional(),
  quotedDeliveredCost: z.number().positive().optional(),
  sellerNotes: z.string().max(1000).optional(),
  buyerNotes: z.string().max(1000).optional(),
  declineReason: z.string().max(500).optional(),
});

interface RouteContext {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/quotes/[id]
 * Retrieves a single quote request with strict access control.
 */
export async function GET(req: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;
    const searchParams = req.nextUrl.searchParams;
    const role = (searchParams.get("role") as UserRole) || "buyer";
    const actorId = searchParams.get("actorId") || (role === "buyer" ? "buyer-demo-01" : "seller-1");
    const actorEmail = searchParams.get("actorEmail") || undefined;

    const actor: AccessContext = { role, actorId, actorEmail };

    const { data: order } = await fetchOrderById(id);

    if (!order) {
      return NextResponse.json(
        { error: `Quote request '${id}' not found.` },
        { status: 404 }
      );
    }

    if (!canReadOrder(order, actor)) {
      return NextResponse.json(
        {
          error: `Access denied: User [${actor.actorId}] (${actor.role}) is not authorized to inspect quote '${id}'.`,
          code: "FORBIDDEN",
        },
        { status: 403 }
      );
    }

    return NextResponse.json({
      success: true,
      quote: order,
      actor,
    });
  } catch (err: unknown) {
    console.error("GET /api/quotes/[id] error:", err);
    const msg = err instanceof Error ? err.message : "Error fetching quote request";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

/**
 * PATCH /api/quotes/[id]
 * Executes a deterministic lifecycle state transition.
 */
export async function PATCH(req: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;
    const body = await req.json();

    const parseResult = TransitionSchema.safeParse(body);
    if (!parseResult.success) {
      const issues = parseResult.error.issues || [];
      const errorMsg = issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; ");
      return NextResponse.json(
        { error: `Validation error: ${errorMsg}`, details: issues },
        { status: 400 }
      );
    }

    const {
      toStatus,
      actor,
      quotedPricePerTon,
      quotedDeliveredCost,
      sellerNotes,
      buyerNotes,
      declineReason,
    } = parseResult.data;

    // 1. Fetch current order
    const { data: currentOrder } = await fetchOrderById(id);
    if (!currentOrder) {
      return NextResponse.json(
        { error: `Quote request '${id}' not found.` },
        { status: 404 }
      );
    }

    // 2. Fetch associated listing if present to evaluate quantity check
    const listingId = currentOrder.listing_id;
    let listing = currentOrder.listing || null;
    if (!listing && listingId) {
      const { data: fetchedListing } = await fetchListingById(listingId);
      listing = fetchedListing || null;
    }

    // 3. Execute lifecycle state transition engine
    const transitionResult = applyStateTransition(
      currentOrder,
      {
        orderId: id,
        toStatus: toStatus as QuoteStatus,
        actor,
        quotedPricePerTon,
        quotedDeliveredCost,
        sellerNotes,
        buyerNotes,
        declineReason,
      },
      listing
    );

    if (!transitionResult.success || !transitionResult.updatedOrder) {
      const errMsg = transitionResult.error || "Lifecycle transition failed.";
      const isAuthError = errMsg.includes("Unauthorized") || errMsg.includes("Permission denied");
      return NextResponse.json(
        { error: errMsg, code: isAuthError ? "FORBIDDEN" : "INVALID_TRANSITION" },
        { status: isAuthError ? 403 : 400 }
      );
    }

    const updated = transitionResult.updatedOrder;

    // 4. Persist to database
    const updateResult = await updateOrder(id, {
      status: updated.status,
      quoted_price_per_ton: updated.quoted_price_per_ton,
      final_quoted_cost: updated.final_quoted_cost,
      quoted_at: updated.quoted_at,
      is_estimate: updated.is_estimate,
      seller_notes: updated.seller_notes,
      buyer_notes: updated.buyer_notes,
      decline_reason: updated.decline_reason,
    });

    return NextResponse.json({
      success: true,
      quote: {
        ...updated,
        ...updateResult.data,
        listing: currentOrder.listing,
      },
      message: `Quote request '${id}' status transitioned to '${toStatus}'.`,
    });
  } catch (err: unknown) {
    console.error("PATCH /api/quotes/[id] error:", err);
    const msg = err instanceof Error ? err.message : "Error updating quote state";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
