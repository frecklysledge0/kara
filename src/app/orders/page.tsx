"use client";

import React, { useState, useEffect, useMemo, Suspense, useCallback } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  FileText,
  Search,
  ShieldCheck,
  CheckCircle2,
  Clock,
  Plus,
  XCircle,
  AlertCircle,
  UserCheck,
  RefreshCw,
  ExternalLink,
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
import { OrderWithListing, ListingWithRelations, QuoteStatus } from "@/types/database";
import { UserRole } from "@/lib/engine/quote-lifecycle";

interface DemoPersona {
  role: UserRole;
  actorId: string;
  name: string;
  company: string;
  description: string;
}

const DEMO_PERSONAS: DemoPersona[] = [
  {
    role: "buyer",
    actorId: "buyer-demo-01",
    name: "Midwest Heavy Infrastructure LLC",
    company: "Midwest Heavy Infrastructure",
    description: "Buyer Tenant 1: Structural steel contractor based in Chicago, IL",
  },
  {
    role: "buyer",
    actorId: "buyer-demo-02",
    name: "Apex Pressure Vessel Fabricators",
    company: "Apex Fabricators",
    description: "Buyer Tenant 2: Energy & pressure vessel fabricator in Corpus Christi, TX",
  },
  {
    role: "seller",
    actorId: "seller-1",
    name: "Great Lakes Steel Service",
    company: "Great Lakes Steel Service",
    description: "Seller: Plate & structural distributor in Gary, IN",
  },
  {
    role: "seller",
    actorId: "seller-2",
    name: "Gulf Coast Energy Metals",
    company: "Gulf Coast Energy Metals",
    description: "Seller: PVQ & heavy gauge distributor in Houston, TX",
  },
];

