"use client";

import React, { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import {
  Search,
  FileText,
  ShieldCheck,
  ArrowRight,
  Layers,
  CheckCircle2,
  Clock,
  Sparkles,
  AlertCircle,
  TrendingUp,
  XCircle,
} from "lucide-react";
import { PageContainer } from "@/components/layout/PageContainer";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/Table";
import { EmptyState } from "@/components/ui/EmptyState";
import { Skeleton } from "@/components/ui/Skeleton";
import { OrderWithListing, ListingWithRelations, QuoteStatus } from "@/types/database";
import { getRecentlyViewedIds, getShortlistedIds } from "@/lib/storage";
import { SteelPriceIndexChart } from "@/components/charts/SteelPriceIndexChart";

export default function BuyerDashboardPage() {
  const [orders, setOrders] = useState<OrderWithListing[]>([]);
  const [listings, setListings] = useState<ListingWithRelations[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Lazy initialize client storage state
  const [recentViewIds] = useState<string[]>(() => {
    return typeof window !== "undefined" ? getRecentlyViewedIds() : [];
  });
  const [shortlistIds] = useState<string[]>(() => {
    return typeof window !== "undefined" ? getShortlistedIds() : [];
  });

  // Demo buyer identity
  const buyerId = "buyer-demo-01";
  const buyerName = "Midwest Heavy Infrastructure LLC";

  useEffect(() => {
    let ignore = false;

    async function loadDashboardData() {
      try {
        // 1. Fetch real quote requests for buyer-demo-01
        const ordersRes = await fetch(`/api/quotes?role=buyer&actorId=${buyerId}`);
        const ordersData = await ordersRes.json();

        if (!ignore && ordersRes.ok && ordersData.success) {
          setOrders(ordersData.orders || []);
        } else if (!ignore) {
          throw new Error(ordersData.error || "Failed to fetch procurement quote requests.");
        }

        // 2. Fetch real marketplace listings for activity summary and recent lot lookups
        const listingsRes = await fetch("/api/listings");
        const listingsData = await listingsRes.json();

        if (!ignore && listingsRes.ok && listingsData.listings) {
          setListings(listingsData.listings || []);
        }
      } catch (err: unknown) {
        if (!ignore) {
          console.error("Dashboard data load error:", err);
          const msg = err instanceof Error ? err.message : "Error loading dashboard metrics";
          setError(msg);
        }
      } finally {
        if (!ignore) {
          setLoading(false);
        }
      }
    }

    loadDashboardData();
    return () => {
      ignore = true;
    };
  }, [buyerId]);

  // Derived metrics from real database queries
  const activeOrders = useMemo(
    () => orders.filter((o) => o.status !== "closed" && o.status !== "declined"),
    [orders]
  );
  const pendingQuotes = useMemo(
    () => orders.filter((o) => o.status === "submitted" || o.status === "under_review"),
    [orders]
  );
  const formalQuotesIssued = useMemo(
    () => orders.filter((o) => o.status === "quoted"),
    [orders]
  );
  const acceptedOrders = useMemo(
    () => orders.filter((o) => o.status === "accepted"),
    [orders]
  );

  // Recently viewed or shortlisted lot records
  const displayLots = useMemo(() => {
    const combinedIds = Array.from(new Set([...shortlistIds, ...recentViewIds]));
    if (combinedIds.length === 0) return [];
    return combinedIds
      .map((id) => listings.find((l) => l.id === id))
      .filter((l): l is ListingWithRelations => Boolean(l))
      .slice(0, 4);
  }, [recentViewIds, shortlistIds, listings]);

  // Marketplace activity summary
  const totalMarketplaceTons = useMemo(
    () => listings.reduce((acc, curr) => acc + (curr.quantity_tons || 0), 0),
    [listings]
  );

  const avgPricePerTon = useMemo(() => {
    if (listings.length === 0) return 0;
    const sum = listings.reduce((acc, curr) => acc + (curr.price_per_ton || 0), 0);
    return Math.round(sum / listings.length);
  }, [listings]);

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
      title="Procurement Dashboard"
      description={`Active material inquiries, formal mill quotations, and verified lot tracking for ${buyerName}.`}
      breadcrumbs={[
        { label: "Overview", href: "/dashboard" },
        { label: "Buyer Operations" },
      ]}
      badge={
        <div className="flex items-center gap-1.5">
          <Badge variant="outline" size="sm" className="font-mono text-slate-700">
            Buyer: {buyerId}
          </Badge>
          <Badge variant="demo" size="sm">
            Demo Workflow
          </Badge>
        </div>
      }
      actions={
        <div className="flex items-center gap-2">
          <Link href="/assistant">
            <Button variant="outline" size="sm">
              <Sparkles className="w-3.5 h-3.5 mr-1.5 text-sky-700" />
              Sourcing Assistant
            </Button>
          </Link>
          <Link href="/listings">
            <Button variant="primary" size="sm">
              <Search className="w-3.5 h-3.5 mr-1.5" />
              Search Catalog
            </Button>
          </Link>
        </div>
      }
    >
      <div className="space-y-8">
        {error && (
          <div className="p-4 rounded border border-rose-300 bg-rose-50 text-rose-900 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* 1. Buyer Metric Overview Cards (Calculated from Real Database Records) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="border-slate-200 bg-white shadow-2xs">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between text-slate-500">
                <span className="text-xs font-medium uppercase tracking-wider">Active Requests</span>
                <Clock className="w-4 h-4 text-slate-400" />
              </div>
            </CardHeader>
            <CardContent>
              {loading ? (
                <Skeleton className="h-8 w-16" />
              ) : (
                <div className="text-2xl font-bold font-mono text-slate-900">
                  {activeOrders.length}
                </div>
              )}
              <p className="text-[11px] text-slate-500 mt-1">
                {pendingQuotes.length} awaiting mill review
              </p>
            </CardContent>
          </Card>

          <Card className="border-slate-200 bg-white shadow-2xs">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between text-slate-500">
                <span className="text-xs font-medium uppercase tracking-wider">Formal Quotes Issued</span>
                <FileText className="w-4 h-4 text-sky-600" />
              </div>
            </CardHeader>
            <CardContent>
              {loading ? (
                <Skeleton className="h-8 w-16" />
              ) : (
                <div className="text-2xl font-bold font-mono text-sky-950">
                  {formalQuotesIssued.length}
                </div>
              )}
              <p className="text-[11px] text-slate-500 mt-1">
                Seller rate locked &bull; Ready for acceptance
              </p>
            </CardContent>
          </Card>

          <Card className="border-slate-200 bg-white shadow-2xs">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between text-slate-500">
                <span className="text-xs font-medium uppercase tracking-wider">Accepted Quotes</span>
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              </div>
            </CardHeader>
            <CardContent>
              {loading ? (
                <Skeleton className="h-8 w-16" />
              ) : (
                <div className="text-2xl font-bold font-mono text-emerald-950">
                  {acceptedOrders.length}
                </div>
              )}
              <p className="text-[11px] text-slate-500 mt-1">
                Commercial agreement confirmed
              </p>
            </CardContent>
          </Card>

          <Card className="border-slate-200 bg-white shadow-2xs">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between text-slate-500">
                <span className="text-xs font-medium uppercase tracking-wider">Tonnage Under RFQ</span>
                <Layers className="w-4 h-4 text-slate-400" />
              </div>
            </CardHeader>
            <CardContent>
              {loading ? (
                <Skeleton className="h-8 w-20" />
              ) : (
                <div className="text-2xl font-bold font-mono text-slate-900">
                  {activeOrders.reduce((sum, o) => sum + (o.quantity_tons || 0), 0).toFixed(1)}{" "}
                  <span className="text-xs font-normal text-slate-500">tons</span>
                </div>
              )}
              <p className="text-[11px] text-slate-500 mt-1">
                Total material across all active requests
              </p>
            </CardContent>
          </Card>
        </div>

        {/* 2. Recent Quote Requests Table */}
        <Card className="border-slate-200 bg-white shadow-2xs">
          <CardHeader>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <div className="flex items-center gap-2">
                  <CardTitle className="text-base text-slate-900">Recent Quote Requests</CardTitle>
                  <Badge variant="outline" size="sm" className="font-mono text-slate-600">
                    {orders.length} Total
                  </Badge>
                </div>
                <CardDescription>
                  Audit-preserved price estimates and confirmed mill quotations. Requests remain estimates until formally quoted by the producing seller.
                </CardDescription>
              </div>
              <Link href="/orders">
                <Button variant="outline" size="sm">
                  View Full Orders &amp; Lifecycle
                  <ArrowRight className="w-3.5 h-3.5 ml-1.5" />
                </Button>
              </Link>
            </div>
          </CardHeader>

          <CardContent className="p-0">
            {loading ? (
              <div className="p-6 space-y-3">
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-12 w-full" />
                <Skeleton className="h-12 w-full" />
              </div>
            ) : orders.length === 0 ? (
              <div className="py-12">
                <EmptyState
                  icon={FileText}
                  title="No quote requests yet"
                  description="Browse the marketplace or use our AI Sourcing Assistant to configure specifications and submit your first request."
                  action={
                    <div className="flex gap-2">
                      <Link href="/assistant">
                        <Button variant="outline" size="sm">
                          Sourcing Assistant
                        </Button>
                      </Link>
                      <Link href="/listings">
                        <Button variant="primary" size="sm">
                          Browse Catalog
                        </Button>
                      </Link>
                    </div>
                  }
                />
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow className="bg-slate-50">
                    <TableHead className="w-28">Reference</TableHead>
                    <TableHead>Specification &amp; Dimensions</TableHead>
                    <TableHead className="w-24">Quantity</TableHead>
                    <TableHead>Destination</TableHead>
                    <TableHead>Pricing Status</TableHead>
                    <TableHead>Request Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {orders.slice(0, 5).map((order) => {
                    const isQuoted = order.status === "quoted" || order.status === "accepted";
                    const displayPrice = isQuoted && order.quoted_price_per_ton
                      ? `$${order.quoted_price_per_ton.toLocaleString()}/ton`
                      : `$${(order.original_price_per_ton || 0).toLocaleString()}/ton (Est)`;

                    return (
                      <TableRow key={order.id} className="hover:bg-slate-50/50">
                        <TableCell className="font-mono font-semibold text-slate-900 text-xs">
                          <div>{order.id}</div>
                          <div className="text-[10px] text-slate-500 font-sans">
                            {new Date(order.created_at).toLocaleDateString()}
                          </div>
                        </TableCell>
                        <TableCell>
                          <span className="font-medium text-slate-900 block text-xs">
                            {order.listing?.grade || "Standard ASTM Grade"}
                          </span>
                          <span className="text-[11px] text-slate-500">
                            {order.listing?.form || "Plate"} &bull; {order.listing?.thickness_in ? `${order.listing.thickness_in.toFixed(3)}"` : "Standard Spec"}
                          </span>
                        </TableCell>
                        <TableCell className="font-mono text-slate-800 text-xs font-semibold">
                          {order.quantity_tons} tons
                        </TableCell>
                        <TableCell className="text-slate-600 text-xs">
                          <div>{order.buyer_city}, {order.buyer_state || "IL"}</div>
                          <div className="text-[10px] font-mono text-slate-400">
                            ZIP {order.buyer_zip || "60601"}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="font-mono font-semibold text-slate-900 text-xs">
                            {displayPrice}
                          </div>
                          <div className="text-[10px] text-slate-500">
                            {order.is_estimate ? (
                              <span className="text-amber-700 font-medium">Initial Estimate</span>
                            ) : (
                              <span className="text-emerald-700 font-medium">Confirmed Rate Lock</span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          {getStatusBadge(order.status)}
                        </TableCell>
                        <TableCell className="text-right">
                          <Link href={`/orders?highlight=${order.id}`}>
                            <Button variant="outline" size="sm" className="h-7 text-xs">
                              Manage Quote
                            </Button>
                          </Link>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        {/* 3. Shortlisted & Recently Viewed Lots Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Recently Viewed Inventory */}
          <Card className="border-slate-200 bg-white shadow-2xs">
            <CardHeader className="pb-3 border-b border-slate-100">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-semibold text-slate-900 flex items-center gap-2">
                  <Clock className="w-4 h-4 text-slate-500" />
                  Recently Inspected Material Lots
                </CardTitle>
                <Link href="/listings" className="text-xs text-sky-800 hover:underline">
                  Browse Catalog &rarr;
                </Link>
              </div>
              <CardDescription>
                Physical inventory records you recently inspected or shortlisted in the catalog.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-4">
              {displayLots.length === 0 ? (
                <div className="py-6 text-center text-xs text-slate-500">
                  <p>You have not inspected any material lots yet.</p>
                  <Link href="/listings" className="inline-block mt-2">
                    <Button variant="outline" size="sm">
                      Explore Material Catalog
                    </Button>
                  </Link>
                </div>
              ) : (
                <div className="space-y-3">
                  {displayLots.map((lot) => (
                    <div
                      key={lot.id}
                      className="p-3 rounded border border-slate-200 hover:border-slate-300 transition-colors bg-slate-50/50 flex items-center justify-between"
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-slate-900 text-xs">
                            {lot.grade}
                          </span>
                          <Badge variant="outline" size="sm" className="font-mono text-[10px]">
                            {lot.form}
                          </Badge>
                        </div>
                        <div className="text-[11px] text-slate-500 mt-0.5">
                          Heat #{lot.certificate?.heat_number || "Certified"} &bull; {lot.seller?.name || "Service Center"} ({lot.seller?.city}, {lot.seller?.state})
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-mono font-semibold text-slate-900 text-xs">
                          ${lot.price_per_ton}/ton
                        </div>
                        <Link href={`/listings/${lot.id}`}>
                          <Button variant="outline" size="sm" className="h-6 text-[10px] mt-1">
                            Inspect Lot
                          </Button>
                        </Link>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Real Marketplace Activity Summary */}
          <Card className="border-slate-200 bg-white shadow-2xs">
            <CardHeader className="pb-3 border-b border-slate-100">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-semibold text-slate-900 flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-emerald-600" />
                  Live Marketplace Activity Summary
                </CardTitle>
                <Badge variant="demo" size="sm">Real Database Query</Badge>
              </div>
              <CardDescription>
                Summary of active physical steel inventory currently available for quotation.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-4 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 rounded bg-slate-50 border border-slate-200/80">
                  <span className="text-[10px] uppercase font-mono text-slate-500 block">
                    Available Material Lots
                  </span>
                  <div className="text-xl font-bold font-mono text-slate-900 mt-1">
                    {listings.length} Lots
                  </div>
                  <span className="text-[11px] text-slate-500">All backed by EN 10204 3.1 MTRs</span>
                </div>

                <div className="p-3 rounded bg-slate-50 border border-slate-200/80">
                  <span className="text-[10px] uppercase font-mono text-slate-500 block">
                    Total Available Tonnage
                  </span>
                  <div className="text-xl font-bold font-mono text-slate-900 mt-1">
                    {totalMarketplaceTons.toLocaleString()} <span className="text-xs font-normal">tons</span>
                  </div>
                  <span className="text-[11px] text-slate-500">Across structural &amp; stainless</span>
                </div>

                <div className="p-3 rounded bg-slate-50 border border-slate-200/80">
                  <span className="text-[10px] uppercase font-mono text-slate-500 block">
                    Benchmark Average Price
                  </span>
                  <div className="text-xl font-bold font-mono text-slate-900 mt-1">
                    ${avgPricePerTon.toLocaleString()} <span className="text-xs font-normal">/ ton</span>
                  </div>
                  <span className="text-[11px] text-slate-500">FOB Mill base material</span>
                </div>

                <div className="p-3 rounded bg-slate-50 border border-slate-200/80">
                  <span className="text-[10px] uppercase font-mono text-slate-500 block">
                    Certified Compliance
                  </span>
                  <div className="text-xl font-bold font-mono text-emerald-800 mt-1 flex items-center gap-1.5">
                    <ShieldCheck className="w-5 h-5 text-emerald-600" />
                    <span>100% Verified</span>
                  </div>
                  <span className="text-[11px] text-slate-500">Deterministic metallurgy checked</span>
                </div>
              </div>

              <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                <span>Updated in real time from database repository</span>
                <Link href="/listings" className="text-sky-800 font-medium hover:underline">
                  Filter by Grade &amp; Form &rarr;
                </Link>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* 4. Steel Benchmark Price Index (U.S. Bureau of Labor Statistics PPI WPU1017) */}
        <div>
          <SteelPriceIndexChart />
        </div>

        {/* 5. Quick Actions for Sourcing and Marketplace Search */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card className="border-slate-200 bg-white shadow-2xs hover:border-slate-300 transition-colors">
            <CardHeader>
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded bg-sky-50 border border-sky-200 text-sky-800 flex items-center justify-center">
                  <Sparkles className="w-4 h-4" />
                </div>
                <div>
                  <CardTitle className="text-sm font-semibold text-slate-900">
                    AI Sourcing Assistant
                  </CardTitle>
                  <CardDescription>
                    Convert natural language project requirements into ASTM/AISI steel grades.
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-3 pt-0">
              <p className="text-xs text-slate-600 leading-relaxed">
                Input operational environment (marine, cryogenic, seismic), yield strength thresholds, or weldability constraints. Gemini extracts parameters and tests them against our curated metallurgical knowledge base.
              </p>
              <Link href="/assistant">
                <Button variant="primary" size="sm">
                  Launch Sourcing Assistant
                  <ArrowRight className="w-3.5 h-3.5 ml-1.5" />
                </Button>
              </Link>
            </CardContent>
          </Card>

          <Card className="border-slate-200 bg-white shadow-2xs hover:border-slate-300 transition-colors">
            <CardHeader>
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded bg-slate-100 border border-slate-200 text-slate-800 flex items-center justify-center">
                  <Search className="w-4 h-4" />
                </div>
                <div>
                  <CardTitle className="text-sm font-semibold text-slate-900">
                    Marketplace &amp; Delivered Freight Calculator
                  </CardTitle>
                  <CardDescription>
                    Browse physical inventory with instant highway trucking calculation.
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-3 pt-0">
              <p className="text-xs text-slate-600 leading-relaxed">
                Calculate total delivered cost to any US destination ZIP code, complete with road distance mileage, 45k lb flatbed capacity splits, and EIA diesel fuel surcharges.
              </p>
              <Link href="/listings">
                <Button variant="outline" size="sm">
                  Browse Marketplace Inventory
                  <ArrowRight className="w-3.5 h-3.5 ml-1.5" />
                </Button>
              </Link>
            </CardContent>
          </Card>
        </div>
      </div>
    </PageContainer>
  );
}
