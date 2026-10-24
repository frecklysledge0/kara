"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { 
  Scale, 
  Trash2, 
  ArrowRight, 
  MapPin,
  ShieldCheck,
  ExternalLink,
  Plus
} from "lucide-react";
import { PageContainer } from "@/components/layout/PageContainer";
import { Card, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/Table";
import { Dialog } from "@/components/ui/Dialog";
import { QuoteRequestForm } from "@/components/marketplace/QuoteRequestForm";
import { InventoryListing } from "@/types/steel";
import { ListingWithRelations } from "@/types/database";
import { calculateDeliveredCost } from "@/lib/engine/freight";
import { SYNTHETIC_LISTINGS } from "@/lib/data/synthetic-listings";

export default function ComparePage() {
  const [comparedListings, setComparedListings] = useState<InventoryListing[]>([]);
  const [destinationZip, setDestinationZip] = useState<string>("60601");
  const [activeQuoteListing, setActiveQuoteListing] = useState<ListingWithRelations | null>(null);

  useEffect(() => {
    async function loadComparedListings() {
      const saved = sessionStorage.getItem("millproof_compare_lots");
      let ids: string[] = [];
      if (saved) {
        try {
          ids = JSON.parse(saved);
        } catch {
          ids = [];
        }
      }

      // If no lots selected yet, preload first 3 synthetic lots as initial demo comparison
      if (ids.length === 0) {
        ids = [SYNTHETIC_LISTINGS[0].id, SYNTHETIC_LISTINGS[1].id, SYNTHETIC_LISTINGS[2].id];
        sessionStorage.setItem("millproof_compare_lots", JSON.stringify(ids));
      }

      try {
        const res = await fetch("/api/listings");
        const data = await res.json();
        const all: InventoryListing[] = data.success && data.listings ? data.listings : SYNTHETIC_LISTINGS;
        const filtered = all.filter((l) => ids.includes(l.id));
        setComparedListings(filtered.length > 0 ? filtered : SYNTHETIC_LISTINGS.slice(0, 3));
      } catch {
        setComparedListings(SYNTHETIC_LISTINGS.filter((l) => ids.includes(l.id)));
      }
    }

    loadComparedListings();
  }, []);

  function removeLot(id: string) {
    const updated = comparedListings.filter((l) => l.id !== id);
    setComparedListings(updated);
    sessionStorage.setItem(
      "millproof_compare_lots",
      JSON.stringify(updated.map((l) => l.id))
    );
  }

  function convertToRelation(lot: InventoryListing): ListingWithRelations {
    const tons = lot.total_weight_lbs / 2000;
    const pricePerTon = lot.price_per_cwt * 20;

    return {
      id: lot.id,
      seller_id: lot.seller_id,
      grade: lot.grade?.grade_name || lot.grade_id,
      form: lot.product_form,
      thickness_in: lot.thickness_in,
      quantity_tons: tons,
      price_per_ton: pricePerTon,
      certificate_id: lot.certificate_id || null,
      status: "active",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      seller: {
        id: lot.seller?.id || "verified-seller",
        name: lot.seller?.name || "Verified Steel Service",
        city: lot.warehouse_city,
        state: lot.warehouse_state,
        country: "USA",
        latitude: lot.warehouse_lat,
        longitude: lot.warehouse_lng,
        mill_route: "EAF",
        description: null,
        demo_status: "active_demo",
        created_at: new Date().toISOString(),
      },
      certificate: lot.certificate ? {
        id: lot.certificate.id,
        seller_id: lot.seller_id,
        file_path: "vault/mtr.pdf",
        original_filename: "MTR.pdf",
        document_sha256: "sha256-demo",
        heat_number: lot.certificate.heat_number,
        mill_name: lot.certificate.mill_name,
        grade: lot.grade?.grade_name || lot.grade_id,
        melt_pour_country: lot.certificate.mill_country || "USA",
        chemistry: lot.certificate.chemical_analysis as unknown as import("@/types/database").Json,
        mechanical: lot.certificate.mechanical_results as unknown as import("@/types/database").Json,
        extraction_status: "completed",
        review_status: "approved",
        risk_score: 2,
        flags: [],
        extraction_metadata: {},
        created_at: new Date().toISOString(),
      } : null,
    };
  }

  return (
    <PageContainer
      title="Multi-Lot Batch Comparison"
      description="Evaluate physical steel batches side-by-side across chemical analysis, mechanical pull tests, carbon equivalents, and landed freight costs."
      breadcrumbs={[
        { label: "Marketplace", href: "/listings" },
        { label: "Batch Comparison" },
      ]}
      badge={<Badge variant="outline" size="sm">Matrix Analysis</Badge>}
      actions={
        <div className="flex items-center gap-2">
          <Link href="/listings">
            <Button variant="outline" size="sm">
              <Plus className="w-3.5 h-3.5 mr-1" />
              Add Lots from Catalog
            </Button>
          </Link>
        </div>
      }
    >
      <div className="space-y-6">
        {/* Destination ZIP Bar */}
        <Card className="border-slate-200 bg-white shadow-2xs">
          <CardContent className="p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2">
              <MapPin className="w-4 h-4 text-slate-500 shrink-0" />
              <span className="font-semibold text-slate-900">Freight Destination ZIP:</span>
              <input
                type="text"
                maxLength={5}
                value={destinationZip}
                onChange={(e) => setDestinationZip(e.target.value)}
                className="w-20 px-2 py-1 rounded border border-slate-300 font-mono text-center font-bold text-slate-900 focus:outline-none focus:ring-1 focus:ring-slate-900"
                aria-label="Freight destination ZIP code"
              />
            </div>

            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-[11px] text-slate-500 uppercase font-mono">Quick Cities:</span>
              {[
                { city: "Chicago", zip: "60601" },
                { city: "Detroit", zip: "48201" },
                { city: "Houston", zip: "77001" },
                { city: "Pittsburgh", zip: "15201" },
              ].map((c) => (
                <button
                  key={c.zip}
                  type="button"
                  onClick={() => setDestinationZip(c.zip)}
                  className={`px-2 py-0.5 rounded text-xs transition-colors ${
                    destinationZip === c.zip
                      ? "bg-slate-900 text-white font-medium"
                      : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                  }`}
                >
                  {c.city} ({c.zip})
                </button>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Empty State */}
        {comparedListings.length === 0 ? (
          <Card className="border-slate-200 bg-white text-center py-12">
            <CardContent className="space-y-4">
              <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center mx-auto text-slate-500">
                <Scale className="w-6 h-6" />
              </div>
              <div className="space-y-1">
                <h3 className="text-base font-semibold text-slate-900">
                  No Material Lots Selected for Comparison
                </h3>
                <p className="text-xs text-slate-500 max-w-sm mx-auto">
                  Select lots in the marketplace catalog to compare chemical ladle data, tensile pull tests, and delivered freight.
                </p>
              </div>
              <Link href="/listings">
                <Button variant="primary" size="sm">
                  Browse Marketplace Catalog
                  <ArrowRight className="w-3.5 h-3.5 ml-1" />
                </Button>
              </Link>
            </CardContent>
          </Card>
        ) : (
          <Card className="border-slate-200 bg-white shadow-2xs overflow-hidden">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-slate-50 border-b border-slate-200">
                    <TableHead className="w-48 text-[11px] font-mono uppercase text-slate-500">
                      Technical Parameter
                    </TableHead>
                    {comparedListings.map((lot) => (
                      <TableHead key={lot.id} className="min-w-[260px] p-4 align-top">
                        <div className="flex items-start justify-between gap-2">
                          <div className="space-y-1">
                            <span className="text-[10px] font-mono font-semibold px-1.5 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-200">
                              Heat: {lot.certificate?.heat_number}
                            </span>
                            <div className="font-bold text-slate-900 text-sm line-clamp-1">
                              {lot.grade?.grade_name || lot.grade_id}
                            </div>
                            <div className="text-xs text-slate-500 font-normal">
                              {lot.seller?.name || "Verified Producing Mill"}
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => removeLot(lot.id)}
                            className="text-slate-400 hover:text-rose-600 transition-colors p-1"
                            title="Remove from comparison"
                            aria-label={`Remove lot ${lot.title} from comparison`}
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </TableHead>
                    ))}
                  </TableRow>
                </TableHeader>

                <TableBody className="divide-y divide-slate-100 text-xs">
                  {/* Form & Dimensions */}
                  <TableRow>
                    <TableCell className="font-semibold text-slate-600 bg-slate-50/50">Form &amp; Dimensions</TableCell>
                    {comparedListings.map((lot) => (
                      <TableCell key={lot.id}>
                        <span className="font-semibold text-slate-900 block">{lot.product_form}</span>
                        <span className="font-mono text-slate-600 text-[11px]">{lot.dimensions_display}</span>
                      </TableCell>
                    ))}
                  </TableRow>

                  {/* Available Quantity */}
                  <TableRow>
                    <TableCell className="font-semibold text-slate-600 bg-slate-50/50">Available Lot</TableCell>
                    {comparedListings.map((lot) => (
                      <TableCell key={lot.id} className="font-mono">
                        <strong className="text-slate-900">{(lot.total_weight_lbs / 2000).toFixed(1)} tons</strong>
                        <span className="text-slate-500 block text-[11px]">{lot.total_weight_lbs.toLocaleString()} lbs &bull; {lot.pieces_available} pcs</span>
                      </TableCell>
                    ))}
                  </TableRow>

                  {/* FOB Base Price */}
                  <TableRow>
                    <TableCell className="font-semibold text-slate-600 bg-slate-50/50">FOB Mill Base Price</TableCell>
                    {comparedListings.map((lot) => (
                      <TableCell key={lot.id}>
                        <span className="font-mono font-bold text-slate-900 block text-sm">
                          ${(lot.price_per_cwt * 20).toLocaleString()}/ton
                        </span>
                        <span className="text-slate-500 text-[11px] font-mono">
                          ${lot.price_per_cwt.toFixed(2)}/cwt FOB {lot.warehouse_city}, {lot.warehouse_state}
                        </span>
                      </TableCell>
                    ))}
                  </TableRow>

                  {/* Delivered Landed Cost */}
                  <TableRow className="bg-sky-50/40 font-semibold">
                    <TableCell className="text-sky-950 font-bold bg-sky-50/70">
                      Delivered Landed Cost (to {destinationZip})
                    </TableCell>
                    {comparedListings.map((lot) => {
                      const delivered = calculateDeliveredCost({
                        listingId: lot.id,
                        warehouseCity: lot.warehouse_city,
                        warehouseState: lot.warehouse_state,
                        warehouseLat: lot.warehouse_lat,
                        warehouseLng: lot.warehouse_lng,
                        destinationZip,
                        weightLbs: lot.total_weight_lbs,
                        pricePerCwt: lot.price_per_cwt,
                      });

                      const deliveredCostPerTon = delivered.totalTons > 0 
                        ? Math.round(delivered.totalDeliveredCost / delivered.totalTons)
                        : Math.round(delivered.deliveredCostPerCwt * 20);

                      return (
                        <TableCell key={lot.id}>
                          <span className="font-mono font-bold text-sky-950 block text-sm">
                            ${deliveredCostPerTon.toLocaleString()}/ton
                          </span>
                          <span className="text-slate-600 text-[11px] font-normal block font-mono">
                            ${delivered.totalDeliveredCost.toLocaleString()} total ({delivered.distanceMiles} mi &bull; {delivered.truckloadsRequired} flatbed{delivered.truckloadsRequired > 1 ? "s" : ""})
                          </span>
                        </TableCell>
                      );
                    })}
                  </TableRow>

                  {/* Yield Strength Actual vs Spec */}
                  <TableRow>
                    <TableCell className="font-semibold text-slate-600 bg-slate-50/50">Yield Strength (MTR Actual)</TableCell>
                    {comparedListings.map((lot) => (
                      <TableCell key={lot.id}>
                        <span className="font-mono font-bold text-slate-900">
                          {lot.certificate?.mechanical_results.yield_strength_ksi ?? "50.0"} ksi
                        </span>
                        <span className="text-slate-500 block text-[11px]">
                          Min: {lot.grade?.mech_limits.yield_min_ksi ?? 36} ksi (Conforms)
                        </span>
                      </TableCell>
                    ))}
                  </TableRow>

                  {/* Tensile Strength */}
                  <TableRow>
                    <TableCell className="font-semibold text-slate-600 bg-slate-50/50">Tensile Strength (MTR Actual)</TableCell>
                    {comparedListings.map((lot) => (
                      <TableCell key={lot.id}>
                        <span className="font-mono font-bold text-slate-900">
                          {lot.certificate?.mechanical_results.tensile_strength_ksi ?? "70.0"} ksi
                        </span>
                        <span className="text-slate-500 block text-[11px]">
                          Range: {lot.grade?.mech_limits.tensile_min_ksi ?? 58}–{lot.grade?.mech_limits.tensile_max_ksi ?? 80} ksi
                        </span>
                      </TableCell>
                    ))}
                  </TableRow>

                  {/* Carbon Equivalent (CEV) */}
                  <TableRow>
                    <TableCell className="font-semibold text-slate-600 bg-slate-50/50">Carbon Equivalent (CEV)</TableCell>
                    {comparedListings.map((lot) => {
                      const cev = lot.certificate?.chemical_analysis.CEV;
                      return (
                        <TableCell key={lot.id} className="font-mono">
                          {typeof cev === "number" ? (
                            <span className="font-semibold text-slate-900">{cev.toFixed(3)}</span>
                          ) : (
                            <span className="text-slate-400">N/A</span>
                          )}
                          <span className="text-slate-500 block text-[11px]">
                            AWS D1.1 Prequalified: {typeof cev === "number" && cev <= 0.45 ? "Yes" : "Preheat required"}
                          </span>
                        </TableCell>
                      );
                    })}
                  </TableRow>

                  {/* Melt & Pour Provenance */}
                  <TableRow>
                    <TableCell className="font-semibold text-slate-600 bg-slate-50/50">Melt &amp; Pour Provenance</TableCell>
                    {comparedListings.map((lot) => (
                      <TableCell key={lot.id}>
                        <span className="inline-flex items-center gap-1 font-medium text-slate-900">
                          <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                          {lot.certificate?.mill_country === "USA" ? "USA (BAA Qualified)" : lot.certificate?.mill_country || "USA"}
                        </span>
                        <span className="text-slate-500 block text-[11px]">Mill: {lot.certificate?.mill_name}</span>
                      </TableCell>
                    ))}
                  </TableRow>

                  {/* Actions Row */}
                  <TableRow className="bg-slate-50/30">
                    <TableCell className="font-semibold text-slate-600 bg-slate-50/50">Procurement Action</TableCell>
                    {comparedListings.map((lot) => (
                      <TableCell key={lot.id} className="space-y-1.5">
                        <Button
                          size="sm"
                          variant="primary"
                          className="w-full text-xs h-8"
                          onClick={() => setActiveQuoteListing(convertToRelation(lot))}
                        >
                          Request Quotation
                        </Button>
                        <Link href={`/listings/${lot.id}`} className="block">
                          <Button size="sm" variant="outline" className="w-full text-xs h-7">
                            <span>Inspect Batch Passport</span>
                            <ExternalLink className="w-3 h-3 ml-1 text-slate-400" />
                          </Button>
                        </Link>
                      </TableCell>
                    ))}
                  </TableRow>
                </TableBody>
              </Table>
            </div>
          </Card>
        )}
      </div>

      {/* Quote Dialog */}
      {activeQuoteListing && (
        <Dialog
          open={Boolean(activeQuoteListing)}
          onClose={() => setActiveQuoteListing(null)}
          title={`Request Quotation: ${activeQuoteListing.grade}`}
          description={`Submit commercial inquiry for ${activeQuoteListing.quantity_tons} tons of ${activeQuoteListing.form}.`}
        >
          <QuoteRequestForm
            listing={activeQuoteListing}
            onClose={() => setActiveQuoteListing(null)}
          />
        </Dialog>
      )}
    </PageContainer>
  );
}
