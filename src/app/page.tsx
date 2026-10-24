"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { 
  Search, 
  ArrowRight, 
  ShieldCheck, 
  Layers, 
  Truck, 
  FileText, 
  CheckCircle2, 
  Building2, 
  Compass, 
  Scale, 
  Sparkles,
  Info
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { SYNTHETIC_LISTINGS } from "@/lib/data/synthetic-listings";

export default function LandingPage() {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState("");

  function handleSearchSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (searchQuery.trim()) {
      router.push(`/listings?q=${encodeURIComponent(searchQuery.trim())}`);
    } else {
      router.push("/listings");
    }
  }

  const workflowSteps = [
    {
      step: "01",
      title: "Define Engineering Specifications",
      description: "Specify structural, PVQ, or alloy requirements using natural language or standard ASTM/EN designations. Our assistant maps your application to compliant grades.",
      icon: Compass,
    },
    {
      step: "02",
      title: "Compare Inventory & Landed Freight",
      description: "Evaluate verified plates, coils, and structural shapes with itemized delivered logistics calculated against legal 45,000 lb flatbed payload constraints.",
      icon: Truck,
    },
    {
      step: "03",
      title: "Inspect Certified Batch MTRs",
      description: "Audit chemical heat analysis, tensile pull tests, and Carbon Equivalent (CEV) values deterministically before issuing purchase orders.",
      icon: ShieldCheck,
    },
  ];

  return (
    <div className="space-y-16 pb-16">
      {/* Hero Section */}
      <section className="border-b border-slate-200 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-24">
          <div className="max-w-3xl space-y-6">
            <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded bg-slate-100 border border-slate-200 text-slate-800 text-xs font-mono font-medium">
              <ShieldCheck className="w-3.5 h-3.5 text-slate-700" />
              <span>Deterministic Batch Compliance &bull; B2B Steel Marketplace</span>
            </div>

            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-slate-900 leading-tight">
              Source steel with confidence.
            </h1>

            <p className="text-base sm:text-lg text-slate-600 leading-relaxed">
              MillProof pairs verified physical steel inventory with deterministic Mill Test Report (MTR) quality audits, realistic delivered flatbed freight calculations, and intelligent requirement translation.
            </p>

            {/* Buyer-Oriented Search Box */}
            <form onSubmit={handleSearchSubmit} className="pt-2">
              <div className="flex flex-col sm:flex-row gap-2 max-w-2xl bg-white p-2 rounded-lg border border-slate-300 shadow-sm focus-within:border-slate-900 focus-within:ring-1 focus-within:ring-slate-900">
                <div className="flex items-center flex-1 px-2 gap-2.5">
                  <Search className="w-4 h-4 text-slate-400 shrink-0" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search by ASTM grade, thickness, form (e.g. A572 Gr 50 Plate 0.750&quot;)..."
                    className="w-full text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none bg-transparent"
                  />
                </div>
                <Button type="submit" variant="primary" size="md" className="shrink-0">
                  Search Inventory
                </Button>
              </div>

              {/* Search Suggestions */}
              <div className="flex flex-wrap items-center gap-2 pt-3 text-xs text-slate-500">
                <span className="font-medium text-slate-700">Quick Searches:</span>
                {[
                  "ASTM A572 Grade 50",
                  "A516 Gr 70 PVQ",
                  "A514 (T-1) 100 ksi",
                  "316L Stainless Plate",
                  "A36 Master Coil",
                ].map((tag) => (
                  <button
                    key={tag}
                    type="button"
                    onClick={() => {
                      setSearchQuery(tag);
                      router.push(`/listings?q=${encodeURIComponent(tag)}`);
                    }}
                    className="px-2 py-0.5 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors"
                  >
                    {tag}
                  </button>
                ))}
              </div>
            </form>

            {/* Primary Action Buttons */}
            <div className="flex flex-wrap items-center gap-3 pt-4">
              <Link href="/listings">
                <Button variant="primary" size="lg">
                  Explore Marketplace Catalog
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </Link>
              <Link href="/assistant">
                <Button variant="outline" size="lg">
                  <Sparkles className="w-4 h-4 mr-2 text-slate-600" />
                  AI Sourcing Assistant
                </Button>
              </Link>
              <Link href="/sell">
                <Button variant="ghost" size="lg">
                  Supplier MTR Ingestion
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Three Concise Workflow Steps */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
        <div className="space-y-1.5 max-w-2xl">
          <Badge variant="outline" size="sm">Procurement Workflow</Badge>
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900">
            Engineered for Industrial Steel Buyers
          </h2>
          <p className="text-xs sm:text-sm text-slate-600">
            A structured, transparent procurement process eliminating specification mismatch and surprise freight surcharges.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {workflowSteps.map((item) => {
            const Icon = item.icon;
            return (
              <Card key={item.step} className="relative">
                <CardHeader>
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-mono text-xs font-bold text-slate-400">
                      {item.step}
                    </span>
                    <div className="w-8 h-8 rounded bg-slate-100 text-slate-700 flex items-center justify-center">
                      <Icon className="w-4 h-4" />
                    </div>
                  </div>
                  <CardTitle>{item.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    {item.description}
                  </p>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </section>

      {/* Preview of Available Material Listings (Marked clearly as Demo Data) */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-200">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">
                Available Material Lots
              </h2>
              <Badge variant="demo" size="sm">Demo Data Preview</Badge>
            </div>
            <p className="text-xs text-slate-500">
              Representative synthetic inventory backed by standardized EN 10204 3.1 Mill Test Reports.
            </p>
          </div>

          <Link href="/listings" className="text-xs font-semibold text-slate-800 hover:text-slate-950 flex items-center gap-1">
            <span>View All {SYNTHETIC_LISTINGS.length} Lots</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {SYNTHETIC_LISTINGS.slice(0, 3).map((lot) => (
            <Card key={lot.id} elevated className="flex flex-col justify-between">
              <CardHeader>
                <div className="flex items-center justify-between gap-2 mb-1">
                  <span className="text-[10px] font-mono font-semibold px-1.5 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-200">
                    Heat: {lot.certificate?.heat_number}
                  </span>
                  <Badge variant="success" size="sm">ASTM Passed</Badge>
                </div>
                <CardTitle className="text-sm line-clamp-1">{lot.title}</CardTitle>
                <CardDescription>
                  {lot.dimensions_display} &bull; {lot.product_form}
                </CardDescription>
              </CardHeader>

              <CardContent className="space-y-3 pt-0">
                <div className="grid grid-cols-2 gap-2 text-xs py-2 border-y border-slate-100 font-mono">
                  <div>
                    <span className="text-[10px] text-slate-400 block uppercase">Base Price</span>
                    <span className="font-bold text-slate-900">${lot.price_per_cwt.toFixed(2)}/cwt</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 block uppercase">Available</span>
                    <span className="text-slate-700">{(lot.total_weight_lbs / 2000).toFixed(1)} tons</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 block uppercase">Yield Actual</span>
                    <span className="font-semibold text-slate-800">
                      {lot.certificate?.mechanical_results.yield_strength_ksi} ksi
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 block uppercase">Origin</span>
                    <span className="text-slate-700">{lot.warehouse_city}, {lot.warehouse_state}</span>
                  </div>
                </div>

                <div className="pt-1 flex items-center justify-between">
                  <Link href={`/listings/${lot.id}`} className="w-full">
                    <Button variant="outline" size="sm" className="w-full justify-between">
                      <span>Inspect Batch &amp; Freight</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </Button>
                  </Link>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* Clear Explanation of What MillProof Does */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="rounded-lg border border-slate-200 bg-white p-8 sm:p-10 space-y-6">
          <div className="space-y-2 max-w-3xl">
            <Badge variant="secondary" size="sm">Platform Purpose</Badge>
            <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">
              What MillProof Does
            </h2>
            <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
              In industrial steel procurement, buyers lose days transcribing paper Mill Test Reports, resolving ASTM chemistry mismatches, and negotiating freight rates. MillProof delivers a deterministic engineering workflow:
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 pt-2">
            <div className="space-y-2">
              <div className="font-semibold text-sm text-slate-900 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-slate-800 shrink-0" />
                <span>Deterministic Verification</span>
              </div>
              <p className="text-xs text-slate-600 leading-relaxed">
                Chemical ladle analysis and tensile properties are evaluated against standard ASTM tolerances strictly using deterministic math—never opaque AI judgements or speculative verification.
              </p>
            </div>

            <div className="space-y-2">
              <div className="font-semibold text-sm text-slate-900 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-slate-800 shrink-0" />
                <span>Delivered Cost Transparency</span>
              </div>
              <p className="text-xs text-slate-600 leading-relaxed">
                Every material listing calculates legal flatbed freight mileage, fuel surcharges, and multi-truckload partitioning based on 45,000 lb trailer limits to your destination ZIP.
              </p>
            </div>

            <div className="space-y-2">
              <div className="font-semibold text-sm text-slate-900 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-slate-800 shrink-0" />
                <span>EN 10204 3.1 Traceability</span>
              </div>
              <p className="text-xs text-slate-600 leading-relaxed">
                Suppliers upload material test certificates, and our system extracts heat numbers, chemistry, and pull tests for review before inventory publication.
              </p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
