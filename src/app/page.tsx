"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { 
  Search, 
  ArrowRight, 
  ShieldCheck, 
  Truck, 
  CheckCircle2, 
  Sparkles,
  AlertTriangle,
  FileCheck2,
  BadgeAlert,
  Compass,
  ArrowUpRight
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
      router.push(`/listings?search=${encodeURIComponent(searchQuery.trim())}`);
    } else {
      router.push("/listings");
    }
  }

  const workflowSteps = [
    {
      step: "01",
      title: "Define Engineering Specifications",
      description: "Specify structural, PVQ, or alloy requirements using natural language or ASTM/EN/JIS designations. Our assistant maps your application to compliant grades.",
      icon: Compass,
      linkText: "Launch Sourcing Assistant",
      linkHref: "/assistant"
    },
    {
      step: "02",
      title: "Inspect Verified Physical Lots",
      description: "Audit chemical ladle analysis, tensile pull tests, and Carbon Equivalent (CEV) values deterministically before issuing purchase orders.",
      icon: FileCheck2,
      linkText: "Browse Certified Inventory",
      linkHref: "/listings"
    },
    {
      step: "03",
      title: "Calculate Delivered Freight & Reserve",
      description: "Evaluate verified plates, coils, and beams with itemized delivered logistics calculated against legal 45,000 lb flatbed payload constraints.",
      icon: Truck,
      linkText: "Explore Landed Freight",
      linkHref: "/listings"
    },
  ];

  return (
    <div className="space-y-16 pb-16">
      {/* Hero Section */}
      <section className="border-b border-slate-200 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14 sm:py-20">
          <div className="max-w-3xl space-y-6">
            <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded bg-slate-100 border border-slate-200 text-slate-800 text-xs font-mono font-medium">
              <ShieldCheck className="w-3.5 h-3.5 text-slate-700" />
              <span>Certified MTR Conformance &bull; Delivered Landed Freight &bull; B2B Steel Marketplace</span>
            </div>

            <div className="space-y-3">
              <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight text-slate-900 leading-tight">
                Source physical steel inventory with certified metallurgical proof.
              </h1>
              <p className="text-base sm:text-lg text-slate-600 leading-relaxed">
                Industrial procurement buyers lose days deciphering paper Mill Test Reports, resolving ASTM chemistry mismatches, and negotiating freight rates. MillProof pairs verified inventory with deterministic quality audits, certified melt provenance, and instant jobsite trucking calculations.
              </p>
            </div>

            {/* Buyer-Oriented Search Box */}
            <form onSubmit={handleSearchSubmit} className="pt-2">
              <div className="flex flex-col sm:flex-row gap-2 max-w-2xl bg-white p-1.5 rounded-lg border border-slate-300 shadow-xs focus-within:border-slate-900 focus-within:ring-1 focus-within:ring-slate-900">
                <div className="flex items-center flex-1 px-2.5 gap-2.5">
                  <Search className="w-4 h-4 text-slate-400 shrink-0" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search by ASTM grade, thickness, form (e.g. A572 Gr 50 Plate 0.750&quot;)..."
                    className="w-full text-xs sm:text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none bg-transparent"
                    aria-label="Search steel marketplace inventory"
                  />
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <Button type="submit" variant="primary" size="sm" className="h-9 px-3.5">
                    Search Catalog
                  </Button>
                  <Button 
                    type="button" 
                    variant="outline" 
                    size="sm" 
                    className="h-9 px-3 text-slate-800"
                    onClick={() => {
                      if (searchQuery.trim()) {
                        router.push(`/assistant?prompt=${encodeURIComponent(searchQuery.trim())}`);
                      } else {
                        router.push("/assistant");
                      }
                    }}
                  >
                    <Sparkles className="w-3.5 h-3.5 mr-1 text-slate-700" />
                    Parse in Assistant
                  </Button>
                </div>
              </div>

              {/* Quick Search & Sourcing Chips */}
              <div className="space-y-2 pt-3">
                <div className="flex flex-wrap items-center gap-1.5 text-xs text-slate-500">
                  <span className="font-medium text-slate-700 text-[11px] uppercase font-mono">Catalog Grades:</span>
                  {[
                    "A572 Grade 50",
                    "A516 Gr 70 PVQ",
                    "A514 (T-1) 100 ksi",
                    "316L Stainless",
                    "A36 Master Coil",
                    "A992 Beam",
                  ].map((tag) => (
                    <button
                      key={tag}
                      type="button"
                      onClick={() => {
                        setSearchQuery(tag);
                        router.push(`/listings?search=${encodeURIComponent(tag)}`);
                      }}
                      className="px-2 py-0.5 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors text-xs font-mono"
                    >
                      {tag}
                    </button>
                  ))}
                </div>

                <div className="flex flex-wrap items-center gap-1.5 text-xs text-slate-500">
                  <span className="font-medium text-slate-700 text-[11px] uppercase font-mono flex items-center gap-1">
                    <Sparkles className="w-3 h-3 text-slate-700" />
                    Sourcing Prompts:
                  </span>
                  {[
                    { label: "40t Coastal Plate", prompt: "I need around 40 tons of steel for an outdoor structure near the coast. Corrosion resistance matters, and I need plate." },
                    { label: "5t Shaft Round Bar", prompt: "High torque rotating machine drive shaft, 5 tons of round bar requiring high surface hardenability." },
                    { label: "50t Bridge Beam 50ksi", prompt: "Commercial building structural columns and floor beams, 50 tons of wide flange beam requiring 50 ksi yield." },
                  ].map((ex) => (
                    <button
                      key={ex.label}
                      type="button"
                      onClick={() => {
                        router.push(`/assistant?prompt=${encodeURIComponent(ex.prompt)}`);
                      }}
                      className="px-2 py-0.5 rounded bg-blue-50 hover:bg-blue-100 text-blue-900 border border-blue-200 transition-colors text-xs font-mono"
                    >
                      {ex.label}
                    </button>
                  ))}
                </div>
              </div>
            </form>

            {/* Primary Action Buttons */}
            <div className="flex flex-wrap items-center gap-3 pt-2">
              <Link href="/listings">
                <Button variant="primary" size="md">
                  Explore Marketplace Catalog
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </Link>
              <Link href="/assistant">
                <Button variant="outline" size="md">
                  <Sparkles className="w-4 h-4 mr-2 text-slate-700" />
                  AI Sourcing Assistant
                </Button>
              </Link>
              <Link href="/sell">
                <Button variant="ghost" size="md">
                  Supplier MTR Ingestion
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* The Industrial Procurement Problem vs. MillProof Solution */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
        <div className="space-y-1.5 max-w-2xl">
          <Badge variant="outline" size="sm">Procurement Reality</Badge>
          <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">
            Why Steel Procurement Breaks Down
          </h2>
          <p className="text-xs sm:text-sm text-slate-600">
            Comparing conventional broker workflows with MillProof&apos;s verified procurement infrastructure.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* The Pain: Traditional Broker Procurement */}
          <Card className="border-rose-200 bg-rose-50/30 shadow-2xs">
            <CardHeader className="pb-3 border-b border-rose-100">
              <div className="flex items-center gap-2 text-rose-900">
                <BadgeAlert className="w-5 h-5 text-rose-600 shrink-0" />
                <CardTitle className="text-base text-rose-950">
                  Conventional Broker Workflow
                </CardTitle>
              </div>
              <CardDescription className="text-rose-800 text-xs">
                Friction-heavy manual verification with unexpected costs and risk.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-4 space-y-3 text-xs text-slate-700">
              <div className="space-y-2">
                <div className="flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                  <div>
                    <strong className="text-slate-900">Manual MTR Transcription:</strong> Buyers spend hours transcribing smudged paper PDFs to verify carbon and tensile compliance against engineering specs.
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                  <div>
                    <strong className="text-slate-900">Surprise Flatbed Freight Invoices:</strong> FOB mill pricing conceals highway mileage, diesel fuel surcharges, and costly multi-truckload overage splits.
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                  <div>
                    <strong className="text-slate-900">Unverified Melt Origin:</strong> Foreign non-conforming steel slips past inspection, disqualifying public projects under Buy America Act / BABA rules.
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                  <div>
                    <strong className="text-slate-900">Opaque Phone &amp; Email RFQs:</strong> Inquiries take days to quote, with zero price hold protection and unverified availability.
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* The Solution: MillProof Certified Procurement */}
          <Card className="border-emerald-200 bg-emerald-50/30 shadow-2xs">
            <CardHeader className="pb-3 border-b border-emerald-100">
              <div className="flex items-center gap-2 text-emerald-900">
                <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                <CardTitle className="text-base text-emerald-950">
                  MillProof Verified Platform
                </CardTitle>
              </div>
              <CardDescription className="text-emerald-800 text-xs">
                Deterministic mathematical compliance, instant landed costs, and certified provenance.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-4 space-y-3 text-xs text-slate-700">
              <div className="space-y-2">
                <div className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  <div>
                    <strong className="text-slate-900">Deterministic ASTM Audits:</strong> Verbatim chemical ladle analysis and tensile pull tests are mathematically checked against ASTM/SAE limits—zero guesswork.
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  <div>
                    <strong className="text-slate-900">Delivered Landed Cost Transparency:</strong> Every listing calculates road mileage, EIA diesel surcharges, and legal 45k lb flatbed splits directly to your destination ZIP.
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  <div>
                    <strong className="text-slate-900">Certified Melt &amp; Pour Provenance:</strong> Filter specifically for Buy America Act (BAA / BABA) qualified US melt or verified European standard material.
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  <div>
                    <strong className="text-slate-900">48-Hour Quote Reservation Hold:</strong> Formal quote submissions reserve material availability while preserving full audit-trail pricing estimates.
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
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
              <Card key={item.step} className="flex flex-col justify-between">
                <CardHeader>
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-mono text-xs font-bold text-slate-400">
                      {item.step}
                    </span>
                    <div className="w-8 h-8 rounded bg-slate-100 text-slate-700 flex items-center justify-center">
                      <Icon className="w-4 h-4" />
                    </div>
                  </div>
                  <CardTitle className="text-base">{item.title}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <p className="text-xs text-slate-600 leading-relaxed">
                    {item.description}
                  </p>
                  <div className="pt-2 border-t border-slate-100">
                    <Link
                      href={item.linkHref}
                      className="text-xs font-medium text-slate-800 hover:text-slate-950 inline-flex items-center gap-1 group"
                    >
                      <span>{item.linkText}</span>
                      <ArrowUpRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
                    </Link>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </section>

      {/* Preview of Available Material Listings */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-200">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">
                Available Physical Material Lots
              </h2>
              <Badge variant="demo" size="sm">Demo Inventory Preview</Badge>
            </div>
            <p className="text-xs text-slate-500">
              Representative synthetic inventory backed by standardized EN 10204 3.1 Mill Test Reports.
            </p>
          </div>

          <Link href="/listings" className="text-xs font-semibold text-slate-800 hover:text-slate-950 flex items-center gap-1">
            <span>View All {SYNTHETIC_LISTINGS.length} Lots in Catalog</span>
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

      {/* Clear Scope & Verification Notice */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="rounded-lg border border-slate-200 bg-white p-6 sm:p-8 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
            <div className="space-y-1">
              <span className="text-xs font-semibold text-slate-900 uppercase font-mono tracking-wider">
                Industrial Platform Principles
              </span>
              <p className="text-xs text-slate-600">
                Designed to eliminate commercial ambiguity without replacing structural engineering authority.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="outline" size="sm" className="text-[11px] font-mono">EN 10204 3.1</Badge>
              <Badge variant="outline" size="sm" className="text-[11px] font-mono">ASTM / ASME</Badge>
              <Badge variant="outline" size="sm" className="text-[11px] font-mono">EPA SmartWay</Badge>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 pt-1 text-xs text-slate-600 leading-relaxed">
            <div>
              <strong className="text-slate-900 block mb-1">Deterministic Quality Rules</strong>
              All chemistry ladle analyses and tensile test results are audited strictly against published ASTM tolerances with zero opaque AI judgement.
            </div>
            <div>
              <strong className="text-slate-900 block mb-1">Authentic Logistics Constraints</strong>
              Freight estimates are based on legal 45,000 lb flatbed trailer capacities, EIA diesel surcharges, and actual road distance circuity.
            </div>
            <div>
              <strong className="text-slate-900 block mb-1">Informational Guidance</strong>
              Screening recommendations and voice briefings are advisory and do not substitute for formal Engineer of Record (EOR) structural sign-off.
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
