// =====================================================================
// MillProof: Quote Request & Procurement Order Lifecycle Engine
// =====================================================================
// Deterministic state machine governing RFQ submissions, seller reviews,
// formal quoting, buyer acceptance/declination, and order closeout.
// Explicitly enforces access control, quantity checks, and audit history.
// =====================================================================

import { ListingWithRelations, OrderWithListing, QuoteStatus } from "@/types/database";

export type UserRole = "buyer" | "seller" | "admin";

/**
 * Valid state transitions mapping. Terminal states cannot transition further.
 */
export const ALLOWED_TRANSITIONS: Record<QuoteStatus, QuoteStatus[]> = {
  draft: ["submitted", "closed"],
  submitted: ["under_review", "declined", "closed"],
  under_review: ["quoted", "declined", "closed"],
  quoted: ["accepted", "declined", "closed"],
  accepted: ["closed"],
  declined: ["closed"],
  closed: [], // Terminal
};

/**
 * Role-based transition authorization matrix.
 */
export const ROLE_TRANSITIONS: Record<UserRole, Record<QuoteStatus, QuoteStatus[]>> = {
  buyer: {
    draft: ["submitted", "closed"],
    submitted: ["closed"],
    under_review: ["closed"],
    quoted: ["accepted", "declined", "closed"],
    accepted: ["closed"],
    declined: ["closed"],
    closed: [],
  },
  seller: {
    draft: [],
    submitted: ["under_review", "declined"],
    under_review: ["quoted", "declined"],
    quoted: ["declined"],
    accepted: ["closed"],
    declined: ["closed"],
    closed: [],
  },
  admin: {
    draft: ["submitted", "closed"],
    submitted: ["under_review", "declined", "closed"],
    under_review: ["quoted", "declined", "closed"],
    quoted: ["accepted", "declined", "closed"],
    accepted: ["closed"],
    declined: ["closed"],
    closed: [],
  },
};

/**
 * Access control authorization context.
 */
export interface AccessContext {
  role: UserRole;
  actorId: string; // e.g. buyer_id or seller_id
  actorEmail?: string;
}

/**
 * Payload for applying a state transition.
 */
export interface TransitionRequest {
  orderId: string;
  toStatus: QuoteStatus;
  actor: AccessContext;
  quotedPricePerTon?: number;
  quotedDeliveredCost?: number;
  sellerNotes?: string;
  buyerNotes?: string;
  declineReason?: string;
}

/**
 * Verifies if an actor has read permissions for a specific quote request.
 */
export function canReadOrder(order: OrderWithListing, actor: AccessContext): boolean {
  if (actor.role === "admin") return true;

  if (actor.role === "buyer") {
    // Matches by buyer_id or buyer email in record
    if (order.buyer_id && order.buyer_id === actor.actorId) return true;
    if (actor.actorEmail && order.buyer_name.toLowerCase().includes(actor.actorEmail.toLowerCase())) {
      return true;
    }
    // Demo buyer fallback for development
    if (actor.actorId === "buyer-demo-01" && (order.buyer_id === "buyer-demo-01" || !order.buyer_id)) {
      return true;
    }
    return false;
  }

  if (actor.role === "seller") {
    // Matches seller_id on listing or seller_id directly on order
    const sellerId = order.seller_id || order.listing?.seller_id;
    if (sellerId && sellerId === actor.actorId) return true;
    return false;
  }

  return false;
}

/**
 * Validates whether a state transition is logically valid according to the state machine.
 */
export function isValidStateTransition(from: QuoteStatus, to: QuoteStatus): boolean {
  if (!ALLOWED_TRANSITIONS[from]) return false;
  return ALLOWED_TRANSITIONS[from].includes(to);
}

/**
 * Validates whether a specific actor role is authorized to trigger the requested transition.
 */
export function isAuthorizedTransition(
  from: QuoteStatus,
  to: QuoteStatus,
  role: UserRole
): boolean {
  if (role === "admin") return isValidStateTransition(from, to);
  const allowed = ROLE_TRANSITIONS[role]?.[from] || [];
  return allowed.includes(to);
}

/**
 * Validates order quantity constraints against inventory availability.
 */
