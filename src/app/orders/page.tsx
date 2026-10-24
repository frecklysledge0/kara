"use client";

import React, { useState, useMemo, Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  FileText,
  Search,
  Filter,
  Truck,
  ShieldCheck,
  CheckCircle2,
  Clock,
  ArrowRight,
  Plus,
  Layers,
  Building2,
  AlertTriangle,
  Download,
  FileCheck
} from "lucide-react";
import { PageContainer } from "@/components/layout/PageContainer";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/Table";
import { Dialog } from "@/components/ui/Dialog";
import { EmptyState } from "@/components/ui/EmptyState";
import { Skeleton } from "@/components/ui/Skeleton";
import { SYNTHETIC_LISTINGS } from "@/lib/data/synthetic-listings";

interface ProcurementOrder {
  id: string;
  type: "RFQ" | "QUOTE" | "PURCHASE_ORDER";
  status: "UNDER_REVIEW" | "QUOTED" | "CONFIRMED" | "DISPATCHED";
  createdDate: string;
  validUntil?: string;
  buyerName: string;
  sellerName: string;
  listingId: string;
  gradeName: string;
  productForm: string;
  dimensions: string;
  heatNumber: string;
  mtrStatus: "PASS" | "FLAGGED";
  quantityDisplay: string;
  totalWeightLbs: number;
  originLocation: string;
  destinationCity: string;
  destinationZip: string;
  baseMaterialCost: number;
  estimatedFreight: number;
  fuelSurcharge: number;
  totalDeliveredCost: number;
  deliveredCostPerCwt: number;
  trackingNumber?: string;
  notes?: string;
}

const INITIAL_ORDERS: ProcurementOrder[] = [
  {
    id: "PO-2026-104",
    type: "PURCHASE_ORDER",
    status: "DISPATCHED",
    createdDate: "2026-10-21",
    buyerName: "Midwest Heavy Infrastructure LLC",
    sellerName: "Great Lakes Steel Service",
    listingId: "lot-a572-01",
    gradeName: "ASTM A572 Grade 50",
    productForm: "Plate",
    dimensions: '0.750" x 96" x 240"',
    heatNumber: "H-784291",
    mtrStatus: "PASS",
    quantityDisplay: "10 plates (49,002 lbs / 24.5 tons)",
    totalWeightLbs: 49002,
    originLocation: "Gary, IN",
    destinationCity: "Chicago, IL",
    destinationZip: "60601",
    baseMaterialCost: 26461.08,
    estimatedFreight: 1850.00,
    fuelSurcharge: 277.50,
    totalDeliveredCost: 28588.58,
    deliveredCostPerCwt: 58.34,
    trackingNumber: "BOL-GLS-99104",
    notes: "Flatbed dispatched 2026-10-23. Driver assigned with certified digital MTR on file."
  },
  {
    id: "PO-2026-098",
    type: "PURCHASE_ORDER",
    status: "CONFIRMED",
    createdDate: "2026-10-18",
    buyerName: "Apex Pressure Vessel Fabricators",
    sellerName: "Gulf Coast Energy Metals",
    listingId: "lot-a516-01",
    gradeName: "ASTM A516 Grade 70",
    productForm: "Plate",
    dimensions: '1.250" x 120" x 360"',
    heatNumber: "H-918204",
    mtrStatus: "PASS",
    quantityDisplay: "4 plates (61,250 lbs / 30.6 tons)",
    totalWeightLbs: 61250,
    originLocation: "Houston, TX",
    destinationCity: "Corpus Christi, TX",
    destinationZip: "78401",
    baseMaterialCost: 41650.00,
    estimatedFreight: 2420.00,
    fuelSurcharge: 363.00,
    totalDeliveredCost: 44433.00,
    deliveredCostPerCwt: 72.54,
    notes: "Batch staging complete. Undergoing standard warehouse pre-shipment tagging."
  },
  {
    id: "QUO-2026-052",
    type: "QUOTE",
    status: "QUOTED",
    createdDate: "2026-10-22",
    validUntil: "2026-11-05",
    buyerName: "Keystone Commercial Constructors",
    sellerName: "Allegheny Structural Plate",
    listingId: "lot-a992-01",
    gradeName: "ASTM A992",
    productForm: "Wide Flange Beam",
    dimensions: "W14 x 90 x 40'",
    heatNumber: "H-441092",
    mtrStatus: "PASS",
    quantityDisplay: "10 pieces (36,000 lbs / 18.0 tons)",
    totalWeightLbs: 36000,
    originLocation: "Pittsburgh, PA",
    destinationCity: "Cleveland, OH",
    destinationZip: "44114",
    baseMaterialCost: 20520.00,
    estimatedFreight: 1450.00,
    fuelSurcharge: 217.50,
    totalDeliveredCost: 22187.50,
    deliveredCostPerCwt: 61.63,
    notes: "Binding quotation locked for 14 calendar days. Guaranteed EN 10204 3.1 documentation."
  },
  {
    id: "RFQ-2026-031",
    type: "RFQ",
    status: "UNDER_REVIEW",
    createdDate: "2026-10-23",
    buyerName: "Great Lakes Bio-Refining Ltd",
    sellerName: "Midwest Stainless & Alloy Co",
    listingId: "lot-316l-01",
    gradeName: "ASTM A240 Type 316L",
    productForm: "Plate",
    dimensions: '0.500" x 72" x 240"',
    heatNumber: "H-316882",
    mtrStatus: "PASS",
    quantityDisplay: "10 plates (24,520 lbs / 12.3 tons)",
    totalWeightLbs: 24520,
    originLocation: "Chicago, IL",
    destinationCity: "Indianapolis, IN",
    destinationZip: "46204",
    baseMaterialCost: 46588.00,
    estimatedFreight: 1320.00,
    fuelSurcharge: 198.00,
    totalDeliveredCost: 48106.00,
    deliveredCostPerCwt: 196.19,
    notes: "Buyer requested expedited freight carrier option with tarped flatbed protect."
  }
];

