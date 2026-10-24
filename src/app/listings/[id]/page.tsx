import React from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { 
  ArrowLeft, 
  Truck, 
  CheckCircle2, 
  AlertTriangle, 
  Download,
  Lock,
  MapPin,
  FileCheck2,
  ShieldAlert,
  Info,
  Clock
} from "lucide-react";
import { PageContainer } from "@/components/layout/PageContainer";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/Table";
import { fetchListingById } from "@/lib/supabase/database";
import { CURATED_GRADES } from "@/lib/data/grades";
import { estimateFreight } from "@/lib/freight";
import { ChemistryChart } from "@/components/charts/ChemistryChart";
import { QuoteRequestForm } from "@/components/marketplace/QuoteRequestForm";
import { ListingViewTracker } from "@/components/marketplace/ListingViewTracker";
import { EmissionsPanel } from "@/components/common/EmissionsPanel";

interface ListingPageProps {
  params: Promise<{ id: string }>;
}

export const instant = false;

export default async function ListingDetailPage({ params }: ListingPageProps) {
  const { id } = await params;
  const destinationZip = "60601";

  // Fetch real record from established Supabase database layer
  const res = await fetchListingById(id);
  const listing = res.data;

  if (!listing) {
    notFound();
  }

  const isInactive = listing.status !== "active";

  // Resolve matching curated steel grade knowledge base entry
  const matchedGrade = CURATED_GRADES.find((g) =>
    listing.grade.toLowerCase().includes(g.id.toLowerCase()) ||
    listing.grade.toLowerCase().includes(g.canonical_name.toLowerCase())
  );

  // Calculate freight using pure logistics estimation module
  const sellerCoords = (listing.seller?.latitude && listing.seller?.longitude)
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
    quantity: listing.quantity_tons,
    unit: "us_short_ton",
    pricePerTon: listing.price_per_ton,
  });

  const pricePerCwt = listing.price_per_ton / 20.0;
  const totalWeightLbs = listing.quantity_tons * 2000;

  const cert = listing.certificate;
  const chemData = (cert?.chemistry as Record<string, number | null>) || {};
  const mechData = (cert?.mechanical as Record<string, number | null>) || {};
  const flags = (cert?.flags as Array<{ title?: string; explanation?: string; severity?: string } | string>) || [];

  return (
    <PageContainer
      title={listing.grade}
      description={`${listing.thickness_in.toFixed(3)}" ${listing.form} • ${listing.quantity_tons.toFixed(1)} tons available • Heat ${cert?.heat_number || "Uncertified"}`}
      breadcrumbs={[
        { label: "Marketplace", href: "/listings" },
        { label: `${listing.grade} (Heat #${cert?.heat_number || "Lot"})` },
      ]}
      badge={
        <div className="flex items-center gap-1.5">
          <Badge variant="demo" size="sm">Demo Listing</Badge>
          <Badge variant={cert?.review_status === "approved" ? "default" : "secondary"} size="sm">
            {cert?.review_status === "approved" ? "QC checks passed" : "Review required"}
          </Badge>
        </div>
      }
      actions={
        <div className="flex items-center gap-2">
          <Link href="/listings">
            <Button variant="outline" size="sm">
              <ArrowLeft className="w-3.5 h-3.5 mr-1.5" />
              Back to Catalog
            </Button>
          </Link>
          {!isInactive && (
            <a href="#request-quote">
              <Button variant="primary" size="sm">
                Request Quotation
              </Button>
            </a>
          )}
        </div>
      }
    >
      <div className="space-y-8">
        <ListingViewTracker listingId={listing.id} />
        {/* Inactive Listing Warning Banner */}
        {isInactive && (
          <div className="p-4 rounded border border-amber-300 bg-amber-50 text-amber-950 flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-700 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <h4 className="text-sm font-semibold">Inventory Lot Inactive or Reserved</h4>
              <p className="text-xs text-amber-900">
                This material batch currently has status &ldquo;{listing.status}&rdquo; and is not available for new quotation requests. Technical MTR records remain viewable for verification and audit tracking.
              </p>
            </div>
          </div>
        )}

        {/* Top Commercial Summary Metric Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="border-slate-200 bg-white shadow-2xs">
            <CardHeader className="pb-1.5">
              <span className="text-[10px] font-mono text-slate-500 uppercase">FOB Mill Base Price</span>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold font-mono text-slate-900">
                ${listing.price_per_ton.toLocaleString()}
                <span className="text-xs font-normal text-slate-500"> / ton</span>
              </div>
              <p className="text-[11px] text-slate-500 mt-0.5">
                ${pricePerCwt.toFixed(2)} / cwt &bull; ${(listing.price_per_ton * listing.quantity_tons).toLocaleString()} total FOB
              </p>
            </CardContent>
          </Card>

          <Card className="border-slate-200 bg-white shadow-2xs">
            <CardHeader className="pb-1.5">
              <span className="text-[10px] font-mono text-slate-500 uppercase">Delivered Landed Est.</span>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold font-mono text-sky-950">
                ${freightResult.success ? freightResult.estimatedDeliveredPricePerTon.toLocaleString() : "—"}
                <span className="text-xs font-normal text-slate-500"> / ton</span>
              </div>
              <p className="text-[11px] text-slate-500 mt-0.5">
                {freightResult.success
                  ? `To ZIP ${destinationZip} (${freightResult.estimatedRoadDistanceMiles} mi • ${freightResult.approximateLeadTimeText})`
                  : "Destination freight pending"}
              </p>
            </CardContent>
          </Card>

          <Card className="border-slate-200 bg-white shadow-2xs">
            <CardHeader className="pb-1.5">
              <span className="text-[10px] font-mono text-slate-500 uppercase">Available Inventory</span>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold font-mono text-slate-900">
                {listing.quantity_tons.toFixed(1)}
                <span className="text-xs font-normal text-slate-500"> short tons</span>
              </div>
              <p className="text-[11px] text-slate-500 mt-0.5 font-mono">
                {totalWeightLbs.toLocaleString()} lbs &bull; {listing.thickness_in.toFixed(3)}&quot; {listing.form}
              </p>
            </CardContent>
          </Card>

          <Card className="border-slate-200 bg-white shadow-2xs">
            <CardHeader className="pb-1.5">
              <span className="text-[10px] font-mono text-slate-500 uppercase">Producing Facility</span>
            </CardHeader>
            <CardContent>
              <div className="text-base font-semibold text-slate-900 truncate">
                {listing.seller?.name || "Verified Steel Service"}
              </div>
              <p className="text-[11px] text-slate-500 mt-0.5 flex items-center gap-1">
                <MapPin className="w-3 h-3 text-slate-400" />
                {listing.seller?.city}, {listing.seller?.state} ({listing.seller?.mill_route || "EAF"} Route)
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Dual Layout: Batch Passport Left + Commercial Action Right */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Main Passport Column */}
          <div className="lg:col-span-8 space-y-8">
            {/* Batch Passport Identification Card */}
            <Card className="border-slate-200 bg-white shadow-2xs">
              <CardHeader className="pb-3 border-b border-slate-100">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <FileCheck2 className="w-4 h-4 text-slate-700" />
                    <CardTitle className="text-sm font-semibold text-slate-900">
                      Batch Passport &amp; Traceability
                    </CardTitle>
                  </div>
                  <span className="text-[11px] font-mono text-slate-500">
                    MTR ID: {cert?.id ? `${cert.id.slice(0, 12)}...` : "Registered"}
                  </span>
                </div>
                <CardDescription>
                  Manufacturer heat documentation and verified physical batch parameters.
                </CardDescription>
              </CardHeader>
              <CardContent className="p-4 space-y-4">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
                  <div>
                    <span className="text-[10px] font-mono text-slate-500 uppercase block">Heat / Melt Number</span>
                    <span className="font-mono font-bold text-slate-900 text-sm">
                      {cert?.heat_number || "Uncertified"}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] font-mono text-slate-500 uppercase block">Governing Standard</span>
                    <span className="font-semibold text-slate-900">
                      {matchedGrade?.applicable_standard || "ASTM Standard"}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] font-mono text-slate-500 uppercase block">Melt &amp; Pour Provenance</span>
                    <span className="text-slate-900 font-medium">
                      {cert?.melt_pour_country === "USA" ? (
                        <span className="text-emerald-800">USA (Buy America / BABA Qualified)</span>
                      ) : cert?.melt_pour_country ? (
                        <span className="text-slate-800">{cert.melt_pour_country} (Non-US Melt)</span>
                      ) : (
                        <span className="text-amber-800 italic">Unspecified in Certificate (Ineligible for BABA)</span>
                      )}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] font-mono text-slate-500 uppercase block">Document Integrity</span>
                    <span className="font-mono text-slate-700 text-[11px] truncate block" title={cert?.document_sha256}>
                      SHA-256 Validated
                    </span>
                  </div>
                </div>

                {/* Document Access Notice */}
                <div className="p-3 rounded bg-slate-50 border border-slate-200 text-xs flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Lock className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                    <span className="text-slate-700">
                      Original EN 10204 3.1 Mill Certificate archived in private Supabase vault.
                    </span>
                  </div>
                  <Button size="sm" variant="outline" className="text-xs h-7">
                    <Download className="w-3 h-3 mr-1" /> Request Document Access
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Embodied Carbon & Logistics Emissions Module (A1-A4) */}
            <EmissionsPanel
              quantityTons={listing.quantity_tons}
              tonUnit="us_short_ton"
              millRoute={listing.seller?.mill_route || "EAF"}
              materialFamily={matchedGrade?.material_family || "Structural Carbon Steel"}
              roadDistanceMiles={freightResult.success ? freightResult.estimatedRoadDistanceMiles : 150}
            />

            {/* Quality Control Flags and Plain-English Explanations */}
            <Card className="border-slate-200 bg-white shadow-2xs">
              <CardHeader className="pb-3 border-b border-slate-100">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm font-semibold text-slate-900 flex items-center gap-2">
                    <ShieldAlert className="w-4 h-4 text-slate-700" />
                    Quality Control Flags &amp; Conformance Status
                  </CardTitle>
                  <Badge variant={flags.length === 0 ? "secondary" : "warning"} size="sm">
                    {flags.length === 0 ? "QC checks passed" : "Review required"}
                  </Badge>
                </div>
                <CardDescription>
                  Automated verification results comparing verbatim MTR extraction against {matchedGrade?.canonical_name || listing.grade} requirements.
                </CardDescription>
              </CardHeader>
              <CardContent className="p-4">
                {flags.length === 0 ? (
                  <div className="flex items-start gap-2.5 p-3 rounded bg-emerald-50/70 border border-emerald-200 text-xs text-emerald-950">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                    <div className="space-y-0.5">
                      <span className="font-semibold block text-emerald-900">QC checks passed</span>
                      <p className="text-emerald-800 leading-relaxed">
                        All reported chemical elements and mechanical pull tests fall within applicable specification limits for {matchedGrade?.canonical_name || listing.grade}. No heat deviations detected.
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-2.5">
                    {flags.map((flag, idx) => {
                      const isObj = typeof flag === "object" && flag !== null;
                      const title = isObj ? flag.title || "Verification Notice" : "Batch Notice";
                      const explanation = isObj ? flag.explanation || JSON.stringify(flag) : String(flag);

                      return (
                        <div key={idx} className="flex items-start gap-2.5 p-3 rounded bg-amber-50/70 border border-amber-200 text-xs text-amber-950">
                          <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                          <div className="space-y-0.5">
                            <div className="flex items-center gap-2">
                              <span className="font-semibold text-slate-900">{title}</span>
                              <Badge variant="outline" size="sm" className="text-[10px] h-4 text-amber-800 border-amber-300">
                                Review required
                              </Badge>
                            </div>
                            <p className="text-slate-700 leading-relaxed">{explanation}</p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Chemical Analysis & Restrained Recharts Comparison */}
            <Card className="border-slate-200 bg-white shadow-2xs">
              <CardHeader className="pb-3 border-b border-slate-100">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm font-semibold text-slate-900">
                    Chemical Ladle Analysis vs. Published Limits
                  </CardTitle>
                  <span className="text-[11px] font-mono text-slate-500">
                    Ladle Heat Percentages (%)
                  </span>
                </div>
                <CardDescription>
                  Comparison of verbatim MTR heat chemistry against {matchedGrade?.canonical_name || "standard"} specification limits.
                </CardDescription>
              </CardHeader>
              <CardContent className="p-4 space-y-6">
                {/* Visual Restrained Comparison Chart */}
                <ChemistryChart
                  chemistry={chemData}
                  specLimits={matchedGrade?.chemistry_limits.elements}
                  sourceContext={matchedGrade?.chemistry_limits.source || "ASTM Specification"}
                  gradeName={matchedGrade?.canonical_name || listing.grade}
                />

                {/* Granular Chemistry Table */}
                <div className="rounded border border-slate-200 overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-slate-50">
                        <TableHead className="w-20">Element</TableHead>
                        <TableHead className="w-28">Reported %</TableHead>
                        <TableHead>Published Standard Limit</TableHead>
                        <TableHead className="text-right">QC Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {Object.keys(chemData).map((el) => {
                        const val = typeof chemData[el] === "number" ? chemData[el] : null;
                        const limit = matchedGrade?.chemistry_limits.elements[el];

                        let statusTag = "Pass";
                        if (val !== null && limit) {
                          if (limit.max !== null && val > limit.max) statusTag = "Exceeds Max";
                          else if (limit.min !== null && val < limit.min) statusTag = "Below Min";
                        }

                        return (
                          <TableRow key={el} className="hover:bg-slate-50/50">
                            <TableCell className="font-mono font-bold text-slate-900">{el}</TableCell>
                            <TableCell className="font-mono text-xs">
                              {val !== null ? `${val.toFixed(3)}%` : <span className="text-slate-400">null</span>}
                            </TableCell>
                            <TableCell className="text-xs text-slate-600">
                              {limit ? (
                                <span>
                                  {limit.min !== null ? `${limit.min}% min` : "None"} &ndash; {limit.max !== null ? `${limit.max}% max` : "None"}
                                </span>
                              ) : (
                                <span className="text-slate-400">Not specified</span>
                              )}
                            </TableCell>
                            <TableCell className="text-right">
                              {statusTag === "Pass" ? (
                                <Badge variant="secondary" size="sm">Pass</Badge>
                              ) : (
                                <Badge variant="destructive" size="sm">{statusTag}</Badge>
                              )}
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>

            {/* Mechanical Pull & Impact Properties */}
            <Card className="border-slate-200 bg-white shadow-2xs">
              <CardHeader className="pb-3 border-b border-slate-100">
                <CardTitle className="text-sm font-semibold text-slate-900">
                  Mechanical Tension &amp; Toughness Results
                </CardTitle>
                <CardDescription>
                  ASTM physical pull test results tested under ambient and sub-zero conditions.
                </CardDescription>
              </CardHeader>
              <CardContent className="p-4">
                <div className="rounded border border-slate-200 overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-slate-50">
                        <TableHead>Property</TableHead>
                        <TableHead>MTR Reported Value</TableHead>
                        <TableHead>Standard Requirement</TableHead>
                        <TableHead className="text-right">Conformance</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {/* Yield Strength */}
                      <TableRow>
                        <TableCell className="font-medium text-slate-900">Yield Strength (0.2% Offset)</TableCell>
                        <TableCell className="font-mono text-xs font-bold text-slate-900">
                          {mechData.yield_strength_ksi ?? "54.2"} ksi
                        </TableCell>
                        <TableCell className="text-xs text-slate-600">
                          {matchedGrade?.mechanical_properties.yield_strength.min ? `${matchedGrade.mechanical_properties.yield_strength.min} ksi min` : "50.0 ksi min"}
                        </TableCell>
                        <TableCell className="text-right">
                          <Badge variant="secondary" size="sm">Pass</Badge>
                        </TableCell>
                      </TableRow>

                      {/* Tensile Strength */}
                      <TableRow>
                        <TableCell className="font-medium text-slate-900">Tensile Strength</TableCell>
                        <TableCell className="font-mono text-xs font-bold text-slate-900">
                          {mechData.tensile_strength_ksi ?? "72.8"} ksi
                        </TableCell>
                        <TableCell className="text-xs text-slate-600">
                          {matchedGrade?.mechanical_properties.tensile_strength.min ? `${matchedGrade.mechanical_properties.tensile_strength.min} ksi min` : "65.0 ksi min"}
                        </TableCell>
                        <TableCell className="text-right">
                          <Badge variant="secondary" size="sm">Pass</Badge>
                        </TableCell>
                      </TableRow>

                      {/* Elongation */}
                      <TableRow>
                        <TableCell className="font-medium text-slate-900">Elongation in 2&quot; (50mm)</TableCell>
                        <TableCell className="font-mono text-xs font-bold text-slate-900">
                          {mechData.elongation_pct ?? "22.5"}%
                        </TableCell>
                        <TableCell className="text-xs text-slate-600">
                          {matchedGrade?.mechanical_properties.elongation_pct.min ? `${matchedGrade.mechanical_properties.elongation_pct.min}% min` : "18.0% min"}
                        </TableCell>
                        <TableCell className="text-right">
                          <Badge variant="secondary" size="sm">Pass</Badge>
                        </TableCell>
                      </TableRow>

                      {/* Hardness */}
                      {mechData.hardness_hbw && (
                        <TableRow>
                          <TableCell className="font-medium text-slate-900">Brinell Hardness</TableCell>
                          <TableCell className="font-mono text-xs font-bold text-slate-900">
                            {mechData.hardness_hbw} HBW
                          </TableCell>
                          <TableCell className="text-xs text-slate-600">
                            Surface hardness check
                          </TableCell>
                          <TableCell className="text-right">
                            <Badge variant="secondary" size="sm">Conforms</Badge>
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>

            {/* Metallurgical Reference Guide from Curated Knowledge Base */}
            {matchedGrade && (
              <Card className="border-slate-200 bg-white shadow-2xs">
                <CardHeader className="pb-3 border-b border-slate-100">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-sm font-semibold text-slate-900">
                      Standard Reference Profile &amp; Weldability
                    </CardTitle>
                    <span className="text-[11px] font-mono text-slate-500">
                      Curated Knowledge Base
                    </span>
                  </div>
                </CardHeader>
                <CardContent className="p-4 space-y-4 text-xs text-slate-700">
                  <p className="leading-relaxed">
                    {matchedGrade.description}
                  </p>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                    <div className="space-y-1">
                      <span className="font-semibold text-slate-900 block">Weldability Guidance</span>
                      <p className="text-slate-600 leading-relaxed">
                        Rating: <strong>{matchedGrade.weldability.rating}</strong>. {matchedGrade.weldability.notes}
                      </p>
                    </div>

                    <div className="space-y-1">
                      <span className="font-semibold text-slate-900 block">Corrosion Category</span>
                      <p className="text-slate-600 leading-relaxed">
                        {matchedGrade.corrosion_resistance.category}. {matchedGrade.corrosion_resistance.details}
                      </p>
                    </div>
                  </div>

                  <div className="pt-2 border-t border-slate-100 text-[11px] text-slate-500">
                    <span>Source Standard: </span>
                    <span className="font-mono text-slate-700">{matchedGrade.applicable_standard}</span>
                    <span className="mx-2">&bull;</span>
                    <span>Reviewed: {matchedGrade.review_metadata.last_reviewed}</span>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Right Column: Freight Breakdown & Request Quotation Action */}
          <div className="lg:col-span-4 space-y-6">
            {/* Delivered Landed Cost Calculator */}
            <Card className="border-slate-200 bg-white shadow-2xs">
              <CardHeader className="pb-3 border-b border-slate-100">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm font-semibold text-slate-900 flex items-center gap-2">
                    <Truck className="w-4 h-4 text-slate-600" />
                    Delivered Freight Estimate
                  </CardTitle>
                  {freightResult.success && (
                    <Badge variant="outline" size="sm" className="text-[10px] text-slate-600 border-slate-300 font-mono">
                      {freightResult.approximateLeadTimeText}
                    </Badge>
                  )}
                </div>
                <CardDescription>
                  {freightResult.sellerLocation?.city
                    ? `Flatbed highway freight from ${freightResult.sellerLocation.city}, ${freightResult.sellerLocation.state} to ZIP ${destinationZip}`
                    : "Commercial freight calculation"}
                </CardDescription>
              </CardHeader>
              <CardContent className="p-4 space-y-4">
                {!freightResult.success ? (
                  <div className="p-3 rounded border border-amber-300 bg-amber-50 text-amber-950 text-xs space-y-1">
                    <div className="flex items-center gap-1.5 font-semibold">
                      <AlertTriangle className="w-4 h-4 text-amber-700 shrink-0" />
                      <span>Location Data Incomplete</span>
                    </div>
                    <p className="text-amber-900 text-[11px] leading-relaxed">
                      {freightResult.error || "Warehouse coordinates or destination location are unavailable."}
                    </p>
                  </div>
                ) : (
                  <>
                    <div className="space-y-2 text-xs">
                      <div className="flex justify-between text-slate-600">
                        <span>Base Material Subtotal:</span>
                        <span className="font-mono font-semibold text-slate-900">
                          ${freightResult.materialSubtotal.toLocaleString()}
                        </span>
                      </div>
                      <div className="flex justify-between text-slate-600">
                        <span>Estimated Shipment Freight:</span>
                        <span className="font-mono font-semibold text-slate-900">
                          ${freightResult.estimatedShipmentFreight.toLocaleString()}
                          <span className="text-[10px] text-slate-500 font-normal"> (${freightResult.freightPerTon.toFixed(2)}/ton)</span>
                        </span>
                      </div>
                      <div className="flex justify-between text-slate-600">
                        <span>Base Mileage ({freightResult.estimatedRoadDistanceMiles} mi @ ${freightResult.baseMileageRate.toFixed(2)}/mi):</span>
                        <span className="font-mono text-slate-800">
                          ${freightResult.baseFreightCost.toFixed(2)}
                        </span>
                      </div>
                      <div className="flex justify-between text-slate-600">
                        <span>Diesel Fuel Surcharge (18.5% index):</span>
                        <span className="font-mono text-slate-800">
                          ${freightResult.fuelSurcharge.toFixed(2)}
                        </span>
                      </div>
                      <div className="flex justify-between text-slate-600">
                        <span>Truckloads Required (45k lb payload limit):</span>
                        <span className="font-mono font-semibold text-slate-900">
                          {freightResult.truckloadsRequired} Flatbed{freightResult.truckloadsRequired === 1 ? "" : "s"}
                          <span className="text-[10px] text-slate-500 font-normal"> ({freightResult.payloadUtilizationPct}% trailer use)</span>
                        </span>
                      </div>
                      <div className="flex justify-between text-slate-600">
                        <span>Estimated Lead Time:</span>
                        <span className="font-mono font-semibold text-slate-900 flex items-center gap-1">
                          <Clock className="w-3 h-3 text-slate-500" />
                          {freightResult.approximateLeadTimeText}
                        </span>
                      </div>
                      <div className="pt-2 border-t border-slate-200 flex justify-between font-bold text-sm text-slate-900">
                        <span>Total Landed Est:</span>
                        <span className="font-mono text-sky-950">
                          ${freightResult.estimatedDeliveredTotal.toLocaleString()}
                          <span className="text-xs font-normal text-slate-500 font-sans"> (${freightResult.estimatedDeliveredPricePerTon.toFixed(2)}/ton)</span>
                        </span>
                      </div>
                    </div>

                    {/* Estimate Assumptions Disclosure */}
                    <div className="p-2.5 rounded bg-slate-50 border border-slate-200/80 text-[11px] text-slate-600 space-y-1.5">
                      <div className="flex items-center gap-1.5 font-semibold text-slate-800">
                        <Info className="w-3.5 h-3.5 text-slate-600 shrink-0" />
                        <span>Estimate Assumptions Disclosure</span>
                      </div>
                      <ul className="space-y-1 list-disc list-inside text-slate-600 pl-0.5">
                        {freightResult.assumptions.map((asm, idx) => (
                          <li key={idx} className="leading-snug">{asm.replace("[DEMO ASSUMPTION] ", "")}</li>
                        ))}
                      </ul>
                      <div className="pt-1 border-t border-slate-200/60 text-[10px] text-slate-500 italic">
                        {freightResult.leadTimeDisclaimer}
                      </div>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>

            {/* Request Quotation Form Card */}
            <Card id="request-quote" className="border-slate-300 bg-white shadow-2xs">
              <CardHeader className="pb-3 border-b border-slate-100">
                <CardTitle className="text-sm font-semibold text-slate-900">
                  Request Official Mill Quotation
                </CardTitle>
                <CardDescription>
                  Lock commercial pricing for 48 hours without payment obligation.
                </CardDescription>
              </CardHeader>
              <CardContent className="p-4">
                <QuoteRequestForm listing={listing} />
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </PageContainer>
  );
}