function OrdersContent() {
  const searchParams = useSearchParams();
  const highlightedQuoteId = searchParams.get("highlight");

  // Demo active persona
  const [activePersona, setActivePersona] = useState<DemoPersona>(DEMO_PERSONAS[0]);

  // Orders state
  const [orders, setOrders] = useState<OrderWithListing[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");

  // Selected Order for Detail Modal
  const [selectedOrder, setSelectedOrder] = useState<OrderWithListing | null>(null);

  // Seller Quoting Form State (within modal)
  const [sellerQuotePrice, setSellerQuotePrice] = useState<number>(0);
  const [sellerQuoteFreight, setSellerQuoteFreight] = useState<number>(0);
  const [sellerNotes, setSellerNotes] = useState<string>("");
  const [buyerNotes, setBuyerNotes] = useState<string>("");
  const [declineReason, setDeclineReason] = useState<string>("");
  const [isTransitioning, setIsTransitioning] = useState<boolean>(false);
  const [transitionSuccessMessage, setTransitionSuccessMessage] = useState<string | null>(null);

  // New RFQ Modal State
  const [rfqModalOpen, setRfqModalOpen] = useState(false);
  const [listings, setListings] = useState<ListingWithRelations[]>([]);
  const [rfqListingId, setRfqListingId] = useState<string>("");
  const [rfqQuantityTons, setRfqQuantityTons] = useState<number>(20);
  const [rfqCity, setRfqCity] = useState("Chicago");
  const [rfqState, setRfqState] = useState("IL");
  const [rfqZip, setRfqZip] = useState("60601");
  const [rfqNotes, setRfqNotes] = useState("");
  const [rfqSubmitting, setRfqSubmitting] = useState(false);
  const [rfqError, setRfqError] = useState<string | null>(null);

  // Fetch orders scoped to current persona
  const fetchOrdersForPersona = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(
        `/api/quotes?role=${activePersona.role}&actorId=${activePersona.actorId}&status=${statusFilter}`
      );
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to fetch procurement records");
      }
      setOrders(data.orders || []);

      if (highlightedQuoteId) {
        const found = (data.orders || []).find((o: OrderWithListing) => o.id === highlightedQuoteId);
        if (found) setSelectedOrder(found);
      }
    } catch (err: unknown) {
      console.error("Error fetching orders:", err);
      const msg = err instanceof Error ? err.message : "Error fetching orders";
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, [activePersona, statusFilter, highlightedQuoteId]);

  useEffect(() => {
    let ignore = false;
    async function load() {
      try {
        const res = await fetch(
          `/api/quotes?role=${activePersona.role}&actorId=${activePersona.actorId}&status=${statusFilter}`
        );
        const data = await res.json();
        if (!ignore && res.ok && data.success) {
          setOrders(data.orders || []);
          if (highlightedQuoteId) {
            const found = (data.orders || []).find((o: OrderWithListing) => o.id === highlightedQuoteId);
            if (found) setSelectedOrder(found);
          }
        }
      } catch (err: unknown) {
        if (!ignore) {
          const msg = err instanceof Error ? err.message : "Error fetching orders";
          setError(msg);
        }
      } finally {
        if (!ignore) {
          setLoading(false);
        }
      }
    }

    load();
    return () => {
      ignore = true;
    };
  }, [activePersona, statusFilter, highlightedQuoteId]);

  // Load listings for RFQ dropdown
  useEffect(() => {
    async function loadCatalog() {
      try {
        const res = await fetch("/api/listings");
        const data = await res.json();
        if (res.ok && data.listings) {
          setListings(data.listings);
          if (data.listings.length > 0 && !rfqListingId) {
            setRfqListingId(data.listings[0].id);
          }
        }
      } catch (err) {
        console.error("Error loading listings for RFQ:", err);
      }
    }
    loadCatalog();
  }, [rfqListingId]);

  // Filtered orders list
  const filteredOrders = useMemo(() => {
    return orders.filter((o) => {
      const matchesStatus = statusFilter === "ALL" || o.status === statusFilter;
      const q = searchTerm.toLowerCase();
      const matchesSearch =
        o.id.toLowerCase().includes(q) ||
        (o.listing?.grade || "").toLowerCase().includes(q) ||
        (o.buyer_name || "").toLowerCase().includes(q) ||
        (o.buyer_city || "").toLowerCase().includes(q) ||
        (o.listing?.seller?.name || "").toLowerCase().includes(q);

      return matchesStatus && matchesSearch;
    });
  }, [orders, statusFilter, searchTerm]);

  // Handle Lifecycle Transition
  async function handleTransition(toStatus: QuoteStatus) {
    if (!selectedOrder) return;
    setIsTransitioning(true);
    setTransitionSuccessMessage(null);
    setError(null);

    try {
      const payload: {
        toStatus: QuoteStatus;
        actor: {
          role: UserRole;
          actorId: string;
        };
        quotedPricePerTon?: number;
        quotedDeliveredCost?: number;
        sellerNotes?: string;
        buyerNotes?: string;
        declineReason?: string;
      } = {
        toStatus,
        actor: {
          role: activePersona.role,
          actorId: activePersona.actorId,
        },
      };

      if (toStatus === "quoted") {
        if (!sellerQuotePrice || sellerQuotePrice <= 0) {
          throw new Error("Please specify a valid quoted price per ton (> $0).");
        }
        payload.quotedPricePerTon = Number(sellerQuotePrice);
        if (sellerQuoteFreight > 0) {
          payload.quotedDeliveredCost = Number(sellerQuoteFreight);
        }
        if (sellerNotes) payload.sellerNotes = sellerNotes;
      }

      if (toStatus === "accepted" && buyerNotes) {
        payload.buyerNotes = buyerNotes;
      }

      if (toStatus === "declined" && declineReason) {
        payload.declineReason = declineReason;
      }

      const res = await fetch(`/api/quotes/${selectedOrder.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to update quote request status.");
      }

      // Update in-memory state
      const updatedOrder = data.quote;
      setOrders((prev) => prev.map((o) => (o.id === updatedOrder.id ? updatedOrder : o)));
      setSelectedOrder(updatedOrder);
      setTransitionSuccessMessage(`Status successfully updated to '${toStatus.toUpperCase()}'.`);

      // Clear action fields
      setSellerNotes("");
      setBuyerNotes("");
      setDeclineReason("");
    } catch (err: unknown) {
      console.error("Transition error:", err);
      const msg = err instanceof Error ? err.message : "Error executing state transition";
      setError(msg);
    } finally {
      setIsTransitioning(false);
    }
  }

  // Handle RFQ creation submission
  async function handleCreateRfq(e: React.FormEvent) {
    e.preventDefault();
    setRfqSubmitting(true);
    setRfqError(null);

    try {
      if (rfqQuantityTons <= 0) {
        throw new Error("Quantity must be a positive number of tons.");
      }

      const res = await fetch("/api/quotes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          listing_id: rfqListingId,
          buyer_id: activePersona.actorId,
          buyer_name: activePersona.name,
          buyer_email: `${activePersona.actorId}@example.com`,
          buyer_company: activePersona.company,
          buyer_city: rfqCity,
          buyer_state: rfqState,
          buyer_zip: rfqZip,
          quantity_tons: Number(rfqQuantityTons),
          notes: rfqNotes || undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to submit quote request.");
      }

      setRfqModalOpen(false);
      setRfqNotes("");
      fetchOrdersForPersona();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Error creating RFQ";
      setRfqError(msg);
    } finally {
      setRfqSubmitting(false);
    }
  }

  function getStatusBadge(status: QuoteStatus) {
    switch (status) {
      case "submitted":
        return (
          <Badge variant="outline" size="sm" className="border-sky-300 text-sky-800 bg-sky-50">
            <Clock className="w-3 h-3 text-sky-600 mr-1" />
            Submitted
          </Badge>
        );
      case "under_review":
        return (
          <Badge variant="warning" size="sm">
            <Clock className="w-3 h-3 text-amber-700 mr-1" />
            Seller Review
          </Badge>
        );
      case "quoted":
        return (
          <Badge variant="secondary" size="sm" className="bg-sky-100 text-sky-900 border-sky-300">
            <CheckCircle2 className="w-3 h-3 text-sky-700 mr-1" />
            Formal Quote
          </Badge>
        );
      case "accepted":
        return (
          <Badge variant="success" size="sm">
            <CheckCircle2 className="w-3 h-3 text-emerald-700 mr-1" />
            Quote Accepted
          </Badge>
        );
      case "declined":
        return (
          <Badge variant="destructive" size="sm">
            <XCircle className="w-3 h-3 text-rose-700 mr-1" />
            Declined
          </Badge>
        );
      case "closed":
        return (
          <Badge variant="default" size="sm" className="bg-slate-100 text-slate-600">
            Closed
          </Badge>
        );
      default:
        return (
          <Badge variant="outline" size="sm">
            {status}
          </Badge>
        );
    }
  }

  return (
    <PageContainer
      title="Orders & Quote Requests"
      description="Deterministic commercial quote requests, seller review workflows, binding price agreements, and audit history."
      breadcrumbs={[
        { label: "Marketplace", href: "/listings" },
        { label: "Orders & Quotations" },
      ]}
      badge={
        <div className="flex items-center gap-2">
          <Badge variant="outline" size="sm" className="font-mono text-slate-700">
            Role: {activePersona.role.toUpperCase()}
          </Badge>
          <Badge variant="demo" size="sm">
            Demo Workflow
          </Badge>
        </div>
      }
      actions={
        <div className="flex items-center gap-2">
          <Link href="/listings">
            <Button variant="outline" size="sm">
              <Search className="w-3.5 h-3.5 mr-1.5" />
              Browse Materials
            </Button>
          </Link>
          {activePersona.role === "buyer" && (
            <Button
              variant="primary"
              size="sm"
              onClick={() => {
                setRfqError(null);
                setRfqModalOpen(true);
              }}
            >
              <Plus className="w-3.5 h-3.5 mr-1" />
              New Quote Request (RFQ)
            </Button>
          )}
        </div>
      }
    >
      <div className="space-y-6">
        {/* Demo Identity Switcher & Access Control Scope Notice */}
        <Card className="border-slate-300 bg-slate-50/70 shadow-2xs">
          <CardContent className="p-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <UserCheck className="w-4 h-4 text-slate-700" />
                  <span className="text-xs font-semibold uppercase tracking-wider text-slate-800">
                    Active Demo Persona &amp; Access Control Scope
                  </span>
                </div>
                <p className="text-xs text-slate-600">
                  Select a buyer or seller identity to evaluate strict tenant isolation and role permissions.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <Select
                  value={activePersona.actorId}
                  onChange={(e) => {
                    const found = DEMO_PERSONAS.find((p) => p.actorId === e.target.value);
                    if (found) {
                      setActivePersona(found);
                      setSelectedOrder(null);
                    }
                  }}
                  className="text-xs font-medium w-72"
                >
                  {DEMO_PERSONAS.map((p) => (
                    <option key={p.actorId} value={p.actorId}>
                      {p.role.toUpperCase()}: {p.name}
                    </option>
                  ))}
                </Select>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={fetchOrdersForPersona}
                  title="Reload Records"
                >
                  <RefreshCw className="w-3.5 h-3.5 text-slate-600" />
                </Button>
              </div>
            </div>

            <div className="mt-3 pt-2 border-t border-slate-200 flex items-center justify-between text-[11px] text-slate-500 font-mono">
              <span>{activePersona.description}</span>
              <span>Actor ID: {activePersona.actorId}</span>
            </div>
          </CardContent>
        </Card>

        {error && (
          <div className="p-3 rounded border border-rose-300 bg-rose-50 text-rose-900 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Filter Controls & Status Tabs */}
        <Card className="border-slate-200 bg-white shadow-2xs">
          <CardContent className="p-4 space-y-3">
            <div className="flex flex-wrap gap-1.5 border-b border-slate-100 pb-3">
              {[
                { id: "ALL", label: "All Records" },
                { id: "submitted", label: "Submitted" },
                { id: "under_review", label: "Under Review" },
                { id: "quoted", label: "Quoted" },
                { id: "accepted", label: "Accepted" },
                { id: "declined", label: "Declined" },
                { id: "closed", label: "Closed" },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setStatusFilter(tab.id)}
                  className={`px-2.5 py-1 rounded text-xs font-medium transition-colors ${
                    statusFilter === tab.id
                      ? "bg-slate-900 text-white"
                      : "bg-slate-100 text-slate-600 hover:bg-slate-200 hover:text-slate-900"
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-3">
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <Input
                  placeholder="Search reference #, grade, seller, buyer, or city..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9 text-xs"
                />
              </div>
              <span className="text-xs font-mono text-slate-500">
                {filteredOrders.length} record{filteredOrders.length === 1 ? "" : "s"}
              </span>
            </div>
          </CardContent>
        </Card>

        {/* Orders Table */}
        <Card className="border-slate-200 bg-white shadow-2xs">
          <CardHeader className="pb-3 border-b border-slate-100">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-base text-slate-900">
                  {activePersona.role === "buyer" ? "My Quote Requests" : "Incoming Buyer RFQs"}
                </CardTitle>
                <CardDescription>
                  Review line items, initial pricing estimates, and seller rate agreements.
                </CardDescription>
              </div>
              <div className="text-[11px] text-slate-500 font-mono">
                Preserving original audit estimates
              </div>
            </div>
          </CardHeader>

          <CardContent className="p-0">
            {loading ? (
              <div className="p-6 space-y-3">
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-12 w-full" />
                <Skeleton className="h-12 w-full" />
              </div>
            ) : filteredOrders.length === 0 ? (
              <div className="py-12">
                <EmptyState
                  icon={FileText}
                  title="No matching quote requests"
                  description={
                    statusFilter !== "ALL"
                      ? `No records found with status '${statusFilter}'. Try viewing all records or create a new request.`
                      : "No procurement records exist for this persona."
                  }
                  action={
                    activePersona.role === "buyer" ? (
                      <Button
                        variant="primary"
                        size="sm"
                        onClick={() => {
                          setStatusFilter("ALL");
                          setSearchTerm("");
                          setRfqModalOpen(true);
                        }}
                      >
                        Create Quote Request
                      </Button>
                    ) : (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setStatusFilter("ALL");
                          setSearchTerm("");
                        }}
                      >
                        Clear Filters
                      </Button>
                    )
                  }
                />
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow className="bg-slate-50">
                    <TableHead className="w-28">Reference</TableHead>
                    <TableHead>Grade &amp; Dimensions</TableHead>
                    <TableHead className="w-24">Quantity</TableHead>
                    <TableHead>
                      {activePersona.role === "buyer" ? "Seller / Warehouse" : "Buyer & Destination"}
                    </TableHead>
                    <TableHead>Pricing &amp; Audit Trail</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredOrders.map((order) => {
                    const isQuoted = order.status === "quoted" || order.status === "accepted";
                    const isSelected = selectedOrder?.id === order.id;

                    return (
                      <TableRow
                        key={order.id}
                        className={`hover:bg-slate-50/70 transition-colors ${
                          isSelected ? "bg-sky-50/40" : ""
                        }`}
                      >
                        <TableCell className="font-mono font-semibold text-slate-900 text-xs">
                          <div>{order.id}</div>
                          <div className="text-[10px] text-slate-500 font-sans">
                            {new Date(order.created_at).toLocaleDateString()}
                          </div>
                        </TableCell>
                        <TableCell>
                          <span className="font-medium text-slate-900 block text-xs">
                            {order.listing?.grade || "Standard Specification"}
                          </span>
                          <span className="text-[11px] text-slate-500">
                            {order.listing?.form || "Plate"} &bull; {order.listing?.thickness_in ? `${order.listing.thickness_in.toFixed(3)}"` : "Lot"}
                          </span>
                        </TableCell>
                        <TableCell className="font-mono text-slate-800 text-xs font-semibold">
                          {order.quantity_tons} tons
                        </TableCell>
                        <TableCell className="text-slate-600 text-xs">
                          {activePersona.role === "buyer" ? (
                            <div>
                              <div className="font-medium text-slate-800">
                                {order.listing?.seller?.name || "Service Center"}
                              </div>
                              <div className="text-[11px] text-slate-500">
                                {order.listing?.seller?.city}, {order.listing?.seller?.state}
                              </div>
                            </div>
                          ) : (
                            <div>
                              <div className="font-medium text-slate-800">{order.buyer_name}</div>
                              <div className="text-[11px] text-slate-500">
                                {order.buyer_city}, {order.buyer_state || "IL"} (ZIP {order.buyer_zip || "60601"})
                              </div>
                            </div>
                          )}
                        </TableCell>
                        <TableCell>
                          {isQuoted && order.quoted_price_per_ton ? (
                            <div>
                              <div className="font-mono font-bold text-sky-950 text-xs">
                                ${order.quoted_price_per_ton.toLocaleString()}/ton
                              </div>
                              <div className="text-[10px] text-sky-800 font-sans">
                                Quoted Total: ${order.final_quoted_cost?.toLocaleString()}
                              </div>
                            </div>
                          ) : (
                            <div>
                              <div className="font-mono font-medium text-slate-800 text-xs">
                                ${(order.original_price_per_ton || 0).toLocaleString()}/ton
                              </div>
                              <div className="text-[10px] text-amber-700 font-medium">
                                Initial Estimate (${(order.original_estimated_delivered_cost || order.estimated_delivered_cost).toLocaleString()})
                              </div>
                            </div>
                          )}
                        </TableCell>
                        <TableCell>{getStatusBadge(order.status)}</TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant={isSelected ? "primary" : "outline"}
                            size="sm"
                            className="h-7 text-xs"
                            onClick={() => {
                              setSelectedOrder(order);
                              setSellerQuotePrice(order.quoted_price_per_ton || order.original_price_per_ton || 1050);
                              setSellerQuoteFreight(order.final_quoted_cost || order.estimated_delivered_cost || 0);
                              setTransitionSuccessMessage(null);
                            }}
                          >
                            Inspect &amp; Act
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        {/* Detailed Quote Modal & State Machine Actions */}
        {selectedOrder && (
          <Dialog
            open={Boolean(selectedOrder)}
            onClose={() => {
              setSelectedOrder(null);
              setTransitionSuccessMessage(null);
            }}
            title={`${selectedOrder.id}: ${selectedOrder.listing?.grade || "Quote Request"}`}
            description={`Lifecycle management and commercial agreement review for lot ${selectedOrder.listing_id}.`}
            maxWidth="lg"
          >
            <div className="space-y-6 text-xs text-slate-700">
              {transitionSuccessMessage && (
                <div className="p-3 rounded border border-emerald-300 bg-emerald-50 text-emerald-900 text-xs flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>{transitionSuccessMessage}</span>
                </div>
              )}

              {/* Lifecycle Step Progression Bar */}
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-lg">
                <span className="text-[10px] font-mono uppercase tracking-wider text-slate-500 block mb-2">
                  Quote Request Lifecycle Progress
                </span>
                <div className="grid grid-cols-5 gap-2 text-center text-xs">
                  {[
                    { step: 1, id: "submitted", label: "1. Submitted" },
                    { step: 2, id: "under_review", label: "2. Review" },
                    { step: 3, id: "quoted", label: "3. Quoted" },
                    { step: 4, id: "accepted", label: "4. Accepted" },
                    { step: 5, id: "closed", label: "5. Closed" },
                  ].map((s) => {
                    const isCurrent = selectedOrder.status === s.id;

                    let stepBg = "bg-white border-slate-200 text-slate-500";
                    if (isCurrent) {
                      stepBg = "bg-sky-900 border-sky-900 text-white font-semibold";
                    }

                    return (
                      <div
                        key={s.id}
                        className={`p-2 rounded border transition-colors ${stepBg}`}
                      >
                        <div className="text-[11px] font-mono">{s.label}</div>
                      </div>
                    );
                  })}
                </div>
                {selectedOrder.status === "declined" && (
                  <div className="mt-2 p-2 rounded bg-rose-50 border border-rose-200 text-rose-800 text-[11px] flex items-center gap-1.5">
                    <XCircle className="w-3.5 h-3.5 text-rose-600 shrink-0" />
                    <span>
                      This quote request was declined. Reason: {selectedOrder.decline_reason || "Seller or buyer declined."}
                    </span>
                  </div>
                )}
              </div>

              {/* Next Steps Guidance */}
              <div className="p-3 rounded bg-sky-50 border border-sky-200 text-xs text-sky-950 space-y-1">
                <span className="font-semibold block text-[11px] uppercase font-mono tracking-wider text-sky-900">
                  Current Status &amp; Next Action (Role: {activePersona.role.toUpperCase()})
                </span>
                {selectedOrder.status === "submitted" && (
                  <p>
                    {activePersona.role === "buyer"
                      ? "Awaiting producing mill review. The seller typically acknowledges incoming RFQs within 4 business hours to verify cutting schedules and trucking availability."
                      : "New RFQ received from buyer. Click 'Acknowledge & Begin Review' below to verify inventory tolerances and prepare confirmed pricing."}
                  </p>
                )}
                {selectedOrder.status === "under_review" && (
                  <p>
                    {activePersona.role === "buyer"
                      ? "The seller is currently reviewing cutting schedules and securing live flatbed freight rates. You will receive notification when the formal quote is issued."
                      : "Review in progress. Enter your confirmed FOB mill price and estimated landed cost below, then click 'Issue Formal Quoted Rate'."}
                  </p>
                )}
                {selectedOrder.status === "quoted" && (
                  <p>
                    {activePersona.role === "buyer"
                      ? "Formal quotation issued by seller. Review the confirmed FOB price, landed delivered cost, and lead times. Click 'Accept & Confirm Quotation' to lock in pricing."
                      : "Quotation issued to buyer. Awaiting buyer confirmation. The 48-hour inventory reservation hold remains active."}
                  </p>
                )}
                {selectedOrder.status === "accepted" && (
                  <p>
                    Quotation confirmed and agreed by both parties. Formal purchase order dispatch paperwork and mill dispatch scheduling are in progress.
                  </p>
                )}
                {selectedOrder.status === "declined" && (
                  <p>
                    This quotation inquiry was declined. No financial or delivery obligations apply.
                  </p>
                )}
                {selectedOrder.status === "closed" && (
                  <p>
                    This commercial record is closed and archived for audit retention.
                  </p>
                )}
              </div>

              {/* Two-Column Specification & Audit Pricing Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Column 1: Material & Inventory Context */}
                <div className="p-3 rounded border border-slate-200 bg-white space-y-2.5">
                  <h4 className="font-semibold text-slate-900 text-xs uppercase tracking-wider border-b border-slate-100 pb-1.5 flex items-center justify-between">
                    <span>Material Specification</span>
                    <Badge variant="outline" size="sm">
                      {selectedOrder.listing?.form || "Plate"}
                    </Badge>
                  </h4>

                  <div className="space-y-1.5 text-[11px]">
                    <div className="flex justify-between">
                      <span className="text-slate-500">Grade / Standard:</span>
                      <span className="font-semibold text-slate-900">
                        {selectedOrder.listing?.grade || "ASTM Specification"}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Thickness / Form:</span>
                      <span className="font-mono text-slate-800">
                        {selectedOrder.listing?.thickness_in?.toFixed(3)}&quot; &bull; {selectedOrder.listing?.form}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Heat Number (MTR):</span>
                      <span className="font-mono font-bold text-slate-900">
                        {selectedOrder.listing?.certificate?.heat_number || "Certified 3.1"}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Requested Tonnage:</span>
                      <span className="font-mono font-bold text-slate-900">
                        {selectedOrder.quantity_tons} tons
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Available In Lot:</span>
                      <span className="font-mono text-slate-700">
                        {selectedOrder.listing?.quantity_tons || 0} tons
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Origin Warehouse:</span>
                      <span className="text-slate-800">
                        {selectedOrder.listing?.seller?.city}, {selectedOrder.listing?.seller?.state}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Delivery Destination:</span>
                      <span className="text-slate-800">
                        {selectedOrder.buyer_city}, {selectedOrder.buyer_state || "IL"} (ZIP {selectedOrder.buyer_zip || "60601"})
                      </span>
                    </div>
                  </div>

                  <div className="pt-2 border-t border-slate-100">
                    <Link
                      href={`/listings/${selectedOrder.listing_id}`}
                      className="text-xs text-sky-800 hover:underline flex items-center gap-1"
                    >
                      <span>Inspect Material Batch Passport &amp; MTR</span>
                      <ExternalLink className="w-3 h-3" />
                    </Link>
                  </div>
                </div>

                {/* Column 2: Audit Pricing & Estimate Preservation */}
                <div className="p-3 rounded border border-slate-200 bg-white space-y-2.5">
                  <h4 className="font-semibold text-slate-900 text-xs uppercase tracking-wider border-b border-slate-100 pb-1.5 flex items-center justify-between">
                    <span>Audit-Preserved Pricing</span>
                    {selectedOrder.is_estimate ? (
                      <Badge variant="warning" size="sm">Estimate</Badge>
                    ) : (
                      <Badge variant="success" size="sm">Confirmed Quote</Badge>
                    )}
                  </h4>

                  <div className="space-y-2 text-[11px]">
                    {/* Original Estimate */}
                    <div className="p-2 rounded bg-slate-50 border border-slate-100 space-y-1">
                      <div className="flex justify-between text-slate-600">
                        <span>Original Ingestion Price:</span>
                        <span className="font-mono font-semibold text-slate-800">
                          ${(selectedOrder.original_price_per_ton || 0).toLocaleString()}/ton
                        </span>
                      </div>
                      <div className="flex justify-between text-slate-600">
                        <span>Original Delivered Estimate:</span>
                        <span className="font-mono font-semibold text-slate-800">
                          ${(selectedOrder.original_estimated_delivered_cost || selectedOrder.estimated_delivered_cost).toLocaleString()}
                        </span>
                      </div>
                      <p className="text-[10px] text-slate-400 italic pt-0.5">
                        Preserved for audit integrity; non-binding until confirmed.
                      </p>
                    </div>

                    {/* Confirmed Quote (if quoted) */}
                    {selectedOrder.quoted_price_per_ton && (
                      <div className="p-2 rounded bg-sky-50 border border-sky-200 space-y-1 text-sky-950">
                        <div className="flex justify-between font-semibold">
                          <span>Confirmed Quoted Price:</span>
                          <span className="font-mono text-sm">
                            ${selectedOrder.quoted_price_per_ton.toLocaleString()}/ton
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span>Landed Delivered Total:</span>
                          <span className="font-mono font-semibold">
                            ${selectedOrder.final_quoted_cost?.toLocaleString()}
                          </span>
                        </div>
                        {selectedOrder.quoted_at && (
                          <div className="text-[10px] text-sky-800">
                            Quoted: {new Date(selectedOrder.quoted_at).toLocaleString()}
                          </div>
                        )}
                        {selectedOrder.seller_notes && (
                          <div className="text-[10px] text-sky-900 border-t border-sky-200 pt-1">
                            <strong>Seller Notes:</strong> {selectedOrder.seller_notes}
                          </div>
                        )}
                      </div>
                    )}

                    {selectedOrder.buyer_notes && (
                      <div className="p-2 rounded bg-slate-50 border border-slate-200 text-[11px]">
                        <strong>Buyer Instructions:</strong> {selectedOrder.buyer_notes}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Action Panels Dependent on Role */}
              <div className="pt-2 border-t border-slate-200">
                <h4 className="font-semibold text-slate-900 text-xs uppercase tracking-wider mb-2">
                  Available Actions (Role: {activePersona.role.toUpperCase()})
                </h4>

                {/* 1. SELLER ACTIONS */}
                {activePersona.role === "seller" && (
                  <div className="space-y-3">
                    {selectedOrder.status === "submitted" && (
                      <div className="flex items-center gap-2">
                        <Button
                          variant="primary"
                          size="sm"
                          disabled={isTransitioning}
                          onClick={() => handleTransition("under_review")}
                        >
                          Acknowledge &amp; Begin Review
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={isTransitioning}
                          onClick={() => {
                            const reason = prompt("Reason for declining quote request:");
                            if (reason) {
                              setDeclineReason(reason);
                              handleTransition("declined");
                            }
                          }}
                        >
                          Decline Request
                        </Button>
                      </div>
                    )}

                    {selectedOrder.status === "under_review" && (
                      <div className="p-3 rounded border border-sky-200 bg-sky-50/50 space-y-3">
                        <div className="font-semibold text-sky-950 text-xs">
                          Issue Formal Quoted Rate to Buyer
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <div>
                            <label className="text-[11px] font-semibold text-slate-700 block mb-1">
                              Quoted Price Per Ton ($/ton) *
                            </label>
                            <Input
                              type="number"
                              value={sellerQuotePrice}
                              onChange={(e) => setSellerQuotePrice(Number(e.target.value))}
                              className="text-xs font-mono"
                            />
                          </div>
                          <div>
                            <label className="text-[11px] font-semibold text-slate-700 block mb-1">
                              Total Landed Cost Estimate ($)
                            </label>
                            <Input
                              type="number"
                              value={sellerQuoteFreight}
                              onChange={(e) => setSellerQuoteFreight(Number(e.target.value))}
                              className="text-xs font-mono"
                            />
                          </div>
                        </div>

                        <div>
                          <label className="text-[11px] font-semibold text-slate-700 block mb-1">
                            Seller Notes &amp; Rate Lock Expiration
                          </label>
                          <Input
                            placeholder="e.g. 14-day commercial rate hold. Includes mill EN 10204 3.1 MTR package."
                            value={sellerNotes}
                            onChange={(e) => setSellerNotes(e.target.value)}
                            className="text-xs"
                          />
                        </div>

                        <div className="flex items-center gap-2 pt-1">
                          <Button
                            variant="primary"
                            size="sm"
                            disabled={isTransitioning}
                            onClick={() => handleTransition("quoted")}
                          >
                            Submit Formal Quotation
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            disabled={isTransitioning}
                            onClick={() => {
                              const reason = prompt("Reason for declining quote request:");
                              if (reason) {
                                setDeclineReason(reason);
                                handleTransition("declined");
                              }
                            }}
                          >
                            Decline Request
                          </Button>
                        </div>
                      </div>
                    )}

                    {(selectedOrder.status === "quoted" || selectedOrder.status === "accepted") && (
                      <div className="p-2.5 rounded bg-slate-50 border border-slate-200 text-xs text-slate-600">
                        Quotation is currently locked and awaiting buyer response. You can close this record once procurement terms are finished.
                        <div className="mt-2">
                          <Button
                            variant="outline"
                            size="sm"
                            disabled={isTransitioning}
                            onClick={() => handleTransition("closed")}
                          >
                            Archive / Close Record
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* 2. BUYER ACTIONS */}
                {activePersona.role === "buyer" && (
                  <div className="space-y-3">
                    {selectedOrder.status === "quoted" && (
                      <div className="p-3 rounded border border-emerald-300 bg-emerald-50/70 space-y-3">
                        <div className="font-semibold text-emerald-950 text-xs">
                          Review Formal Mill Quotation &amp; Accept / Decline
                        </div>
                        <p className="text-[11px] text-emerald-900 leading-relaxed">
                          The producing seller confirmed a rate of{" "}
                          <strong>${selectedOrder.quoted_price_per_ton?.toLocaleString()}/ton</strong> ($
                          {selectedOrder.final_quoted_cost?.toLocaleString()} total). Accepting confirms agreement to commercial terms.
                        </p>

                        <div>
                          <label className="text-[11px] font-semibold text-slate-700 block mb-1">
                            Optional Buyer Jobsite Notes
                          </label>
                          <Input
                            placeholder="e.g. Approved by Project Manager; delivery window Nov 10-14."
                            value={buyerNotes}
                            onChange={(e) => setBuyerNotes(e.target.value)}
                            className="text-xs"
                          />
                        </div>

                        <div className="flex items-center gap-2 pt-1">
                          <Button
                            variant="primary"
                            size="sm"
                            disabled={isTransitioning}
                            onClick={() => handleTransition("accepted")}
                          >
                            Accept Quotation
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            disabled={isTransitioning}
                            onClick={() => {
                              const reason = prompt("Reason for declining quotation:");
                              if (reason) {
                                setDeclineReason(reason);
                                handleTransition("declined");
                              }
                            }}
                          >
                            Decline Quotation
                          </Button>
                        </div>
                      </div>
                    )}

                    {(selectedOrder.status === "submitted" || selectedOrder.status === "under_review") && (
                      <div className="flex items-center justify-between p-2.5 rounded bg-slate-50 border border-slate-200 text-xs text-slate-600">
                        <span>Awaiting seller review and formal quote.</span>
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={isTransitioning}
                          onClick={() => handleTransition("closed")}
                        >
                          Withdraw / Cancel Request
                        </Button>
                      </div>
                    )}

                    {(selectedOrder.status === "accepted" || selectedOrder.status === "declined") && (
                      <div className="flex items-center justify-between p-2.5 rounded bg-slate-50 border border-slate-200 text-xs text-slate-600">
                        <span>Commercial agreement reached or declined. You may close this record for archiving.</span>
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={isTransitioning}
                          onClick={() => handleTransition("closed")}
                        >
                          Close Record
                        </Button>
                      </div>
                    )}

                    {selectedOrder.status === "closed" && (
                      <div className="p-2.5 rounded bg-slate-100 text-slate-500 text-xs">
                        This procurement record is closed and archived.
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* No Payment Processing Guarantee */}
              <div className="p-2.5 rounded bg-amber-50 border border-amber-200 text-amber-900 text-[11px] space-y-1">
                <div className="flex items-center gap-1.5 font-semibold">
                  <ShieldCheck className="w-3.5 h-3.5 text-amber-700 shrink-0" />
                  <span>Procurement Integrity &amp; Fulfillment Constraint</span>
                </div>
                <p className="text-amber-800 leading-relaxed">
                  MillProof facilitates certified MTR validation, transparent delivered freight calculations, and formal B2B quotation workflows. Submitting or accepting a quotation establishes commercial agreement; no online credit card charge or claims of physical delivery completion are processed.
                </p>
              </div>

              {/* Modal Footer */}
              <div className="pt-3 border-t border-slate-200 flex justify-end gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setSelectedOrder(null)}
                >
                  Close
                </Button>
              </div>
            </div>
          </Dialog>
        )}

        {/* New RFQ Creation Modal */}
        {rfqModalOpen && (
          <Dialog
            open={rfqModalOpen}
            onClose={() => setRfqModalOpen(false)}
            title="Create Request for Quotation (RFQ)"
            description="Submit material specifications to initiate seller rate review and reserve physical inventory."
            maxWidth="md"
          >
            <form onSubmit={handleCreateRfq} className="space-y-4 text-xs text-slate-700">
              {rfqError && (
                <div className="p-3 rounded border border-rose-300 bg-rose-50 text-rose-900 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                  <span>{rfqError}</span>
                </div>
              )}

              <div>
                <label className="block text-slate-700 font-semibold mb-1">
                  Target Material Lot *
                </label>
                <Select
                  value={rfqListingId}
                  onChange={(e) => setRfqListingId(e.target.value)}
                  required
                >
                  {listings.map((l) => (
                    <option key={l.id} value={l.id}>
                      {l.grade} &bull; {l.form} ({l.thickness_in.toFixed(3)}&quot;) &bull; {l.quantity_tons}t avail &bull; ${l.price_per_ton}/t
                    </option>
                  ))}
                </Select>
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">
                  Requested Tonnage (tons) *
                </label>
                <Input
                  type="number"
                  step="0.5"
                  min="0.5"
                  value={rfqQuantityTons}
                  onChange={(e) => setRfqQuantityTons(Number(e.target.value))}
                  required
                  className="font-mono text-xs"
                />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div className="col-span-1">
                  <label className="block text-slate-700 font-semibold mb-1">City *</label>
                  <Input
                    value={rfqCity}
                    onChange={(e) => setRfqCity(e.target.value)}
                    required
                    className="text-xs"
                  />
                </div>
                <div className="col-span-1">
                  <label className="block text-slate-700 font-semibold mb-1">State *</label>
                  <Input
                    value={rfqState}
                    onChange={(e) => setRfqState(e.target.value.toUpperCase())}
                    maxLength={2}
                    required
                    className="font-mono text-xs uppercase"
                  />
                </div>
                <div className="col-span-1">
                  <label className="block text-slate-700 font-semibold mb-1">ZIP Code</label>
                  <Input
                    value={rfqZip}
                    onChange={(e) => setRfqZip(e.target.value)}
                    maxLength={5}
                    className="font-mono text-xs"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">
                  Logistics &amp; Delivery Instructions
                </label>
                <textarea
                  rows={2}
                  value={rfqNotes}
                  onChange={(e) => setRfqNotes(e.target.value)}
                  placeholder="Specify jobsite delivery requirements, overhead crane unloading, tarping..."
                  className="w-full text-xs rounded border border-slate-300 p-2 text-slate-900 focus:outline-none focus:ring-1 focus:ring-slate-900"
                />
              </div>

              <div className="p-2.5 rounded bg-slate-50 border border-slate-200 text-[11px] text-slate-600">
                Submitting creates an inquiry with preserved pricing estimates. The producing mill will review and issue a binding quote.
              </div>

              <div className="pt-2 border-t border-slate-200 flex justify-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setRfqModalOpen(false)}
                >
                  Cancel
                </Button>
                <Button type="submit" variant="primary" size="sm" disabled={rfqSubmitting}>
                  {rfqSubmitting ? "Submitting..." : "Submit Quote Request"}
                </Button>
              </div>
            </form>
          </Dialog>
        )}
      </div>
    </PageContainer>
  );
}

export default function OrdersPage() {
  return (
    <Suspense
      fallback={
        <PageContainer
          title="Orders & Quote Requests"
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