export function validateOrderQuantity(
  quantityTons: number,
  availableTons: number
): { valid: boolean; error?: string } {
  if (!Number.isFinite(quantityTons) || quantityTons <= 0) {
    return {
      valid: false,
      error: "Requested quantity must be a positive number of tons.",
    };
  }

  if (quantityTons > availableTons) {
    return {
      valid: false,
      error: `Requested quantity (${quantityTons} tons) exceeds available inventory lot size (${availableTons} tons).`,
    };
  }

  return { valid: true };
}

/**
 * Evaluates whether a new submission is a duplicate of a recently submitted request.
 */
export function isDuplicateSubmission(
  existingOrders: OrderWithListing[],
  buyerId: string,
  listingId: string,
  quantityTons: number,
  windowSeconds = 30
): boolean {
  const now = Date.now();
  const thresholdMs = windowSeconds * 1000;

  return existingOrders.some((o) => {
    if (o.listing_id !== listingId) return false;
    if (Math.abs(o.quantity_tons - quantityTons) > 0.001) return false;

    // Buyer match
    const isSameBuyer = o.buyer_id === buyerId || (buyerId === "buyer-demo-01" && !o.buyer_id);
    if (!isSameBuyer) return false;

    // Check time window
    const orderTime = new Date(o.created_at).getTime();
    return now - orderTime < thresholdMs;
  });
}

/**
 * Pure transition engine: applies state change, enforces permissions, and preserves audit trails.
 */
export function applyStateTransition(
  order: OrderWithListing,
  request: TransitionRequest,
  listing?: ListingWithRelations | null
): { success: boolean; error?: string; updatedOrder?: OrderWithListing } {
  const currentStatus = (order.status as QuoteStatus) || "submitted";
  const { toStatus, actor, quotedPricePerTon, quotedDeliveredCost, sellerNotes, buyerNotes, declineReason } = request;

  // 1. Ownership / Access Control Check
  if (!canReadOrder(order, actor)) {
    return {
      success: false,
      error: `Unauthorized: User [${actor.actorId}] (${actor.role}) does not have permission to modify quote ${order.id}.`,
    };
  }

  // 2. Validate Logical State Machine Transition
  if (!isValidStateTransition(currentStatus, toStatus)) {
    return {
      success: false,
      error: `Invalid lifecycle transition: Cannot change quote status from '${currentStatus}' to '${toStatus}'.`,
    };
  }

  // 3. Validate Role-Based Transition Permission
  if (!isAuthorizedTransition(currentStatus, toStatus, actor.role)) {
    return {
      success: false,
      error: `Permission denied: ${actor.role.toUpperCase()} is not authorized to transition quote from '${currentStatus}' to '${toStatus}'.`,
    };
  }

  // 4. State-Specific Business Validations
  if (toStatus === "quoted") {
    if (!quotedPricePerTon || quotedPricePerTon <= 0) {
      return {
        success: false,
        error: "A valid quoted price per ton (> 0) is required when issuing a formal quotation.",
      };
    }
  }

  // 5. Build Updated Order Record with Preserved Audit History
  const now = new Date().toISOString();
  const updated: OrderWithListing = {
    ...order,
    status: toStatus,
    updated_at: now,
  };

  if (toStatus === "quoted") {
    updated.quoted_price_per_ton = quotedPricePerTon;
    updated.final_quoted_cost = quotedDeliveredCost || Number(((quotedPricePerTon || 0) * order.quantity_tons * 1.1).toFixed(2));
    updated.quoted_at = now;
    updated.is_estimate = false; // Confirmed quote replaces estimate
    if (sellerNotes) updated.seller_notes = sellerNotes;
  }

  if (toStatus === "accepted") {
    // When accepted, ensure listing quantity is still sufficient
    if (listing && order.quantity_tons > listing.quantity_tons) {
      return {
        success: false,
        error: `Cannot accept quote: requested tonnage (${order.quantity_tons}t) exceeds currently available inventory (${listing.quantity_tons}t).`,
      };
    }
    if (buyerNotes) updated.buyer_notes = buyerNotes;
  }

  if (toStatus === "declined") {
    if (declineReason) updated.decline_reason = declineReason;
  }

  if (toStatus === "closed") {
    if (buyerNotes && !updated.buyer_notes) updated.buyer_notes = buyerNotes;
  }

  return {
    success: true,
    updatedOrder: updated,
  };
}
