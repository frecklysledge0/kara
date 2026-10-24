"use client";

import React, { useState } from "react";
import Link from "next/link";
import { 
  Search, 
  Filter, 
  Truck, 
  Scale, 
  ShieldCheck, 
  CheckCircle2, 
  MapPin, 
  ArrowRight,
  Eye,
  X
} from "lucide-react";
import { PageContainer } from "@/components/layout/PageContainer";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/Table";
import { EmptyState } from "@/components/ui/EmptyState";
import { SYNTHETIC_LISTINGS } from "@/lib/data/synthetic-listings";
import { ALL_GRADE_STANDARDS } from "@/lib/data/standards";
import { calculateDeliveredCost } from "@/lib/engine/freight";

export default function ListingsPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedGrade, setSelectedGrade] = useState("ALL");
  const [selectedForm, setSelectedForm] = useState("ALL");
  const [destinationZip, setDestinationZip] = useState("60601");
  const [viewMode, setViewMode] = useState<"table" | "cards">("cards");

  const filteredListings = SYNTHETIC_LISTINGS.filter((lot) => {
    const matchesGrade = selectedGrade === "ALL" || lot.grade_id === selectedGrade;
    const matchesForm = selectedForm === "ALL" || lot.product_form === selectedForm;
    const matchesSearch =
      lot.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      lot.dimensions_display.toLowerCase().includes(searchTerm.toLowerCase()) ||
      lot.warehouse_city.toLowerCase().includes(searchTerm.toLowerCase()) ||
      lot.certificate?.heat_number.toLowerCase().includes(searchTerm.toLowerCase());

    return matchesGrade && matchesForm && matchesSearch;
  });

  return (
    <PageContainer
      title="Material Marketplace"
      description="Available inventory lots backed by EN 10204 3.1 Mill Test Reports and delivered flatbed freight calculations."
      badge={<Badge variant="outline" size="sm">Physical Inventory</Badge>}
      actions={
        <div className="flex items-center gap-2">
          <div className="flex rounded border border-slate-200 bg-white p-0.5 text-xs">
            <button
              onClick={() => setViewMode("cards")}
              className={`px-2.5 py-1 rounded transition-colors ${
                viewMode === "cards" ? "bg-slate-900 text-white font-medium" : "text-slate-600 hover:text-slate-900"
              }`}
            >
              Cards
            </button>
            <button
              onClick={() => setViewMode("table")}
              className={`px-2.5 py-1 rounded transition-colors ${
                viewMode === "table" ? "bg-slate-900 text-white font-medium" : "text-slate-600 hover:text-slate-900"
              }`}
            >
              Table
            </button>
          </div>
        </div>
      }
    >
      <div className="space-y-6">
        {/* Filter Controls Bar */}
        <Card>
          <CardContent className="p-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {/* Search Query */}
              <Input
                placeholder="Search grade, heat, dimensions..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />

              {/* Grade Selector */}
              <Select
                value={selectedGrade}
                onChange={(e) => setSelectedGrade(e.target.value)}
              >
                <option value="ALL">All ASTM Grades</option>
                {ALL_GRADE_STANDARDS.map((g) => (
                  <option key={g.id} value={g.id}>
                    {g.grade_name}
                  </option>
                ))}
              </Select>

              {/* Product Form */}
              <Select
                value={selectedForm}
                onChange={(e) => setSelectedForm(e.target.value)}
              >
                <option value="ALL">All Product Forms</option>
                <option value="Plate">Heavy Plate</option>
                <option value="Hot Rolled Coil">Hot Rolled Coil</option>
                <option value="Wide Flange Beam">Wide Flange Beam</option>
                <option value="Round Bar">Round Bar</option>
              </Select>

              {/* Destination ZIP for delivered freight */}
              <div className="flex items-center gap-2">
                <div className="flex-1">
                  <Input
                    placeholder="ZIP Code (e.g. 60601)"
                    maxLength={5}
                    value={destinationZip}
                    onChange={(e) => setDestinationZip(e.target.value)}
                  />
                </div>
                <span className="text-[10px] text-slate-500 font-mono shrink-0">
                  Freight Dest
                </span>
              </div>
            </div>

            {(searchTerm || selectedGrade !== "ALL" || selectedForm !== "ALL") && (
              <div className="flex items-center gap-2 pt-3 mt-3 border-t border-slate-100 text-xs text-slate-600">
                <span>Active Filters:</span>
                {searchTerm && (
                  <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-800 flex items-center gap-1">
                    Query: &quot;{searchTerm}&quot;
                    <button onClick={() => setSearchTerm("")}><X className="w-3 h-3" /></button>
                  </span>
                )}
                {selectedGrade !== "ALL" && (
                  <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-800 flex items-center gap-1">
                    Grade: {selectedGrade}
                    <button onClick={() => setSelectedGrade("ALL")}><X className="w-3 h-3" /></button>
                  </span>
                )}
                {selectedForm !== "ALL" && (
                  <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-800 flex items-center gap-1">
                    Form: {selectedForm}
                    <button onClick={() => setSelectedForm("ALL")}><X className="w-3 h-3" /></button>
                  </span>
                )}
                <button
                  onClick={() => {
                    setSearchTerm("");
                    setSelectedGrade("ALL");
                    setSelectedForm("ALL");
                  }}
                  className="text-slate-700 underline text-xs ml-auto"
                >
                  Reset all
                </button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Results Header */}
        <div className="flex items-center justify-between text-xs text-slate-500 font-mono">
          <span>{filteredListings.length} material lots available &bull; Demo benchmark dataset</span>
          <span>Delivered freight to ZIP {destinationZip || "60601"}</span>
        </div>

        {/* Content View */}
        {filteredListings.length === 0 ? (
          <EmptyState
            icon={Search}
            title="No Matching Steel Lots Found"
            description="No inventory records match your specified combination of ASTM grade, form, or dimensions. Try clearing your filters."
            action={
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setSearchTerm("");
                  setSelectedGrade("ALL");
                  setSelectedForm("ALL");
                }}
              >
                Clear Search Filters
              </Button>
            }
          />
        ) : viewMode === "cards" ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredListings.map((lot) => {
              const delivered = calculateDeliveredCost({
                listingId: lot.id,
                warehouseCity: lot.warehouse_city,
                warehouseState: lot.warehouse_state,
                warehouseLat: lot.warehouse_lat,
                warehouseLng: lot.warehouse_lng,
                destinationZip: destinationZip || "60601",
                weightLbs: lot.total_weight_lbs,
                pricePerCwt: lot.price_per_cwt,
                widthInches: lot.width_in,
                singlePieceWeightLbs: lot.total_weight_lbs / lot.pieces_available
              });

              return (
                <Card key={lot.id} elevated className="flex flex-col justify-between">
                  <CardHeader>
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-200">
                        Heat: {lot.certificate?.heat_number}
                      </span>
                      <Badge variant="demo" size="sm">Demo Lot</Badge>
                    </div>
                    <CardTitle className="text-sm line-clamp-1">{lot.title}</CardTitle>
                    <CardDescription>
                      {lot.dimensions_display} &bull; {lot.product_form}
                    </CardDescription>
                  </CardHeader>

                  <CardContent className="space-y-4 pt-0">
                    {/* Commercial Pricing Grid */}
                    <div className="grid grid-cols-2 gap-2 p-2.5 rounded bg-slate-50 border border-slate-100 font-mono text-xs">
                      <div>
                        <span className="text-[10px] text-slate-500 uppercase block">FOB Base</span>
                        <span className="font-bold text-slate-900">${lot.price_per_cwt.toFixed(2)}/cwt</span>
                        <span className="text-[10px] text-slate-400 block">{lot.warehouse_city}, {lot.warehouse_state}</span>
                      </div>
                      <div>
                        <span className="text-[10px] text-sky-700 uppercase block font-semibold">Delivered Est.</span>
                        <span className="font-bold text-sky-800">${delivered.deliveredCostPerCwt.toFixed(2)}/cwt</span>
                        <span className="text-[10px] text-slate-500 block">{delivered.distanceMiles} mi &bull; {delivered.truckloadsRequired} truck</span>
                      </div>
                    </div>

                    {/* Batch mechanical preview */}
                    <div className="flex items-center justify-between text-xs text-slate-600 font-mono">
                      <span>Yield: {lot.certificate?.mechanical_results.yield_strength_ksi} ksi</span>
                      <span>Total: {(lot.total_weight_lbs / 2000).toFixed(1)} tons</span>
                      <span className="text-emerald-700 font-semibold flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3" />
                        <span>Pass</span>
                      </span>
                    </div>

                    <div className="pt-2 border-t border-slate-100">
                      <Link href={`/listings/${lot.id}`} className="w-full">
                        <Button variant="outline" size="sm" className="w-full justify-between">
                          <span>Inspect Batch Certificate</span>
                          <ArrowRight className="w-3.5 h-3.5" />
                        </Button>
                      </Link>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        ) : (
          <Table>
            <TableHeader>
              <tr>
                <TableHead>Heat Number</TableHead>
                <TableHead>Grade &amp; Specification</TableHead>
                <TableHead>Dimensions</TableHead>
                <TableHead>Weight</TableHead>
                <TableHead>Base Price</TableHead>
                <TableHead>Delivered ({destinationZip || "60601"})</TableHead>
                <TableHead>Origin</TableHead>
                <TableHead className="text-right">Action</TableHead>
              </tr>
            </TableHeader>
            <TableBody>
              {filteredListings.map((lot) => {
                const delivered = calculateDeliveredCost({
                  listingId: lot.id,
                  warehouseCity: lot.warehouse_city,
                  warehouseState: lot.warehouse_state,
                  warehouseLat: lot.warehouse_lat,
                  warehouseLng: lot.warehouse_lng,
                  destinationZip: destinationZip || "60601",
                  weightLbs: lot.total_weight_lbs,
                  pricePerCwt: lot.price_per_cwt,
                  widthInches: lot.width_in
                });

                return (
                  <TableRow key={lot.id}>
                    <TableCell className="font-mono font-semibold text-slate-900">
                      {lot.certificate?.heat_number}
                    </TableCell>
                    <TableCell>
                      <span className="font-medium text-slate-900 block">{lot.grade?.grade_name}</span>
                      <span className="text-[11px] text-slate-500">{lot.product_form}</span>
                    </TableCell>
                    <TableCell className="font-mono text-slate-700">
                      {lot.dimensions_display}
                    </TableCell>
                    <TableCell className="font-mono text-slate-700">
                      {(lot.total_weight_lbs / 2000).toFixed(1)} tons
                    </TableCell>
                    <TableCell className="font-mono font-semibold text-slate-900">
                      ${lot.price_per_cwt.toFixed(2)}/cwt
                    </TableCell>
                    <TableCell className="font-mono font-bold text-sky-800">
                      ${delivered.deliveredCostPerCwt.toFixed(2)}/cwt
                    </TableCell>
                    <TableCell className="text-slate-600">
                      {lot.warehouse_city}, {lot.warehouse_state}
                    </TableCell>
                    <TableCell className="text-right">
                      <Link href={`/listings/${lot.id}`}>
                        <Button variant="outline" size="sm">
                          Inspect
                        </Button>
                      </Link>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </div>
    </PageContainer>
  );
}
