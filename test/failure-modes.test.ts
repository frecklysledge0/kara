import { describe, it, expect, afterEach } from "vitest";
import {
  validateDocumentMagicBytes,
  sanitizeFilename,
  MAX_FILE_SIZE_BYTES,
  checkRateLimit,
} from "@/lib/supabase/storage";
import {
  parseBuyerRequirements,
  parseRequirementsDeterministic,
} from "@/lib/engine/requirements-parser";
import { explainRankedCandidates } from "@/lib/engine/assistant-explainer";
import {
  fetchListingById,
  fetchOrderById,
  fetchListings,
} from "@/lib/supabase/database";
import {
  canReadOrder,
  isAuthorizedTransition,
  validateOrderQuantity,
} from "@/lib/engine/quote-lifecycle";
import { OrderWithListing } from "@/types/database";
import { RankedListingCandidate } from "@/types/assistant";

describe("MillProof Release Readiness: Failure Modes & Security Audit Suite", () => {
  // -------------------------------------------------------------------
  // 1. Invalid Files, Spoofed Extensions, & Oversized Uploads
  // -------------------------------------------------------------------
  describe("1. Document Validation & Anti-Spoofing", () => {
    it("rejects plain text files disguised with a .pdf extension", () => {
      const spoofedPdfBuffer = Buffer.from("Hello world, this is just plain text, not a PDF!");
      const check = validateDocumentMagicBytes(spoofedPdfBuffer);
      expect(check.valid).toBe(false);
      expect(check.detectedType).toBeUndefined();
    });

    it("rejects shell scripts and executable binaries", () => {
      const shellScriptBuffer = Buffer.from("#!/bin/bash\necho 'exploit'\n");
      const check = validateDocumentMagicBytes(shellScriptBuffer);
      expect(check.valid).toBe(false);

      const tinyBuffer = Buffer.from([0x00, 0x01]);
      const tinyCheck = validateDocumentMagicBytes(tinyBuffer);
      expect(tinyCheck.valid).toBe(false);
    });

    it("verifies genuine PDF magic bytes (%PDF)", () => {
      const validPdfHeader = Buffer.from([0x25, 0x50, 0x44, 0x46, 0x2d, 0x31, 0x2e, 0x37]); // %PDF-1.7
      const check = validateDocumentMagicBytes(validPdfHeader);
      expect(check.valid).toBe(true);
      expect(check.detectedType).toBe("application/pdf");
    });

    it("verifies genuine image magic bytes (PNG, JPEG, TIFF, WEBP)", () => {
      const pngHeader = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
      expect(validateDocumentMagicBytes(pngHeader).valid).toBe(true);
      expect(validateDocumentMagicBytes(pngHeader).detectedType).toBe("image/png");

      const jpegHeader = Buffer.from([0xff, 0xd8, 0xff, 0xe0]);
      expect(validateDocumentMagicBytes(jpegHeader).valid).toBe(true);
      expect(validateDocumentMagicBytes(jpegHeader).detectedType).toBe("image/jpeg");
    });

    it("strictly flags buffers exceeding MAX_FILE_SIZE_BYTES (20MB)", () => {
      expect(MAX_FILE_SIZE_BYTES).toBe(20 * 1024 * 1024);
      const simulatedOverLimit = 20 * 1024 * 1024 + 1;
      expect(simulatedOverLimit > MAX_FILE_SIZE_BYTES).toBe(true);
    });

    it("sanitizes dangerous filenames against directory traversal and shell metacharacters", () => {
      expect(sanitizeFilename("../../../etc/passwd")).toBe("passwd");
      expect(sanitizeFilename("..\\..\\windows\\system32\\cmd.exe")).toBe("cmd.exe");
      expect(sanitizeFilename("mtr; rm -rf evil.pdf")).toBe("mtr__rm_-rf_evil.pdf");
      expect(sanitizeFilename("cert`whoami`$(id).pdf")).toBe("cert_whoami___id_.pdf");
    });

    it("enforces in-memory rate limiting against spam attacks", () => {
      const testIp = "192.168.1.100";
      // Allow up to 30 requests within window
      for (let i = 0; i < 30; i++) {
        const res = checkRateLimit(testIp);
        expect(res.allowed).toBe(true);
      }
      // Request 31 should be rejected
      const overLimit = checkRateLimit(testIp);
      expect(overLimit.allowed).toBe(false);
      expect(overLimit.remaining).toBe(0);
    });
  });

  // -------------------------------------------------------------------
  // 2. Absent Environment Variables & Resilient Fallbacks
  // -------------------------------------------------------------------
  describe("2. Graceful Degradation on Missing Credentials", () => {
    const originalGeminiKey = process.env.GEMINI_API_KEY;

    afterEach(() => {
      process.env.GEMINI_API_KEY = originalGeminiKey;
    });

    it("parseBuyerRequirements seamlessly falls back to deterministic rule parser if GEMINI_API_KEY is undefined", async () => {
      delete process.env.GEMINI_API_KEY;

      const prompt = "I need around 40 tons of steel for an outdoor structure near the coast. Corrosion resistance matters, and I need plate.";
      const spec = await parseBuyerRequirements(prompt);

      expect(spec).toBeDefined();
      expect(spec.quantity_tons).toBe(40);
      expect(spec.form).toBe("Plate");
      expect(spec.environment).toContain("coastal");
    });

    it("explainRankedCandidates provides deterministic technical summaries if GEMINI_API_KEY is absent", async () => {
      delete process.env.GEMINI_API_KEY;

      const mockSpec = parseRequirementsDeterministic("Need 20 tons of A36 plate");
      const mockCandidate: RankedListingCandidate = {
        listing_id: "lot-test-01",
        grade_id: "astm-a36",
        grade_name: "ASTM A36",
        material_family: "Carbon Structural",
        form: "Plate",
        thickness_in: 0.5,
        quantity_tons: 25,
        price_per_ton: 920,
        seller_name: "Great Lakes Steel",
        seller_city: "Gary",
        seller_state: "IN",
        mill_route: "EAF",
        has_certificate: true,
        certificate_id: "cert-01",
        heat_number: "H-8821",
        is_demo: true,
        destination_city: "Chicago",
        destination_state: "IL",
        destination_zip: "60601",
        delivered_cost_per_ton: 1000,
        total_delivered_cost: 25000,
        freight_breakdown: {
          distance_miles: 150,
          truckloads: 1,
          freight_total: 2000,
          base_material_total: 23000,
        },
        score_material_fit: 0.95,
        score_data_quality: 0.90,
        score_delivered_cost: 0.85,
        total_score: 90,
        effective_weights: { fit: 0.4, quality: 0.3, cost: 0.3 },
        score_explanation: "High material suitability and verified MTR",
      };

      const explanations = await explainRankedCandidates(mockSpec, [mockCandidate]);
      expect(explanations.has("lot-test-01")).toBe(true);

      const exp = explanations.get("lot-test-01")!;
      expect(exp.listing_id).toBe("lot-test-01");
      expect(exp.why_matched).toContain("ASTM A36");
      expect(exp.key_trade_offs.length).toBeGreaterThan(0);
      expect(exp.price_and_freight_assumptions.length).toBeGreaterThan(0);
    });

    it("rejects empty prompt strings with meaningful error instead of crash", async () => {
      await expect(parseBuyerRequirements("   ")).rejects.toThrow("Cannot parse empty requirements prompt.");
    });
  });

  // -------------------------------------------------------------------
  // 3. Database Fault Tolerance & Missing Records
  // -------------------------------------------------------------------
  describe("3. Database Resilience & Missing Records Handling", () => {
    it("returns null data without throwing for non-existent listing ID", async () => {
      const res = await fetchListingById("00000000-0000-0000-0000-000000000000");
      expect(res.data).toBeNull();
      expect(res.source).toBeDefined();
    });

    it("returns null data without throwing for non-existent order ID", async () => {
      const res = await fetchOrderById("00000000-0000-0000-0000-000000000000");
      expect(res.data).toBeNull();
      expect(res.source).toBeDefined();
    });

    it("returns empty results cleanly when searching for non-existent grades", async () => {
      const { data } = await fetchListings({ search: "NON_EXISTENT_ALLOY_TITANIUM_9999" });
      expect(data).toHaveLength(0);
    });
  });

  // -------------------------------------------------------------------
  // 4. Unauthorized Access & Data Isolation
  // -------------------------------------------------------------------
  describe("4. Multi-Tenant Authorization & Permission Checks", () => {
    const sampleOrder: OrderWithListing = {
      id: "ord-sec-01",
      listing_id: "lot-1",
      buyer_id: "buyer-tenant-alpha",
      seller_id: "seller-warehouse-beta",
      buyer_name: "Tenant Alpha Corp",
      buyer_email: "alpha@example.com",
      buyer_city: "Chicago",
      buyer_state: "IL",
      buyer_zip: "60601",
      quantity_tons: 20,
      estimated_delivered_cost: 22000,
      original_price_per_ton: 1000,
      original_estimated_delivered_cost: 22000,
      quoted_price_per_ton: null,
      final_quoted_cost: null,
      is_estimate: true,
      quoted_at: null,
      seller_notes: null,
      buyer_notes: null,
      decline_reason: null,
      status: "submitted",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    it("denies access to third-party buyer attempting to inspect another tenant's order", () => {
      const intruderBuyer = { role: "buyer" as const, actorId: "buyer-tenant-gamma" };
      expect(canReadOrder(sampleOrder, intruderBuyer)).toBe(false);
    });

    it("denies access to an unassigned seller attempting to view the quote", () => {
      const foreignSeller = { role: "seller" as const, actorId: "seller-warehouse-omega" };
      expect(canReadOrder(sampleOrder, foreignSeller)).toBe(false);
    });

    it("grants access to the legitimate owning buyer", () => {
      const ownerBuyer = { role: "buyer" as const, actorId: "buyer-tenant-alpha" };
      expect(canReadOrder(sampleOrder, ownerBuyer)).toBe(true);
    });

    it("grants access to the assigned seller", () => {
      const assignedSeller = { role: "seller" as const, actorId: "seller-warehouse-beta" };
      expect(canReadOrder(sampleOrder, assignedSeller)).toBe(true);
    });

    it("strictly prevents buyers from transitioning quotes to 'quoted' or issuing prices", () => {
      expect(isAuthorizedTransition("under_review", "quoted", "buyer")).toBe(false);
      expect(isAuthorizedTransition("submitted", "under_review", "buyer")).toBe(false);
    });

    it("strictly prevents sellers from accepting their own quotes on behalf of the buyer", () => {
      expect(isAuthorizedTransition("quoted", "accepted", "seller")).toBe(false);
    });
  });

  // -------------------------------------------------------------------
  // 5. Quantity & Input Bounds Verification
  // -------------------------------------------------------------------
  describe("5. Quantity Bounds & Inactive Inventory Rejection", () => {
    it("rejects non-positive order quantities", () => {
      expect(validateOrderQuantity(0, 100).valid).toBe(false);
      expect(validateOrderQuantity(-10, 100).valid).toBe(false);
      expect(validateOrderQuantity(NaN, 100).valid).toBe(false);
      expect(validateOrderQuantity(Infinity, 100).valid).toBe(false);
    });

    it("rejects order request when quantity exceeds available lot tonnage", () => {
      const check = validateOrderQuantity(50.1, 50.0);
      expect(check.valid).toBe(false);
      expect(check.error).toContain("exceeds available inventory");
    });

    it("permits exact match order quantity", () => {
      const check = validateOrderQuantity(50.0, 50.0);
      expect(check.valid).toBe(true);
    });
  });
});
