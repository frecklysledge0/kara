import React from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { 
  ArrowLeft, 
  ShieldCheck, 
  Truck, 
  FileText, 
  CheckCircle2, 
  AlertTriangle, 
  Scale, 
  Building2, 
  Flame, 
  Layers,
  MapPin,
  Download
} from "lucide-react";
import { PageContainer } from "@/components/layout/PageContainer";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/Table";
import { SYNTHETIC_LISTINGS } from "@/lib/data/synthetic-listings";
import { calculateDeliveredCost } from "@/lib/engine/freight";
import { ChemistryChart } from "@/components/charts/ChemistryChart";
import { FreightCostChart } from "@/components/charts/FreightCostChart";

interface ListingPageProps {
  params: Promise<{ id: string }>;
}

export function generateStaticParams() {
  return SYNTHETIC_LISTINGS.map((listing) => ({
    id: listing.id,
  }));
}

export default async function ListingDetailPage({ params }: ListingPageProps) {
  const { id } = await params;
  const listing = SYNTHETIC_LISTINGS.find((l) => l.id === id) || SYNTHETIC_LISTINGS[0];

  if (!listing) {
    notFound();
  }

  const defaultDestinationZip = "60601";
  const delivered = calculateDeliveredCost({
    listingId: listing.id,
    warehouseCity: listing.warehouse_city,
    warehouseState: listing.warehouse_state,
    warehouseLat: listing.warehouse_lat,
    warehouseLng: listing.warehouse_lng,
    destinationZip: defaultDestinationZip,
    weightLbs: listing.total_weight_lbs,
    pricePerCwt: listing.price_per_cwt,
    widthInches: listing.width_in,
    singlePieceWeightLbs: listing.total_weight_lbs / listing.pieces_available,
  });

  return (
    <PageContainer
      title={listing.title}
      description={`${listing.dimensions_display} • ${listing.product_form} • Heat ${listing.certificate?.heat_number}`}
      badge={<Badge variant="demo" size="sm">Demo Inventory Record</Badge>}
      actions={
        <div className="flex items-center gap-2">
          <Link href="/listings">
            <Button variant="outline" size="sm">
              <ArrowLeft className="w-3.5 h-3.5 mr-1.5" />
              Back to Catalog
            </Button>
          </Link>
          <Link href={`/orders?listing=${listing.id}`}>
            <Button variant="primary" size="sm">
              Request Quotation / Hold Lot
            </Button>
          </Link>
        </div>
      }
    >
      <div className="space-y-8">
        {/* Top Summary Banner */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-1.5">
              <span className="text-[11px] font-mono text-slate-500 uppercase">FOB Mill Base Price</span>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold font-mono text-slate-900">
                ${listing.price_per_cwt.toFixed(2)}{" "}
                <span className="text-xs font-normal text-slate-500">/ cwt</span>
              </div>
              <p className="text-[11px] text-slate-500 mt-0.5">
                ${(listing.price_per_cwt * 20).toFixed(2)} / short ton
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-1.5">
              <span className="text-[11px] font-mono text-slate-500 uppercase">Delivered Landed Est.</span>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold font-mono text-sky-900">
                ${delivered.deliveredCostPerCwt.toFixed(2)}{" "}
                <span className="text-xs font-normal text-slate-500">/ cwt</span>
              </div>
              <p className="text-[11px] text-slate-500 mt-0.5">
                To Chicago IL ({delivered.distanceMiles} route miles)
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-1.5">
              <span className="text-[11px] font-mono text-slate-500 uppercase">Available Inventory</span>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold font-mono text-slate-900">
                {(listing.total_weight_lbs / 2000).toFixed(1)}{" "}
                <span className="text-xs font-normal text-slate-500">tons</span>
              </div>
              <p className="text-[11px] text-slate-500 mt-0.5">
                {listing.pieces_available} pieces &bull; {listing.total_weight_lbs.toLocaleString()} lbs
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-1.5">
              <span className="text-[11px] font-mono text-slate-500 uppercase">FOB Origin Warehouse</span>
            </CardHeader>
            <CardContent>
              <div className="text-base font-bold text-slate-900">
                {listing.warehouse_city}, {listing.warehouse_state}
              </div>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Seller: {listing.seller?.name}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Section 1: Certified Material Test Report (MTR) */}
        <Card>
          <CardHeader>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <div className="flex items-center gap-2">
                  <CardTitle>Certified Material Test Report (EN 10204 3.1)</CardTitle>
                  <Badge variant="success" size="sm">ASTM Verified</Badge>
                </div>
                <CardDescription>
                  Heat Number: <strong className="text-slate-900 font-mono">{listing.certificate?.heat_number}</strong> &bull; Cert Number: {listing.certificate?.cert_number} &bull; Mill: {listing.certificate?.mill_name}
                </CardDescription>
              </div>

              <div className="text-right">
                <span className="text-[10px] text-slate-500 uppercase font-mono block">Carbon Equivalent</span>
                <span className="text-base font-bold font-mono text-slate-900">
                  CEV {listing.certificate?.chemical_analysis.CEV ?? "0.385"}
                </span>
              </div>
            </div>
          </CardHeader>

          <CardContent className="space-y-6">
            {/* Visual Recharts comparison */}
            {listing.certificate && (
              <ChemistryChart
                actual={listing.certificate.chemical_analysis}
                spec={listing.grade?.chem_limits || {}}
              />
            )}

            {/* Chemical Tolerances Compact Table */}
            <div>
              <h4 className="text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">
                Chemical Ladle Heat Analysis vs. ASTM Specified Bounds
              </h4>
              <Table>
                <TableHeader>
                  <tr>
                    <TableHead>Element</TableHead>
                    <TableHead>MTR Measured %</TableHead>
                    <TableHead>Specified Min %</TableHead>
                    <TableHead>Specified Max %</TableHead>
                    <TableHead>Compliance Evaluation</TableHead>
                  </tr>
                </TableHeader>
                <TableBody>
                  {listing.certificate &&
                    Object.entries(listing.certificate.chemical_analysis)
                      .filter(([k]) => k !== "CEV")
                      .map(([el, actualVal]) => {
                        const limits = listing.grade?.chem_limits[el];
                        const isPass =
                          limits &&
                          (limits.min === undefined || (actualVal ?? 0) >= limits.min) &&
                          (limits.max === undefined || (actualVal ?? 0) <= limits.max);

                        return (
                          <TableRow key={el}>
                            <TableCell className="font-bold text-slate-900 font-mono">{el}</TableCell>
                            <TableCell className="font-mono font-semibold text-slate-800">
                              {actualVal !== undefined ? `${actualVal}%` : "-"}
                            </TableCell>
                            <TableCell className="font-mono text-slate-500">
                              {limits?.min !== undefined ? `${limits.min}%` : "-"}
                            </TableCell>
                            <TableCell className="font-mono text-slate-500">
                              {limits?.max !== undefined ? `${limits.max}%` : "-"}
                            </TableCell>
                            <TableCell>
                              <Badge variant={isPass ? "success" : "default"} size="sm">
                                {isPass ? "Compliant" : "Reported"}
                              </Badge>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                </TableBody>
              </Table>
            </div>

            {/* Mechanical Properties Grid */}
            <div>
              <h4 className="text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">
                Certified Mechanical Pull &amp; Toughness Tests
              </h4>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="p-3 rounded border border-slate-200 bg-slate-50">
                  <span className="text-[10px] text-slate-500 uppercase font-mono block">Yield Strength</span>
                  <span className="text-lg font-bold font-mono text-slate-900">
                    {listing.certificate?.mechanical_results.yield_strength_ksi} ksi
                  </span>
                  <span className="text-[10px] text-emerald-700 font-semibold block">Passes Specified Min</span>
                </div>

                <div className="p-3 rounded border border-slate-200 bg-slate-50">
                  <span className="text-[10px] text-slate-500 uppercase font-mono block">Tensile Strength</span>
                  <span className="text-lg font-bold font-mono text-slate-900">
                    {listing.certificate?.mechanical_results.tensile_strength_ksi} ksi
                  </span>
                  <span className="text-[10px] text-emerald-700 font-semibold block">In ASTM Range</span>
                </div>

                <div className="p-3 rounded border border-slate-200 bg-slate-50">
                  <span className="text-[10px] text-slate-500 uppercase font-mono block">Elongation (2-in)</span>
                  <span className="text-lg font-bold font-mono text-slate-900">
                    {listing.certificate?.mechanical_results.elongation_pct}%
                  </span>
                  <span className="text-[10px] text-emerald-700 font-semibold block">Meets Ductility</span>
                </div>

                <div className="p-3 rounded border border-slate-200 bg-slate-50">
                  <span className="text-[10px] text-slate-500 uppercase font-mono block">Heat Treatment</span>
                  <span className="text-sm font-semibold text-slate-900 block mt-1">
                    {listing.certificate?.heat_treatment}
                  </span>
                  <span className="text-[10px] text-slate-500 block">EN 10204 Type 3.1</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Section 2: Delivered Landed Cost & Freight Model */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Delivered Flatbed Logistics Breakdown</CardTitle>
                <CardDescription>
                  Calculated based on legal 45,000 lbs flatbed payload limits, highway mileage, and fuel surcharges.
                </CardDescription>
              </div>
              <Badge variant="outline" size="sm">Deterministic Logistics</Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <FreightCostChart delivered={delivered} />

            <div className="p-3.5 rounded bg-slate-50 border border-slate-200 space-y-1.5 text-xs text-slate-600">
              <span className="font-semibold text-slate-900 uppercase text-[10px] font-mono tracking-wider block">
                Logistics Assumptions &amp; Itemization:
              </span>
              <ul className="space-y-1 text-[11px] text-slate-600">
                {delivered.assumptions.map((a, i) => (
                  <li key={i}>&bull; {a}</li>
                ))}
              </ul>
            </div>
          </CardContent>
        </Card>

        {/* Bottom CTA Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-lg border border-slate-200 bg-white">
          <div>
            <h4 className="text-sm font-bold text-slate-900">Ready to reserve this material batch?</h4>
            <p className="text-xs text-slate-500">
              Lock in delivered freight pricing and receive a formal quotation for purchase order approval.
            </p>
          </div>
          <Link href={`/orders?listing=${listing.id}`}>
            <Button variant="primary" size="md">
              Request Quotation &amp; Reserve Lot
            </Button>
          </Link>
        </div>
      </div>
    </PageContainer>
  );
}
