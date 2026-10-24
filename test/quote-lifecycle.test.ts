import { describe, it, expect } from "vitest";
import {
  ALLOWED_TRANSITIONS,
  canReadOrder,
  isValidStateTransition,
  isAuthorizedTransition,
  validateOrderQuantity,
  isDuplicateSubmission,
  applyStateTransition,
  AccessContext,
} from "@/lib/engine/quote-lifecycle";
import { fetchOrderById, fetchOrders, updateOrder } from "@/lib/supabase/database";
import { OrderWithListing, ListingWithRelations, QuoteStatus } from "@/types/database";

describe("MillProof Quote Request & Order Lifecycle Engine", () => {
  // Mock base order fixture for testing
  const mockOrder: OrderWithListing = {
    id: "ord-test-lifecycle-01",
    listing_id: "lot-1",
    buyer_id: "buyer-demo-01",
    seller_id: "seller-1",
    buyer_name: "Midwest Infrastructure LLC",
    buyer_email: "procurement@midwestinfra.com",
    buyer_city: "Chicago",
    buyer_state: "IL",
    buyer_zip: "60601",
    quantity_tons: 24.5,
    estimated_delivered_cost: 28588.58,
    original_price_per_ton: 1080.0,
    original_estimated_delivered_cost: 28588.58,
    quoted_price_per_ton: null,
    final_quoted_cost: null,
    is_estimate: true,
    quoted_at: null,
    seller_notes: null,
    buyer_notes: null,
    decline_reason: null,
    status: "submitted",
    created_at: new Date(Date.now() - 60000).toISOString(),
    updated_at: new Date(Date.now() - 60000).toISOString(),
  };

  const mockListing: ListingWithRelations = {
    id: "lot-1",
    seller_id: "seller-1",
    grade: "ASTM A572 Grade 50",
    form: "Plate",
    thickness_in: 0.75,
    quantity_tons: 40.0,
    price_per_ton: 1080.0,
    certificate_id: "cert-1",
    status: "active",
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  // 1. Valid Lifecycle State Transitions
  describe("1. Valid State Transitions", () => {
    it("permits standard full lifecycle: draft -> submitted -> under_review -> quoted -> accepted -> closed", () => {
      expect(isValidStateTransition("draft", "submitted")).toBe(true);
      expect(isValidStateTransition("submitted", "under_review")).toBe(true);
      expect(isValidStateTransition("under_review", "quoted")).toBe(true);
      expect(isValidStateTransition("quoted", "accepted")).toBe(true);
      expect(isValidStateTransition("accepted", "closed")).toBe(true);
    });

    it("allows seller to decline submitted or reviewed requests", () => {
      expect(isValidStateTransition("submitted", "declined")).toBe(true);
      expect(isValidStateTransition("under_review", "declined")).toBe(true);
    });

    it("allows buyer to decline a formal quote", () => {
      expect(isValidStateTransition("quoted", "declined")).toBe(true);
    });

    it("allows buyer to close or cancel a submitted request", () => {
      expect(isValidStateTransition("submitted", "closed")).toBe(true);
    });

    it("transitions declined orders to closed", () => {
      expect(isValidStateTransition("declined", "closed")).toBe(true);
    });
  });

  // 2. Invalid Transitions & Terminal State Enforcements
  describe("2. Invalid State Transitions", () => {
    it("prohibits jumping directly from submitted to accepted without review and formal quote", () => {
      expect(isValidStateTransition("submitted", "accepted")).toBe(false);
    });

    it("prohibits jumping directly from draft to quoted", () => {
      expect(isValidStateTransition("draft", "quoted")).toBe(false);
    });

    it("strictly prevents transitioning out of terminal state 'closed'", () => {
      const closedTransitions = ALLOWED_TRANSITIONS["closed"];
      expect(closedTransitions).toEqual([]);

      const potentialNextStates: QuoteStatus[] = [
        "draft",
        "submitted",
        "under_review",
        "quoted",
        "accepted",
        "declined",
      ];

      for (const nextState of potentialNextStates) {
        expect(isValidStateTransition("closed", nextState)).toBe(false);
      }
    });

    it("fails when applyStateTransition is called with an invalid transition", () => {
      const actor: AccessContext = { role: "buyer", actorId: "buyer-demo-01" };
      const res = applyStateTransition(mockOrder, {
        orderId: mockOrder.id,
        toStatus: "accepted", // Invalid jump from submitted
        actor,
      });

      expect(res.success).toBe(false);
      expect(res.error).toContain("Invalid lifecycle transition");
    });
  });

  // 3. Insufficient Inventory & Quantity Validation
  describe("3. Inventory & Quantity Validation", () => {
    it("rejects zero or negative quantities", () => {
      const zeroCheck = validateOrderQuantity(0, 50);
      expect(zeroCheck.valid).toBe(false);
      expect(zeroCheck.error).toContain("positive number");

      const negCheck = validateOrderQuantity(-5, 50);
      expect(negCheck.valid).toBe(false);
      expect(negCheck.error).toContain("positive number");

      const nanCheck = validateOrderQuantity(NaN, 50);
      expect(nanCheck.valid).toBe(false);
    });

    it("rejects order quantity exceeding available inventory lot size", () => {
      const excessCheck = validateOrderQuantity(45.5, 30.0);
      expect(excessCheck.valid).toBe(false);
      expect(excessCheck.error).toContain("exceeds available inventory");
    });

    it("accepts valid positive quantities within available inventory", () => {
      const validCheck = validateOrderQuantity(20.0, 30.0);
      expect(validCheck.valid).toBe(true);
      expect(validCheck.error).toBeUndefined();

      const exactCheck = validateOrderQuantity(30.0, 30.0);
      expect(exactCheck.valid).toBe(true);
    });

    it("prevents buyer acceptance when available inventory is no longer sufficient", () => {
      const quotedOrder: OrderWithListing = {
        ...mockOrder,
        status: "quoted",
        quantity_tons: 25.0,
      };

      const depletedListing: ListingWithRelations = {
        ...mockListing,
        quantity_tons: 10.0, // Insufficient remaining
      };

      const actor: AccessContext = { role: "buyer", actorId: "buyer-demo-01" };
      const res = applyStateTransition(
        quotedOrder,
        {
          orderId: quotedOrder.id,
          toStatus: "accepted",
          actor,
        },
        depletedListing
      );

      expect(res.success).toBe(false);
      expect(res.error).toContain("exceeds currently available inventory");
    });
  });

  // 4. Role Authorization & Access Control
  describe("4. Role Authorization & Access Control", () => {
    it("prohibits a buyer from viewing or reading another buyer's quote requests", () => {
      const foreignOrder: OrderWithListing = {
        ...mockOrder,
        buyer_id: "buyer-foreign-99",
        buyer_name: "Foreign Fabricators Inc",
      };

      const buyerActor: AccessContext = { role: "buyer", actorId: "buyer-demo-01" };
      expect(canReadOrder(foreignOrder, buyerActor)).toBe(false);
    });

    it("prohibits a seller from inspecting requests belonging to a different seller", () => {
      const sellerActor: AccessContext = { role: "seller", actorId: "seller-2" };
      expect(canReadOrder(mockOrder, sellerActor)).toBe(false); // mockOrder is for seller-1
    });

    it("allows assigned seller to read the quote request", () => {
      const sellerActor: AccessContext = { role: "seller", actorId: "seller-1" };
      expect(canReadOrder(mockOrder, sellerActor)).toBe(true);
    });

    it("allows owning buyer to read their quote request", () => {
      const buyerActor: AccessContext = { role: "buyer", actorId: "buyer-demo-01" };
      expect(canReadOrder(mockOrder, buyerActor)).toBe(true);
    });

    it("allows admin unrestricted read access across all tenants", () => {
      const adminActor: AccessContext = { role: "admin", actorId: "admin-root" };
      expect(canReadOrder(mockOrder, adminActor)).toBe(true);
    });

    it("prohibits buyers from issuing formal quotes or setting quote prices", () => {
      expect(isAuthorizedTransition("under_review", "quoted", "buyer")).toBe(false);

      const reviewOrder: OrderWithListing = { ...mockOrder, status: "under_review" };
      const buyerActor: AccessContext = { role: "buyer", actorId: "buyer-demo-01" };

      const res = applyStateTransition(reviewOrder, {
        orderId: reviewOrder.id,
        toStatus: "quoted",
        actor: buyerActor,
        quotedPricePerTon: 950,
      });

      expect(res.success).toBe(false);
      expect(res.error).toContain("Permission denied");
    });

    it("prohibits sellers from accepting quotes on behalf of the buyer", () => {
      expect(isAuthorizedTransition("quoted", "accepted", "seller")).toBe(false);

      const quotedOrder: OrderWithListing = { ...mockOrder, status: "quoted" };
      const sellerActor: AccessContext = { role: "seller", actorId: "seller-1" };

      const res = applyStateTransition(quotedOrder, {
        orderId: quotedOrder.id,
        toStatus: "accepted",
        actor: sellerActor,
      });

      expect(res.success).toBe(false);
      expect(res.error).toContain("Permission denied");
    });
  });

  // 5. Duplicate Submission Detection
  describe("5. Duplicate Submission Detection", () => {
    it("detects duplicate submissions for the same lot, quantity, and buyer within time window", () => {
      const existingOrders: OrderWithListing[] = [
        {
          ...mockOrder,
          created_at: new Date(Date.now() - 5000).toISOString(), // 5s ago
        },
      ];

      const isDup = isDuplicateSubmission(
        existingOrders,
        "buyer-demo-01",
        "lot-1",
        24.5,
        15 // 15-second window
      );

      expect(isDup).toBe(true);
    });

    it("permits submission if quantity differs", () => {
      const existingOrders: OrderWithListing[] = [
        {
          ...mockOrder,
          created_at: new Date(Date.now() - 5000).toISOString(),
        },
      ];

      const isDup = isDuplicateSubmission(
        existingOrders,
        "buyer-demo-01",
        "lot-1",
        10.0, // Different quantity
        15
      );

      expect(isDup).toBe(false);
    });

    it("permits submission after the duplicate time window expires", () => {
      const existingOrders: OrderWithListing[] = [
        {
          ...mockOrder,
          created_at: new Date(Date.now() - 60000).toISOString(), // 60s ago
        },
      ];

      const isDup = isDuplicateSubmission(
        existingOrders,
        "buyer-demo-01",
        "lot-1",
        24.5,
        15 // 15-second threshold
      );

      expect(isDup).toBe(false);
    });
  });

  // 6. Missing Records Handling
  describe("6. Missing Records Handling", () => {
    it("returns null when querying a non-existent quote ID", async () => {
      const { data } = await fetchOrderById("ord-nonexistent-9999");
      expect(data).toBeNull();
    });

    it("rejects updating an order that does not exist in the database", async () => {
      await expect(
        updateOrder("ord-phantom-id", { status: "closed" })
      ).rejects.toThrow();
    });
  });

  // 7. Audit Trail Preservation of Initial Estimates
  describe("7. Pricing Estimate Audit Preservation", () => {
    it("preserves original estimate when seller confirms formal quoted pricing", () => {
      const underReviewOrder: OrderWithListing = {
        ...mockOrder,
        status: "under_review",
        original_price_per_ton: 1080.0,
        original_estimated_delivered_cost: 28588.58,
        is_estimate: true,
      };

      const sellerActor: AccessContext = { role: "seller", actorId: "seller-1" };
      const res = applyStateTransition(underReviewOrder, {
        orderId: underReviewOrder.id,
        toStatus: "quoted",
        actor: sellerActor,
        quotedPricePerTon: 1050.0,
        quotedDeliveredCost: 27900.0,
        sellerNotes: "Mill confirmed inventory hold and 14-day rate lock.",
      });

      expect(res.success).toBe(true);
      const updated = res.updatedOrder!;

      // Verify status changed
      expect(updated.status).toBe("quoted");

      // Verify original estimate is preserved unchanged for auditability
      expect(updated.original_price_per_ton).toBe(1080.0);
      expect(updated.original_estimated_delivered_cost).toBe(28588.58);

      // Verify new formal quote fields
      expect(updated.quoted_price_per_ton).toBe(1050.0);
      expect(updated.final_quoted_cost).toBe(27900.0);
      expect(updated.is_estimate).toBe(false); // No longer just an estimate
      expect(updated.quoted_at).toBeDefined();
      expect(updated.seller_notes).toContain("Mill confirmed");
    });

    it("requires positive quoted price per ton when transitioning to 'quoted'", () => {
      const underReviewOrder: OrderWithListing = {
        ...mockOrder,
        status: "under_review",
      };

      const sellerActor: AccessContext = { role: "seller", actorId: "seller-1" };
      const res = applyStateTransition(underReviewOrder, {
        orderId: underReviewOrder.id,
        toStatus: "quoted",
        actor: sellerActor,
        quotedPricePerTon: 0, // Invalid price
      });

      expect(res.success).toBe(false);
      expect(res.error).toContain("quoted price per ton (> 0) is required");
    });
  });

  // 8. Strict Constraint: No Claims of Fulfilled Orders or Payment Processing
  describe("8. Fulfillment and Payment Restrictions", () => {
    it("strictly excludes 'fulfilled' or 'paid' states from the lifecycle state machine", () => {
      const allowedStates = Object.keys(ALLOWED_TRANSITIONS) as QuoteStatus[];
      expect(allowedStates).not.toContain("fulfilled");
      expect(allowedStates).not.toContain("paid");
      expect(allowedStates).not.toContain("shipped");
      expect(allowedStates).toEqual([
        "draft",
        "submitted",
        "under_review",
        "quoted",
        "accepted",
        "declined",
        "closed",
      ]);
    });

    it("verifies fixture orders do not claim fulfillment", async () => {
      const { data: orders } = await fetchOrders();
      expect(orders.length).toBeGreaterThan(0);
      orders.forEach((o) => {
        expect(o.status).not.toBe("fulfilled");
        expect(o.status).not.toBe("paid");
      });
    });
  });
});
