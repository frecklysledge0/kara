import { NextRequest, NextResponse } from "next/server";
import { getAllListings, addListing } from "@/lib/data/listings-store";
import { InventoryListing } from "@/types/steel";
import { SYNTHETIC_SELLERS } from "@/lib/data/synthetic-listings";
import { GRADE_STANDARDS_REGISTRY } from "@/lib/data/standards";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const gradeId = searchParams.get("gradeId");
    const productForm = searchParams.get("productForm");

    let listings = await getAllListings();

    if (gradeId && gradeId !== "ALL") {
      listings = listings.filter((l) => l.grade_id === gradeId);
    }

    if (productForm && productForm !== "ALL") {
      listings = listings.filter((l) => l.product_form === productForm);
    }

    return NextResponse.json({
      success: true,
      count: listings.length,
      listings
    });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Failed to fetch listings";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      title,
      grade_id,
      product_form,
      thickness_in,
      width_in,
      length_in,
      pieces_available,
      total_weight_lbs,
      price_per_cwt,
      warehouse_city,
      warehouse_state,
      warehouse_lat,
      warehouse_lng,
      certificate
    } = body;

    // Server-side validation
    if (!title || !grade_id || !product_form) {
      return NextResponse.json(
        { error: "Missing required listing fields: title, grade_id, and product_form are mandatory." },
        { status: 400 }
      );
    }

    const price = Number(price_per_cwt);
    if (isNaN(price) || price <= 0) {
      return NextResponse.json(
        { error: "Price per cwt must be a positive non-zero number." },
        { status: 400 }
      );
    }

    const weight = Number(total_weight_lbs);
    if (isNaN(weight) || weight <= 0) {
      return NextResponse.json(
        { error: "Total weight must be a positive non-zero number." },
        { status: 400 }
      );
    }

    const pieces = Number(pieces_available) || 1;
    const thickness = Number(thickness_in) || 0.5;
    const width = Number(width_in) || 96;
    const length = Number(length_in) || 240;

    const newListing: InventoryListing = {
      id: `listing-${Date.now()}`,
      seller_id: SYNTHETIC_SELLERS[0].id,
      seller: SYNTHETIC_SELLERS[0],
      grade_id,
      grade: GRADE_STANDARDS_REGISTRY[grade_id],
      title,
      product_form,
      dimensions_display: `${thickness.toFixed(3)}" x ${width.toFixed(0)}" x ${length > 0 ? `${length.toFixed(0)}"` : "Coil"}`,
      thickness_in: thickness,
      width_in: width,
      length_in: length,
      pieces_available: pieces,
      total_weight_lbs: weight,
      price_per_cwt: price,
      warehouse_city: warehouse_city || "Gary",
      warehouse_state: warehouse_state || "IN",
      warehouse_lat: Number(warehouse_lat) || 41.5934,
      warehouse_lng: Number(warehouse_lng) || -87.3464,
      min_order_quantity_lbs: Math.min(weight, 5000),
      status: "active",
      is_synthetic_demo: true,
      certificate: certificate ? {
        id: `cert-${Date.now()}`,
        heat_number: certificate.heatNumber || "H-TEMP",
        cert_number: certificate.certNumber || `MTR-${Date.now()}`,
        mill_name: certificate.millName || "Certified Mill",
        mill_country: certificate.millCountry || "USA",
        specification: certificate.specification || grade_id,
        en10204_type: (certificate.en10204Type as "2.1" | "2.2" | "3.1" | "3.2") || "3.1",
        product_form,
        dimensions: {
          thickness_in: thickness,
          width_in: width,
          length_in: length,
          weight_lbs: weight
        },
        chemical_analysis: certificate.chemicalAnalysis || {},
        mechanical_results: certificate.mechanicalResults || {
          yield_strength_ksi: 50,
          tensile_strength_ksi: 70,
          elongation_pct: 20
        },
        heat_treatment: certificate.heatTreatment || "As-Rolled",
        extracted_by_model: "gemini-2.5",
        qc_status: "passed",
        qc_summary: {
          status: "PASS",
          standards_met: [grade_id],
          flags: []
        },
        is_synthetic_demo: true
      } : undefined
    };

    const saved = await addListing(newListing);

    return NextResponse.json({
      success: true,
      listing: saved
    });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Failed to publish listing";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