function OrdersContent() {
  const searchParams = useSearchParams();
  const listingParam = searchParams.get("listing");

  const [orders, setOrders] = useState<ProcurementOrder[]>(INITIAL_ORDERS);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [typeFilter, setTypeFilter] = useState("ALL");
  const [selectedOrder, setSelectedOrder] = useState<ProcurementOrder | null>(null);

  // New RFQ Modal State
  const [rfqModalOpen, setRfqModalOpen] = useState(() => Boolean(listingParam));
  const [rfqTargetListing, setRfqTargetListing] = useState<string>(() => listingParam || "lot-a572-01");
  const [rfqDestinationZip, setRfqDestinationZip] = useState("60601");
  const [rfqNotes, setRfqNotes] = useState("");
  const [rfqCreatedSuccess, setRfqCreatedSuccess] = useState(false);

  const filteredOrders = useMemo(() => {
    return orders.filter((o) => {
      const matchesStatus = statusFilter === "ALL" || o.status === statusFilter;
      const matchesType = typeFilter === "ALL" || o.type === typeFilter;
      const matchesSearch =
        o.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
        o.gradeName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        o.heatNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
        o.sellerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        o.buyerName.toLowerCase().includes(searchTerm.toLowerCase());

      return matchesStatus && matchesType && matchesSearch;
    });
  }, [orders, statusFilter, typeFilter, searchTerm]);

  function handleCreateRfq(e: React.FormEvent) {
    e.preventDefault();
    const targetLot = SYNTHETIC_LISTINGS.find((l) => l.id === rfqTargetListing) || SYNTHETIC_LISTINGS[0];

    const newRfq: ProcurementOrder = {
      id: `RFQ-2026-${Math.floor(100 + Math.random() * 900)}`,
      type: "RFQ",
      status: "UNDER_REVIEW",
      createdDate: "2026-10-24",
      buyerName: "Industrial Procurement Group (Demo)",
      sellerName: targetLot.seller?.name || "Verified Steel Service Center",
      listingId: targetLot.id,
      gradeName: targetLot.grade?.grade_name || "ASTM Standard Grade",
      productForm: targetLot.product_form,
      dimensions: targetLot.dimensions_display,
      heatNumber: targetLot.certificate?.heat_number || "H-Pending",
      mtrStatus: "PASS",
      quantityDisplay: `${targetLot.pieces_available} pcs (${(targetLot.total_weight_lbs / 2000).toFixed(1)} tons)`,
      totalWeightLbs: targetLot.total_weight_lbs,
      originLocation: `${targetLot.warehouse_city}, ${targetLot.warehouse_state}`,
      destinationCity: "Site Delivery",
      destinationZip: rfqDestinationZip,
      baseMaterialCost: (targetLot.total_weight_lbs / 100) * targetLot.price_per_cwt,
      estimatedFreight: 1650.00,
      fuelSurcharge: 247.50,
      totalDeliveredCost: (targetLot.total_weight_lbs / 100) * targetLot.price_per_cwt + 1897.50,
      deliveredCostPerCwt: targetLot.price_per_cwt + 3.87,
      notes: rfqNotes || "Formal delivered quotation requested via MillProof."
    };

    setOrders([newRfq, ...orders]);
    setRfqCreatedSuccess(true);
    setTimeout(() => {
      setRfqModalOpen(false);
      setRfqCreatedSuccess(false);
    }, 1200);
  }

  function getStatusBadge(status: ProcurementOrder["status"]) {
    switch (status) {
      case "DISPATCHED":
        return (
          <Badge variant="default" size="sm">
            <Truck className="w-3 h-3 text-slate-700" />
            <span>Dispatched</span>
          </Badge>
        );
      case "CONFIRMED":
        return (
          <Badge variant="success" size="sm">
            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
            <span>Lot Confirmed</span>
          </Badge>
        );
      case "QUOTED":
        return (
          <Badge variant="secondary" size="sm">
            <Clock className="w-3 h-3 text-sky-700" />
            <span>Quote Issued</span>
          </Badge>
        );
      case "UNDER_REVIEW":
        return (
          <Badge variant="warning" size="sm">
            <Clock className="w-3 h-3 text-amber-700" />
            <span>Under Review</span>
          </Badge>
        );
    }
  }

  return (
    <PageContainer
      title="Orders & Quotations"
      description="Track steel lot reservations, formal delivered freight quotes, and certified MTR release packages."
      badge={<Badge variant="outline" size="sm">Buyer Operations</Badge>}
      actions={
        <div className="flex items-center gap-2">
          <Link href="/listings">
            <Button variant="outline" size="sm">
              <Search className="w-3.5 h-3.5 mr-1" />
              Browse Materials
            </Button>
          </Link>
          <Button
            variant="primary"
            size="sm"
            onClick={() => {
              setRfqTargetListing("lot-a572-01");
              setRfqModalOpen(true);
            }}
          >
            <Plus className="w-3.5 h-3.5 mr-1" />
            Create Request (RFQ)
          </Button>
        </div>
      }
    >
      <div className="space-y-6">
        {/* Metric Summary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between text-slate-500">
                <span className="text-xs font-medium uppercase tracking-wider">Active Inquiries</span>
                <Clock className="w-4 h-4 text-slate-400" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold font-mono text-slate-900">
                {orders.filter((o) => o.status === "UNDER_REVIEW").length}
              </div>
              <p className="text-[11px] text-slate-500 mt-1">Awaiting seller freight rate lock</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between text-slate-500">
                <span className="text-xs font-medium uppercase tracking-wider">Binding Quotes</span>
                <FileCheck className="w-4 h-4 text-sky-600" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold font-mono text-slate-900">
                {orders.filter((o) => o.status === "QUOTED").length}
              </div>
              <p className="text-[11px] text-slate-500 mt-1">Guaranteed pricing ready for PO</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between text-slate-500">
                <span className="text-xs font-medium uppercase tracking-wider">Confirmed Lots</span>
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold font-mono text-slate-900">
                {orders.filter((o) => o.status === "CONFIRMED" || o.status === "DISPATCHED").length}
              </div>
              <p className="text-[11px] text-slate-500 mt-1">Material reserved or en route</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between text-slate-500">
                <span className="text-xs font-medium uppercase tracking-wider">Tonnage On Order</span>
                <Layers className="w-4 h-4 text-slate-400" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold font-mono text-slate-900">
                {(orders.reduce((acc, curr) => acc + curr.totalWeightLbs, 0) / 2000).toFixed(1)}{" "}
                <span className="text-xs font-normal text-slate-500">tons</span>
              </div>
              <p className="text-[11px] text-slate-500 mt-1">Across structural &amp; PVQ grades</p>
            </CardContent>
          </Card>
        </div>

        {/* Filter Controls */}
        <Card>
          <CardContent className="p-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <Input
                placeholder="Search reference #, grade, heat #, supplier..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />

              <Select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
              >
                <option value="ALL">All Statuses</option>
                <option value="UNDER_REVIEW">Under Review</option>
                <option value="QUOTED">Quote Issued</option>
                <option value="CONFIRMED">Lot Confirmed</option>
                <option value="DISPATCHED">Dispatched</option>
              </Select>

              <Select
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
              >
                <option value="ALL">All Document Types</option>
                <option value="RFQ">Requests for Quotation (RFQ)</option>
                <option value="QUOTE">Binding Quotes</option>
                <option value="PURCHASE_ORDER">Purchase Orders (PO)</option>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Orders Table */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <CardTitle>Procurement Records</CardTitle>
                  <Badge variant="demo" size="sm">Demo Data</Badge>
                </div>
                <CardDescription>
                  Review line items, certified chemical heat numbers, and binding delivered freight.
                </CardDescription>
              </div>
              <span className="text-xs font-mono text-slate-500">
                {filteredOrders.length} record{filteredOrders.length === 1 ? "" : "s"}
              </span>
            </div>
          </CardHeader>

          <CardContent className="p-0">
            {filteredOrders.length === 0 ? (
              <div className="py-12">
                <EmptyState
                  icon={FileText}
                  title="No matching procurement records"
                  description="Adjust your search filters or create a new Request for Quotation (RFQ)."
                  action={
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setSearchTerm("");
                        setStatusFilter("ALL");
                        setTypeFilter("ALL");
                      }}
                    >
                      Clear Filters
                    </Button>
                  }
                />
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <tr>
                    <TableHead>Reference</TableHead>
                    <TableHead>Specification &amp; Dimensions</TableHead>
                    <TableHead>Heat &amp; MTR</TableHead>
                    <TableHead>Quantity</TableHead>
                    <TableHead>Destination</TableHead>
                    <TableHead>Delivered Total</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </tr>
                </TableHeader>
                <TableBody>
                  {filteredOrders.map((order) => (
                    <TableRow key={order.id}>
                      <TableCell className="font-mono font-semibold text-slate-900">
                        <div>{order.id}</div>
                        <div className="text-[10px] text-slate-500 font-sans">{order.createdDate}</div>
                      </TableCell>
                      <TableCell>
                        <span className="font-medium text-slate-900 block">{order.gradeName}</span>
                        <span className="text-[11px] text-slate-500 font-mono">
                          {order.dimensions}
                        </span>
                      </TableCell>
                      <TableCell>
                        <span className="font-mono text-slate-800 text-xs block">
                          {order.heatNumber}
                        </span>
                        <span className="text-[10px] text-emerald-700 flex items-center gap-1">
                          <CheckCircle2 className="w-2.5 h-2.5" />
                          <span>EN 10204 3.1</span>
                        </span>
                      </TableCell>
                      <TableCell className="font-mono text-slate-700 text-xs">
                        {order.quantityDisplay}
                      </TableCell>
                      <TableCell className="text-slate-600 text-xs">
                        <div>{order.destinationCity}</div>
                        <div className="text-[10px] font-mono text-slate-500">ZIP {order.destinationZip}</div>
                      </TableCell>
                      <TableCell className="font-mono">
                        <div className="font-semibold text-slate-900">
                          ${order.totalDeliveredCost.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </div>
                        <div className="text-[10px] text-sky-800">
                          ${order.deliveredCostPerCwt.toFixed(2)}/cwt
                        </div>
                      </TableCell>
                      <TableCell>
                        {getStatusBadge(order.status)}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setSelectedOrder(order)}
                        >
                          Inspect
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Order Detail Modal */}
      {selectedOrder && (
        <Dialog
          open={!!selectedOrder}
          onClose={() => setSelectedOrder(null)}
          title={`${selectedOrder.id}: ${selectedOrder.gradeName}`}
          description={`Lot reference backed by Heat ${selectedOrder.heatNumber}`}
          maxWidth="lg"
        >
          <div className="space-y-6 text-xs text-slate-700">
            {/* Top metadata grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-3 bg-slate-50 border border-slate-200 rounded">
              <div>
                <span className="text-[10px] font-mono uppercase text-slate-500 block">Status</span>
                <div className="mt-1">{getStatusBadge(selectedOrder.status)}</div>
              </div>
              <div>
                <span className="text-[10px] font-mono uppercase text-slate-500 block">Supplier</span>
                <span className="font-medium text-slate-900 mt-1 block">{selectedOrder.sellerName}</span>
              </div>
              <div>
                <span className="text-[10px] font-mono uppercase text-slate-500 block">Origin</span>
                <span className="text-slate-700 mt-1 block">{selectedOrder.originLocation}</span>
              </div>
              <div>
                <span className="text-[10px] font-mono uppercase text-slate-500 block">Delivery Zip</span>
                <span className="font-mono text-slate-900 mt-1 block">{selectedOrder.destinationZip}</span>
              </div>
            </div>

            {/* Material & Batch Verification */}
            <div>
              <h4 className="font-semibold text-slate-900 text-xs uppercase tracking-wider mb-2">
                Certified Material Specification
              </h4>
              <div className="border border-slate-200 rounded p-3 space-y-2 bg-white">
                <div className="flex items-center justify-between">
                  <span className="font-medium text-slate-900">{selectedOrder.gradeName} ({selectedOrder.productForm})</span>
                  <Badge variant="success" size="sm">
                    <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                    <span>ASTM Compliant</span>
                  </Badge>
                </div>
                <div className="text-[11px] text-slate-600">
                  Dimensions: <span className="font-mono text-slate-800">{selectedOrder.dimensions}</span>
                </div>
                <div className="text-[11px] text-slate-600">
                  Heat Number: <span className="font-mono font-bold text-slate-900">{selectedOrder.heatNumber}</span> &bull; Certified EN 10204 3.1 Ladle Chemistry on Record
                </div>
              </div>
            </div>

            {/* Delivered Freight Cost Breakdown */}
            <div>
              <h4 className="font-semibold text-slate-900 text-xs uppercase tracking-wider mb-2">
                Itemized Delivered Cost Breakdown
              </h4>
              <div className="border border-slate-200 rounded overflow-hidden">
                <Table>
                  <TableBody>
                    <TableRow>
                      <TableCell className="font-medium text-slate-700">FOB Mill Material Value</TableCell>
                      <TableCell className="text-right font-mono text-slate-900">
                        ${selectedOrder.baseMaterialCost.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell className="font-medium text-slate-700">Flatbed Road Freight (Permitted 45k lb payload)</TableCell>
                      <TableCell className="text-right font-mono text-slate-900">
                        ${selectedOrder.estimatedFreight.toFixed(2)}
                      </TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell className="font-medium text-slate-700">EIA Fuel Surcharge Index</TableCell>
                      <TableCell className="text-right font-mono text-slate-900">
                        ${selectedOrder.fuelSurcharge.toFixed(2)}
                      </TableCell>
                    </TableRow>
                    <TableRow className="bg-slate-50 font-semibold">
                      <TableCell className="text-slate-900">Total Landed Delivered Cost</TableCell>
                      <TableCell className="text-right font-mono text-slate-900 text-sm">
                        ${selectedOrder.totalDeliveredCost.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </div>
            </div>

            {/* Logistics & Tracking */}
            {selectedOrder.trackingNumber && (
              <div className="p-3 bg-sky-50 border border-sky-200 rounded text-sky-900">
                <div className="flex items-center gap-2 font-medium">
                  <Truck className="w-4 h-4 text-sky-700" />
                  <span>Freight In Transit</span>
                </div>
                <div className="text-[11px] text-sky-800 mt-1">
                  Bill of Lading: <span className="font-mono font-semibold">{selectedOrder.trackingNumber}</span> &bull; Flatbed carrier GPS ping active.
                </div>
              </div>
            )}

            {/* Modal Actions */}
            <div className="pt-3 border-t border-slate-200 flex flex-wrap items-center justify-between gap-2">
              <Link href={`/listings/${selectedOrder.listingId}`}>
                <Button variant="outline" size="sm">
                  View Catalog Listing
                  <ArrowRight className="w-3.5 h-3.5 ml-1.5" />
                </Button>
              </Link>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => alert("Certified EN 10204 3.1 MTR inspection package downloaded (Demo).")}
                >
                  <Download className="w-3.5 h-3.5 mr-1.5" />
                  Download MTR Package
                </Button>
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => {
                    alert(`Purchase Order confirmed for ${selectedOrder.id}. Service Center notified.`);
                    setSelectedOrder(null);
                  }}
                >
                  Confirm Purchase Order
                </Button>
              </div>
            </div>
          </div>
        </Dialog>
      )}

      {/* New RFQ Creation Modal */}
      {rfqModalOpen && (
        <Dialog
          open={rfqModalOpen}
          onClose={() => setRfqModalOpen(false)}
          title="Create Material Request for Quotation (RFQ)"
          description="Submit procurement requirements to initiate freight rate calculation and hold inventory."
          maxWidth="md"
        >
          {rfqCreatedSuccess ? (
            <div className="py-8 text-center space-y-3">
              <div className="w-10 h-10 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <h3 className="font-bold text-slate-900 text-sm">RFQ Submitted Successfully</h3>
              <p className="text-xs text-slate-600">
                Seller and logistics carriers notified. A delivered quotation will be generated shortly.
              </p>
            </div>
          ) : (
            <form onSubmit={handleCreateRfq} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-700 font-medium mb-1">
                  Target Material Lot
                </label>
                <Select
                  value={rfqTargetListing}
                  onChange={(e) => setRfqTargetListing(e.target.value)}
                >
                  {SYNTHETIC_LISTINGS.map((lot) => (
                    <option key={lot.id} value={lot.id}>
                      {lot.grade?.grade_name} &bull; {lot.dimensions_display} &bull; {lot.warehouse_city}, {lot.warehouse_state}
                    </option>
                  ))}
                </Select>
              </div>

              <div>
                <label className="block text-slate-700 font-medium mb-1">
                  Job Site Destination ZIP Code
                </label>
                <Input
                  value={rfqDestinationZip}
                  onChange={(e) => setRfqDestinationZip(e.target.value)}
                  placeholder="e.g. 60601, 77002, 15222"
                  maxLength={5}
                />
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Used to estimate flatbed mileage and fuel surcharge index.
                </p>
              </div>

              <div>
                <label className="block text-slate-700 font-medium mb-1">
                  Delivery Requirements &amp; Notes
                </label>
                <textarea
                  value={rfqNotes}
                  onChange={(e) => setRfqNotes(e.target.value)}
                  rows={3}
                  className="w-full rounded border border-slate-300 p-2 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-slate-900"
                  placeholder="e.g. Requires side unloading, tarped delivery, or specific delivery window..."
                />
              </div>

              <div className="p-2.5 rounded bg-amber-50 border border-amber-200 text-amber-900 text-[11px]">
                <div className="font-semibold flex items-center gap-1.5">
                  <ShieldCheck className="w-3.5 h-3.5 text-amber-700" />
                  <span>Demo Environment Notice</span>
                </div>
                <p className="mt-0.5 text-amber-800">
                  This RFQ simulates a real B2B procurement order. No live credit card or financial charge is executed.
                </p>
              </div>

              <div className="pt-3 border-t border-slate-200 flex justify-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setRfqModalOpen(false)}
                >
                  Cancel
                </Button>
                <Button type="submit" variant="primary" size="sm">
                  Submit Request (RFQ)
                </Button>
              </div>
            </form>
          )}
        </Dialog>
      )}
    </PageContainer>
  );
}

export default function OrdersPage() {
  return (
    <Suspense
      fallback={
        <PageContainer
          title="Orders & Quotations"
          description="Loading procurement records..."
        >
          <div className="space-y-4">
            <Skeleton className="h-28 w-full" />
            <Skeleton className="h-64 w-full" />
          </div>
        </PageContainer>
      }
    >
      <OrdersContent />
    </Suspense>
  );
}
