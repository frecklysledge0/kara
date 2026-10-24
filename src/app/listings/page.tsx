"use client";

import React, { useState, useEffect, useMemo, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { 
  Search, 
  Truck, 
  MapPin, 
  ArrowRight,
  X,
  Building2,
  SlidersHorizontal,
  RefreshCw,
  CheckCircle2,
  Sparkles,
  TrendingUp,
  ShieldCheck,
  Scale,
} from "lucide-react";
import { PageContainer } from "@/components/layout/PageContainer";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Input } from "@/components/ui/Input";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/Table";
import { Skeleton } from "@/components/ui/Skeleton";
import { SteelPriceIndexChart } from "@/components/charts/SteelPriceIndexChart";
import { CURATED_GRADES } from "@/lib/data/grades";
import { estimateFreight, FreightCalculationResult } from "@/lib/freight";
import { calculateDeliveredCost } from "@/lib/engine/freight";
import { ListingWithRelations } from "@/types/database";

// Pre-defined buyer destination presets for instant freight calculations
const DESTINATION_PRESETS = [
  { label: "Chicago, IL (60601)", zip: "60601", city: "Chicago", state: "IL" },
  { label: "Detroit, MI (48201)", zip: "48201", city: "Detroit", state: "MI" },
  { label: "Houston, TX (77001)", zip: "77001", city: "Houston", state: "TX" },
  { label: "Pittsburgh, PA (15201)", zip: "15201", city: "Pittsburgh", state: "PA" },
];

function MarketplaceContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  // URL state synchronization
  const initialSearch = searchParams.get("search") || "";
  const initialGrade = searchParams.get("grade") || "ALL";
  const initialFamily = searchParams.get("family") || "ALL";
  const initialForm = searchParams.get("form") || "ALL";
  const initialState = searchParams.get("state") || "ALL";
  const initialSort = searchParams.get("sort") || "price_asc";
  const initialMaxPrice = searchParams.get("maxPrice") || "";
  const initialBuyerZip = searchParams.get("buyerZip") || "60601";
  const initialMeltCountry = searchParams.get("meltCountry") || "ALL";

  // Filter States
  const [searchTerm, setSearchTerm] = useState(initialSearch);
  const [selectedGrade, setSelectedGrade] = useState(initialGrade);
  const [selectedFamily, setSelectedFamily] = useState(initialFamily);
  const [selectedForm, setSelectedForm] = useState(initialForm);
  const [selectedMeltCountry, setSelectedMeltCountry] = useState(initialMeltCountry);
  const [selectedState, setSelectedState] = useState(initialState);
  const [selectedSort, setSelectedSort] = useState(initialSort);
  const [maxPrice, setMaxPrice] = useState(initialMaxPrice);
  const [buyerZip, setBuyerZip] = useState(initialBuyerZip);
  const [viewMode, setViewMode] = useState<"cards" | "table">("cards");
  const [mobileFilterOpen, setMobileFilterOpen] = useState(false);
  const [showMarketIndex, setShowMarketIndex] = useState(false);

  // Data Fetching State
  const [listings, setListings] = useState<ListingWithRelations[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  // Sync state to URL for shareable search states
  useEffect(() => {
    const params = new URLSearchParams();
    if (searchTerm) params.set("search", searchTerm);
    if (selectedGrade !== "ALL") params.set("grade", selectedGrade);
    if (selectedFamily !== "ALL") params.set("family", selectedFamily);
    if (selectedForm !== "ALL") params.set("form", selectedForm);
    if (selectedMeltCountry !== "ALL") params.set("meltCountry", selectedMeltCountry);
    if (selectedState !== "ALL") params.set("state", selectedState);
    if (selectedSort !== "price_asc") params.set("sort", selectedSort);
    if (maxPrice) params.set("maxPrice", maxPrice);
    if (buyerZip && buyerZip !== "60601") params.set("buyerZip", buyerZip);

    const qs = params.toString();
    const targetUrl = qs ? `/listings?${qs}` : "/listings";
    router.replace(targetUrl, { scroll: false });
  }, [searchTerm, selectedGrade, selectedFamily, selectedForm, selectedMeltCountry, selectedState, selectedSort, maxPrice, buyerZip, router]);

// Helper to safely extract human-readable grade name from various database shapes
function extractGradeName(raw: unknown, fallback = "ASTM A572 Grade 50"): string {
  if (typeof raw === "string" && raw.trim() && raw !== "[object Object]") return raw;
  if (typeof raw === "object" && raw !== null) {
    const record = raw as Record<string, unknown>;
    if (typeof record.grade_name === "string" && record.grade_name.trim()) {
      return record.grade_name;
    }
    if (typeof record.canonical_name === "string" && record.canonical_name.trim()) {
      return record.canonical_name;
    }
    if (typeof record.id === "string" && record.id.trim()) {
      return record.id.toUpperCase();
    }
    if (typeof record.grade === "string" && record.grade.trim() && record.grade !== "[object Object]") {
      return record.grade;
    }
  }
  return fallback;
}

  // Fetch real listings from established Supabase backend layer
  async function loadListings() {
    try {
      setIsLoading(true);
      setLoadError(null);
      const res = await fetch("/api/listings");
      if (!res.ok) {
        throw new Error(`Failed to load listings (${res.status})`);
      }
      const json = await res.json();

      // Transform backend listings into ListingWithRelations
      const rawListings: ListingWithRelations[] = (json.listings || []).map((l: Record<string, unknown>) => {
        const pricePerTon = Number(l.price_per_ton) || (Number(l.price_per_cwt) ? Number(l.price_per_cwt) * 20 : 1000);
        const qtyTons = Number(l.quantity_tons) || (Number(l.total_weight_lbs) ? Number(l.total_weight_lbs) / 2000 : 20);

        const resolvedGrade = extractGradeName(l.grade, typeof l.grade_name === "string" ? l.grade_name : "ASTM A572 Grade 50");

        return {
          id: String(l.id),
          seller_id: String(l.seller_id || ""),
          grade: resolvedGrade,
          form: String(l.product_form || l.form || "Plate"),
          thickness_in: Number(l.thickness_in) || 0.5,
          quantity_tons: qtyTons,
          price_per_ton: pricePerTon,
          certificate_id: (l.certificate_id as string) || (l.certificate as Record<string, unknown>)?.id as string || null,
          status: (l.status as "draft" | "active" | "reserved" | "closed") || "active",
          created_at: String(l.created_at || new Date().toISOString()),
          updated_at: String(l.updated_at || new Date().toISOString()),
          seller: (l.seller as Record<string, unknown>) ? {
            id: String((l.seller as Record<string, unknown>).id || ""),
            name: String((l.seller as Record<string, unknown>).name || "Verified Steel Service"),
            city: String((l.seller as Record<string, unknown>).city || (l.warehouse_city as string) || "Gary"),
            state: String((l.seller as Record<string, unknown>).state || (l.warehouse_state as string) || "IN"),
            country: "USA",
            latitude: Number((l.seller as Record<string, unknown>).latitude || l.warehouse_lat) || 41.5934,
            longitude: Number((l.seller as Record<string, unknown>).longitude || l.warehouse_lng) || -87.3464,
            mill_route: ((l.seller as Record<string, unknown>).mill_route as "EAF" | "BOF") || "EAF",
            description: null,
            demo_status: "active_demo",
            created_at: new Date().toISOString(),
          } : undefined,
          certificate: (l.certificate as Record<string, unknown>) ? {
            id: String((l.certificate as Record<string, unknown>).id || ""),
            seller_id: null,
            file_path: "vault/mtr.pdf",
            original_filename: "MTR.pdf",
            document_sha256: "sha256-demo",
            heat_number: String((l.certificate as Record<string, unknown>).heat_number || (l.certificate as Record<string, unknown>).heatNumber || "H-TEMP"),
            mill_name: String((l.certificate as Record<string, unknown>).mill_name || (l.certificate as Record<string, unknown>).millName || "Producing Mill"),
            grade: resolvedGrade,
            melt_pour_country: ((l.certificate as Record<string, unknown>).melt_pour_country as string) || ((l.certificate as Record<string, unknown>).mill_country as string) || null,
            chemistry: (l.certificate as Record<string, unknown>).chemical_analysis || {},
            mechanical: (l.certificate as Record<string, unknown>).mechanical_results || {},
            extraction_status: "completed",
            review_status: "approved",
            risk_score: 2,
            flags: [],
            extraction_metadata: {},
            created_at: new Date().toISOString(),
          } : null,
        };
      });

      // Filter to active listings only
      const activeOnly = rawListings.filter((l) => l.status === "active");
      setListings(activeOnly);
    } catch (err: unknown) {
      console.error("Listings load error:", err);
      const msg = err instanceof Error ? err.message : "Error connecting to Supabase database";
      setLoadError(msg);
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    let ignore = false;
    fetch("/api/listings")
      .then((res) => {
        if (!res.ok) throw new Error(`Failed to load listings (${res.status})`);
        return res.json();
      })
      .then((json) => {
        if (ignore) return;
        const rawListings: ListingWithRelations[] = (json.listings || []).map((l: Record<string, unknown>) => {
          const pricePerTon = Number(l.price_per_ton) || (Number(l.price_per_cwt) ? Number(l.price_per_cwt) * 20 : 1000);
          const qtyTons = Number(l.quantity_tons) || (Number(l.total_weight_lbs) ? Number(l.total_weight_lbs) / 2000 : 20);

          const resolvedGrade = extractGradeName(l.grade, typeof l.grade_name === "string" ? l.grade_name : "ASTM A572 Grade 50");

          return {
            id: String(l.id),
            seller_id: String(l.seller_id || ""),
            grade: resolvedGrade,
            form: String(l.product_form || l.form || "Plate"),
            thickness_in: Number(l.thickness_in) || 0.5,
            quantity_tons: qtyTons,
            price_per_ton: pricePerTon,
            certificate_id: (l.certificate_id as string) || (l.certificate as Record<string, unknown>)?.id as string || null,
            status: (l.status as "draft" | "active" | "reserved" | "closed") || "active",
            created_at: String(l.created_at || new Date().toISOString()),
            updated_at: String(l.updated_at || new Date().toISOString()),
            seller: (l.seller as Record<string, unknown>) ? {
              id: String((l.seller as Record<string, unknown>).id || ""),
              name: String((l.seller as Record<string, unknown>).name || "Verified Steel Service"),
              city: String((l.seller as Record<string, unknown>).city || (l.warehouse_city as string) || "Gary"),
              state: String((l.seller as Record<string, unknown>).state || (l.warehouse_state as string) || "IN"),
              country: "USA",
              latitude: Number((l.seller as Record<string, unknown>).latitude || l.warehouse_lat) || 41.5934,
              longitude: Number((l.seller as Record<string, unknown>).longitude || l.warehouse_lng) || -87.3464,
              mill_route: ((l.seller as Record<string, unknown>).mill_route as "EAF" | "BOF") || "EAF",
              description: null,
              demo_status: "active_demo",
              created_at: new Date().toISOString(),
            } : undefined,
            certificate: (l.certificate as Record<string, unknown>) ? {
              id: String((l.certificate as Record<string, unknown>).id || ""),
              seller_id: null,
              file_path: "vault/mtr.pdf",
              original_filename: "MTR.pdf",
              document_sha256: "sha256-demo",
              heat_number: String((l.certificate as Record<string, unknown>).heat_number || (l.certificate as Record<string, unknown>).heatNumber || "H-TEMP"),
              mill_name: String((l.certificate as Record<string, unknown>).mill_name || (l.certificate as Record<string, unknown>).millName || "Producing Mill"),
              grade: resolvedGrade,
              melt_pour_country: ((l.certificate as Record<string, unknown>).melt_pour_country as string) || ((l.certificate as Record<string, unknown>).mill_country as string) || null,
              chemistry: (l.certificate as Record<string, unknown>).chemical_analysis || {},
              mechanical: (l.certificate as Record<string, unknown>).mechanical_results || {},
              extraction_status: "completed",
              review_status: "approved",
              risk_score: 2,
              flags: [],
              extraction_metadata: {},
              created_at: new Date().toISOString(),
            } : null,
          };
        });
        setListings(rawListings.filter((l) => l.status === "active"));
        setIsLoading(false);
      })
      .catch((err) => {
        if (ignore) return;
        setLoadError(err instanceof Error ? err.message : "Error connecting to Supabase database");
        setIsLoading(false);
      });

    return () => {
      ignore = true;
    };
  }, []);

  // Compute material families available in curated knowledge base
  const materialFamilies = useMemo(() => {
    const families = new Set(CURATED_GRADES.map((g) => g.material_family));
    return Array.from(families).sort();
  }, []);

  // Compute available product forms
  const productForms = ["Plate", "Hot Rolled Coil", "Wide Flange Beam", "Round Bar", "Structural Tube"];

  // Compute available seller states from active listings
  const availableStates = useMemo(() => {
    const states = new Set(listings.map((l) => l.seller?.state).filter(Boolean));
    return Array.from(states).sort();
  }, [listings]);

  // Compute available melt and pour countries from explicit certificate evidence
  const availableMeltCountries = useMemo(() => {
    const countries = new Set<string>();
    listings.forEach((l) => {
      if (l.certificate?.melt_pour_country) {
        countries.add(l.certificate.melt_pour_country);
      }
    });
    return Array.from(countries).sort();
  }, [listings]);

  // Filter and sort listings
  const processedListings = useMemo(() => {
    return listings
      .map((lot) => {
        // Calculate delivered freight cost if buyer ZIP provided
        const pricePerCwt = lot.price_per_ton / 20.0;
        const totalWeightLbs = lot.quantity_tons * 2000;
        const warehouseLat = lot.seller?.latitude || 41.5934;
        const warehouseLng = lot.seller?.longitude || -87.3464;

        let deliveredCost = null;
        let freightResult: FreightCalculationResult | null = null;
        try {
          if (buyerZip && buyerZip.length === 5) {
            deliveredCost = calculateDeliveredCost({
              listingId: lot.id,
              warehouseCity: lot.seller?.city || "Gary",
              warehouseState: lot.seller?.state || "IN",
              warehouseLat,
              warehouseLng,
              destinationZip: buyerZip,
              weightLbs: totalWeightLbs,
              pricePerCwt,
              widthInches: 96,
              singlePieceWeightLbs: totalWeightLbs / 4,
            });

            freightResult = estimateFreight({
              sellerLocation: {
                lat: warehouseLat,
                lng: warehouseLng,
                city: lot.seller?.city || "Gary",
                state: lot.seller?.state || "IN",
              },
              buyerLocation: buyerZip,
              quantity: lot.quantity_tons,
              unit: "us_short_ton",
              pricePerTon: lot.price_per_ton,
            });
          }
        } catch (e) {
          console.warn("Freight calc note:", e);
        }

        // Material family resolution
        const matchedGrade = CURATED_GRADES.find((g) =>
          lot.grade.toLowerCase().includes(g.id.toLowerCase()) ||
          lot.grade.toLowerCase().includes(g.canonical_name.toLowerCase())
        );
        const materialFamily = matchedGrade?.material_family || "Structural Carbon Steel";

        return {
          ...lot,
          materialFamily,
          deliveredCost,
          freightResult,
          deliveredPricePerTon: freightResult?.estimatedDeliveredPricePerTon || (deliveredCost ? Number((deliveredCost.deliveredCostPerCwt * 20).toFixed(2)) : lot.price_per_ton),
        };
      })
      .filter((lot) => {
        // Search term matching
        if (searchTerm) {
          const q = searchTerm.toLowerCase().trim();
          const matches =
            lot.grade.toLowerCase().includes(q) ||
            lot.form.toLowerCase().includes(q) ||
            lot.materialFamily.toLowerCase().includes(q) ||
            lot.seller?.name.toLowerCase().includes(q) ||
            lot.seller?.city.toLowerCase().includes(q) ||
            lot.seller?.state.toLowerCase().includes(q) ||
            lot.certificate?.heat_number.toLowerCase().includes(q);

          if (!matches) return false;
        }

        // Grade filter
        if (selectedGrade !== "ALL") {
          const cleanGrade = selectedGrade.toLowerCase();
          if (!lot.grade.toLowerCase().includes(cleanGrade)) return false;
        }

        // Material family filter
        if (selectedFamily !== "ALL" && lot.materialFamily !== selectedFamily) {
          return false;
        }

        // Product form filter
        if (selectedForm !== "ALL") {
          if (!lot.form.toLowerCase().includes(selectedForm.toLowerCase())) return false;
        }

        // Seller State filter
        if (selectedState !== "ALL" && lot.seller?.state !== selectedState) {
          return false;
        }

        // Max price filter
        if (maxPrice && !isNaN(Number(maxPrice))) {
          if (lot.price_per_ton > Number(maxPrice)) return false;
        }

        // Melt and Pour country filtering based on explicit certificate evidence
        if (selectedMeltCountry !== "ALL") {
          const certCountry = lot.certificate?.melt_pour_country;
          if (selectedMeltCountry === "USA_BAA") {
            // Strict Buy America / BABA requires 100% US melt and pour
            if (certCountry !== "USA") return false;
          } else if (selectedMeltCountry === "UNSPECIFIED") {
            if (certCountry !== null && certCountry !== undefined) return false;
          } else {
            if (!certCountry || certCountry.toLowerCase() !== selectedMeltCountry.toLowerCase()) return false;
          }
        }

        return true;
      })
      .sort((a, b) => {
        if (selectedSort === "price_asc") return a.price_per_ton - b.price_per_ton;
        if (selectedSort === "price_desc") return b.price_per_ton - a.price_per_ton;
        if (selectedSort === "delivered_asc") return (a.deliveredPricePerTon || a.price_per_ton) - (b.deliveredPricePerTon || b.price_per_ton);
        if (selectedSort === "delivered_desc") return (b.deliveredPricePerTon || b.price_per_ton) - (a.deliveredPricePerTon || a.price_per_ton);
        if (selectedSort === "qty_desc") return b.quantity_tons - a.quantity_tons;
        if (selectedSort === "qty_asc") return a.quantity_tons - b.quantity_tons;
        if (selectedSort === "thickness_asc") return a.thickness_in - b.thickness_in;
        if (selectedSort === "thickness_desc") return b.thickness_in - a.thickness_in;
        if (selectedSort === "newest") return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
        return 0;
      });
  }, [listings, searchTerm, selectedGrade, selectedFamily, selectedForm, selectedMeltCountry, selectedState, selectedSort, maxPrice, buyerZip]);

  // Reset all active filters
  function handleResetFilters() {
    setSearchTerm("");
    setSelectedGrade("ALL");
    setSelectedFamily("ALL");
    setSelectedForm("ALL");
    setSelectedMeltCountry("ALL");
    setSelectedState("ALL");
    setSelectedSort("price_asc");
    setMaxPrice("");
    setBuyerZip("60601");
  }

  const hasActiveFilters =
    searchTerm !== "" ||
    selectedGrade !== "ALL" ||
    selectedFamily !== "ALL" ||
    selectedForm !== "ALL" ||
    selectedMeltCountry !== "ALL" ||
    selectedState !== "ALL" ||
    selectedSort !== "price_asc" ||
    maxPrice !== "" ||
    (buyerZip !== "" && buyerZip !== "60601");

  return (
    <PageContainer
      title="Material Marketplace &amp; Physical Inventory"
      description="Procure certified prime steel inventory lots backed by verified EN 10204 3.1 Mill Test Reports and real-time flatbed freight calculations."
      breadcrumbs={[
        { label: "Marketplace", href: "/listings" },
        { label: "Physical Inventory Catalog" },
      ]}
      badge={<Badge variant="outline" size="sm">Live Catalog</Badge>}
      actions={
        <div className="flex items-center gap-2">
          {/* Card / Table Toggle */}
          <div className="hidden sm:flex rounded border border-slate-200 bg-white p-0.5 text-xs shadow-2xs">
            <button
              onClick={() => setViewMode("cards")}
              className={`px-3 py-1 rounded transition-colors ${
                viewMode === "cards" ? "bg-slate-900 text-white font-medium" : "text-slate-600 hover:text-slate-900"
              }`}
            >
              Cards
            </button>
            <button
              onClick={() => setViewMode("table")}
              className={`px-3 py-1 rounded transition-colors ${
                viewMode === "table" ? "bg-slate-900 text-white font-medium" : "text-slate-600 hover:text-slate-900"
              }`}
            >
              Table
            </button>
          </div>

          <Link href="/compare">
            <Button variant="outline" size="sm" className="hidden md:flex items-center gap-1.5">
              <Scale className="w-3.5 h-3.5 text-slate-700" /> Compare Lots
            </Button>
          </Link>

          <Link href="/assistant">
            <Button variant="outline" size="sm" className="hidden sm:flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-slate-700" /> Sourcing Assistant
            </Button>
          </Link>

          <Button
            variant={showMarketIndex ? "secondary" : "outline"}
            size="sm"
            onClick={() => setShowMarketIndex(!showMarketIndex)}
            className="hidden sm:flex items-center gap-1.5"
          >
            <TrendingUp className="w-3.5 h-3.5 text-slate-700" />
            {showMarketIndex ? "Hide Market Index" : "Market Index (PPI)"}
          </Button>

          <Link href="/sell">
            <Button variant="primary" size="sm">
              List Materials (MTR Upload) <ArrowRight className="w-3.5 h-3.5 ml-1.5" />
            </Button>
          </Link>
        </div>
      }
    >
      <div className="space-y-6">
        {/* Error State Banner */}
        {loadError && (
          <div className="p-4 rounded border border-rose-300 bg-rose-50 text-rose-900 flex items-center justify-between">
            <div className="text-xs">
              <strong>Database Connection Notice:</strong> {loadError}
            </div>
            <Button size="sm" variant="outline" onClick={loadListings}>
              <RefreshCw className="w-3.5 h-3.5 mr-1" /> Retry
            </Button>
          </div>
        )}

        {/* Optional Collapsible Market Price Index (BLS PPI Series WPU1017) */}
        {showMarketIndex && (
          <div className="transition-all animate-in fade-in duration-200">
            <SteelPriceIndexChart />
          </div>
        )}

        {/* Search & Main Filter Controls Bar */}
        <Card className="border-slate-200 bg-white shadow-2xs">
          <CardContent className="p-4 space-y-3">
            {/* Row 1: Search Query + Destination ZIP */}
            <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
              <div className="md:col-span-8 relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                <Input
                  placeholder="Search by grade, family, seller name, heat number, or city..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9 text-xs"
                />
              </div>

              {/* Destination ZIP for delivered freight calculation */}
              <div className="md:col-span-4 relative flex items-center gap-1.5">
                <Truck className="w-4 h-4 text-slate-400 shrink-0 ml-1" />
                <div className="flex-1">
                  <Input
                    placeholder="Buyer ZIP (e.g. 60601)"
                    maxLength={5}
                    value={buyerZip}
                    onChange={(e) => setBuyerZip(e.target.value)}
                    className="font-mono text-xs"
                  />
                </div>
                <button
                  type="button"
                  onClick={() => setMobileFilterOpen(!mobileFilterOpen)}
                  className="sm:hidden p-2 rounded border border-slate-200 text-slate-700 bg-slate-50"
                  aria-label="Toggle Mobile Filters"
                >
                  <SlidersHorizontal className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Quick Destination Presets */}
            <div className="flex items-center gap-2 text-[11px] text-slate-500 overflow-x-auto pb-1">
              <span className="shrink-0 font-medium">Quick Freight Destination:</span>
              {DESTINATION_PRESETS.map((preset) => (
                <button
                  key={preset.zip}
                  type="button"
                  onClick={() => setBuyerZip(preset.zip)}
                  className={`px-2 py-0.5 rounded border text-[11px] whitespace-nowrap transition-colors ${
                    buyerZip === preset.zip
                      ? "bg-slate-900 text-white border-slate-900 font-medium"
                      : "bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100"
                  }`}
                >
                  {preset.city}, {preset.state}
                </button>
              ))}
            </div>

            {/* Row 2: Secondary Dropdown Filters */}
            <div className={`grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3 pt-2 border-t border-slate-100 ${mobileFilterOpen ? "block" : "hidden sm:grid"}`}>
              {/* Grade Selector */}
              <div>
                <label className="text-[10px] font-mono uppercase tracking-wider text-slate-500 block mb-1">
                  Steel Grade
                </label>
                <select
                  value={selectedGrade}
                  onChange={(e) => setSelectedGrade(e.target.value)}
                  className="w-full text-xs rounded border border-slate-300 bg-white px-2.5 py-1.5 text-slate-900 focus:outline-none focus:ring-1 focus:ring-slate-900"
                >
                  <option value="ALL">All ASTM / SAE Grades</option>
                  {CURATED_GRADES.map((g) => (
                    <option key={g.id} value={g.id}>
                      {g.canonical_name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Material Family */}
              <div>
                <label className="text-[10px] font-mono uppercase tracking-wider text-slate-500 block mb-1">
                  Material Family
                </label>
                <select
                  value={selectedFamily}
                  onChange={(e) => setSelectedFamily(e.target.value)}
                  className="w-full text-xs rounded border border-slate-300 bg-white px-2.5 py-1.5 text-slate-900 focus:outline-none focus:ring-1 focus:ring-slate-900"
                >
                  <option value="ALL">All Families</option>
                  {materialFamilies.map((fam) => (
                    <option key={fam} value={fam}>
                      {fam}
                    </option>
                  ))}
                </select>
              </div>

              {/* Product Form */}
              <div>
                <label className="text-[10px] font-mono uppercase tracking-wider text-slate-500 block mb-1">
                  Product Form
                </label>
                <select
                  value={selectedForm}
                  onChange={(e) => setSelectedForm(e.target.value)}
                  className="w-full text-xs rounded border border-slate-300 bg-white px-2.5 py-1.5 text-slate-900 focus:outline-none focus:ring-1 focus:ring-slate-900"
                >
                  <option value="ALL">All Product Forms</option>
                  {productForms.map((f) => (
                    <option key={f} value={f}>
                      {f}
                    </option>
                  ))}
                </select>
              </div>

              {/* Melt & Pour Country (Buy America Act / BABA) */}
              <div>
                <label className="text-[10px] font-mono uppercase tracking-wider text-slate-500 block mb-1">
                  Melt &amp; Pour (BAA/BABA)
                </label>
                <select
                  value={selectedMeltCountry}
                  onChange={(e) => setSelectedMeltCountry(e.target.value)}
                  className="w-full text-xs rounded border border-slate-300 bg-white px-2.5 py-1.5 text-slate-900 focus:outline-none focus:ring-1 focus:ring-slate-900 font-medium"
                >
                  <option value="ALL">All Melt/Pour Origins</option>
                  <option value="USA_BAA">USA (Buy America Qualified)</option>
                  {availableMeltCountries.filter((c) => c !== "USA").map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                  <option value="UNSPECIFIED">Unspecified / Non-BABA</option>
                </select>
              </div>

              {/* Seller State Location */}
              <div>
                <label className="text-[10px] font-mono uppercase tracking-wider text-slate-500 block mb-1">
                  Warehouse State
                </label>
                <select
                  value={selectedState}
                  onChange={(e) => setSelectedState(e.target.value)}
                  className="w-full text-xs rounded border border-slate-300 bg-white px-2.5 py-1.5 text-slate-900 focus:outline-none focus:ring-1 focus:ring-slate-900"
                >
                  <option value="ALL">All Warehouse States</option>
                  {availableStates.map((st) => (
                    <option key={st} value={st}>
                      {st}
                    </option>
                  ))}
                </select>
              </div>

              {/* Sorting Mode */}
              <div>
                <label className="text-[10px] font-mono uppercase tracking-wider text-slate-500 block mb-1">
                  Sort Order
                </label>
                <select
                  value={selectedSort}
                  onChange={(e) => setSelectedSort(e.target.value)}
                  className="w-full text-xs rounded border border-slate-300 bg-white px-2.5 py-1.5 text-slate-900 focus:outline-none focus:ring-1 focus:ring-slate-900"
                >
                  <option value="price_asc">Price: Low to High ($/ton)</option>
                  <option value="price_desc">Price: High to Low ($/ton)</option>
                  <option value="delivered_asc">Delivered Landed Cost: Low to High</option>
                  <option value="qty_desc">Available Tonnage: High to Low</option>
                  <option value="thickness_asc">Thickness: Thin to Heavy</option>
                  <option value="newest">Recently Listed</option>
                </select>
              </div>
            </div>

            {/* Active Filters Chips Bar */}
            {hasActiveFilters && (
              <div className="flex flex-wrap items-center gap-1.5 pt-2 border-t border-slate-100 text-xs">
                <span className="text-[11px] text-slate-500">Active filters:</span>
                {searchTerm && (
                  <Badge variant="secondary" size="sm" className="gap-1">
                    Search: &ldquo;{searchTerm}&rdquo;
                    <X className="w-3 h-3 cursor-pointer" onClick={() => setSearchTerm("")} />
                  </Badge>
                )}
                {selectedGrade !== "ALL" && (
                  <Badge variant="secondary" size="sm" className="gap-1">
                    Grade: {selectedGrade}
                    <X className="w-3 h-3 cursor-pointer" onClick={() => setSelectedGrade("ALL")} />
                  </Badge>
                )}
                {selectedFamily !== "ALL" && (
                  <Badge variant="secondary" size="sm" className="gap-1">
                    Family: {selectedFamily}
                    <X className="w-3 h-3 cursor-pointer" onClick={() => setSelectedFamily("ALL")} />
                  </Badge>
                )}
                {selectedForm !== "ALL" && (
                  <Badge variant="secondary" size="sm" className="gap-1">
                    Form: {selectedForm}
                    <X className="w-3 h-3 cursor-pointer" onClick={() => setSelectedForm("ALL")} />
                  </Badge>
                )}
                {selectedMeltCountry !== "ALL" && (
                  <Badge variant="secondary" size="sm" className="gap-1">
                    Melt &amp; Pour: {selectedMeltCountry === "USA_BAA" ? "USA (BAA Qualified)" : selectedMeltCountry}
                    <X className="w-3 h-3 cursor-pointer" onClick={() => setSelectedMeltCountry("ALL")} />
                  </Badge>
                )}
                {selectedState !== "ALL" && (
                  <Badge variant="secondary" size="sm" className="gap-1">
                    State: {selectedState}
                    <X className="w-3 h-3 cursor-pointer" onClick={() => setSelectedState("ALL")} />
                  </Badge>
                )}
                <Button size="sm" variant="ghost" onClick={handleResetFilters} className="text-xs text-slate-500 hover:text-slate-900 h-6 px-2">
                  Clear All Filters
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Results Metadata Bar */}
        <div className="flex items-center justify-between text-xs text-slate-600 px-1">
          <div>
            Showing <strong>{processedListings.length}</strong> available material lot{processedListings.length === 1 ? "" : "s"}
            {buyerZip && (
              <span className="ml-1 text-slate-500 font-mono">
                &bull; Freight calculated to ZIP {buyerZip}
              </span>
            )}
          </div>
          <div className="hidden sm:flex items-center gap-2">
            <span className="inline-flex items-center gap-1 text-[11px] text-slate-500">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> QC checks passed
            </span>
            <span className="inline-flex items-center gap-1 text-[11px] text-slate-500">
              <Badge variant="demo" size="sm" className="text-[10px] py-0 px-1">DEMO</Badge> Synthetic Benchmark
            </span>
          </div>
        </div>

        {/* Loading State Skeletons */}
        {isLoading && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3, 4, 5, 6].map((idx) => (
              <Card key={idx} className="p-6 space-y-4">
                <Skeleton className="h-6 w-3/4" />
                <Skeleton className="h-4 w-1/2" />
                <div className="space-y-2 pt-4">
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-5/6" />
                </div>
                <div className="pt-4 flex justify-between">
                  <Skeleton className="h-8 w-24" />
                  <Skeleton className="h-8 w-24" />
                </div>
              </Card>
            ))}
          </div>
        )}

        {/* Empty State */}
        {!isLoading && processedListings.length === 0 && (
          <Card className="border-slate-200 bg-white">
            <CardContent className="p-12 text-center space-y-4">
              <div className="w-12 h-12 rounded bg-slate-100 flex items-center justify-center text-slate-500 mx-auto">
                <Search className="w-6 h-6" />
              </div>
              <div className="space-y-1">
                <h3 className="text-base font-semibold text-slate-900">No matching steel inventory lots found</h3>
                <p className="text-xs text-slate-500 max-w-md mx-auto">
                  No active lots match your current search and filter combination. Try clearing filters or searching for standard carbon grades like A36 or A572.
                </p>
              </div>
              <div>
                <Button variant="primary" size="sm" onClick={handleResetFilters}>
                  Reset All Filters
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* View Mode: Cards */}
        {!isLoading && processedListings.length > 0 && viewMode === "cards" && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {processedListings.map((lot) => {
              const pricePerCwt = (lot.price_per_ton / 20.0).toFixed(2);

              return (
                <Card
                  key={lot.id}
                  className="hover:shadow-md transition-shadow border-slate-200 bg-white flex flex-col justify-between"
                >
                  <CardHeader className="pb-3 space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <div className="space-y-0.5">
                        <span className="text-[11px] font-mono text-slate-500 uppercase tracking-wider">
                          {lot.materialFamily}
                        </span>
                        <CardTitle className="text-base font-semibold text-slate-900 line-clamp-1">
                          {lot.grade}
                        </CardTitle>
                      </div>
                      <Badge variant="demo" size="sm" className="font-mono text-[10px] shrink-0">
                        DEMO LOT
                      </Badge>
                    </div>

                    {/* Dimensions & Form */}
                    <div className="text-xs text-slate-600 font-medium">
                      {lot.form} &bull; {lot.thickness_in.toFixed(3)}&quot; thickness
                    </div>
                  </CardHeader>

                  <CardContent className="space-y-4 pt-0 flex-1 flex flex-col justify-between">
                    <div className="space-y-3">
                      {/* Price & Quantity Grid */}
                      <div className="p-3 rounded bg-slate-50/70 border border-slate-200/60 grid grid-cols-2 gap-2 text-xs">
                        <div>
                          <span className="text-[10px] font-mono text-slate-500 uppercase block">FOB Mill Price</span>
                          <span className="text-base font-bold font-mono text-slate-900">
                            ${lot.price_per_ton.toLocaleString()}
                          </span>
                          <span className="text-[11px] text-slate-500 block">
                            ${pricePerCwt}/cwt
                          </span>
                        </div>

                        <div>
                          <span className="text-[10px] font-mono text-slate-500 uppercase block">Available Lot</span>
                          <span className="text-base font-bold font-mono text-slate-900">
                            {lot.quantity_tons.toFixed(1)} tons
                          </span>
                          <span className="text-[11px] text-slate-500 block">
                            {(lot.quantity_tons * 2000).toLocaleString()} lbs
                          </span>
                        </div>
                      </div>

                      {/* Delivered Landed Cost Callout */}
                      {lot.freightResult && lot.freightResult.success ? (
                        <div className="p-2.5 rounded bg-sky-50/60 border border-sky-200/80 text-xs space-y-1.5">
                          <div className="flex items-center justify-between">
                            <span className="text-[11px] font-medium text-sky-950 flex items-center gap-1">
                              <Truck className="w-3.5 h-3.5 text-sky-700" />
                              Delivered to {buyerZip}:
                            </span>
                            <span className="text-xs font-bold font-mono text-sky-950">
                              ${lot.deliveredPricePerTon.toLocaleString()} / ton
                            </span>
                          </div>
                          <div className="flex items-center justify-between text-[11px] text-sky-800">
                            <span>{lot.freightResult.estimatedRoadDistanceMiles} route mi &bull; {lot.freightResult.approximateLeadTimeText}</span>
                            <span className="font-mono">Freight: ${lot.freightResult.estimatedShipmentFreight.toLocaleString()}</span>
                          </div>
                          <div className="pt-1 border-t border-sky-200/60 flex items-center justify-between text-[10px] text-slate-500">
                            <span>1.15x road circuity &bull; 45k lb limit</span>
                            <span className="text-sky-900 font-mono">${lot.freightResult.freightPerTon.toFixed(0)}/ton freight</span>
                          </div>
                        </div>
                      ) : (
                        <div className="p-2 rounded bg-slate-50 border border-slate-200/60 text-[11px] text-slate-500 flex items-center justify-between">
                          <span className="flex items-center gap-1">
                            <MapPin className="w-3 h-3 text-slate-400" />
                            {!buyerZip ? "Enter destination ZIP for freight" : "Location data pending"}
                          </span>
                          <span className="font-mono text-[10px]">FOB only</span>
                        </div>
                      )}

                      {/* Seller & Facility Info */}
                      <div className="text-xs text-slate-600 space-y-1 pt-1">
                        <div className="flex items-center justify-between">
                          <span className="text-slate-500 flex items-center gap-1">
                            <Building2 className="w-3 h-3 text-slate-400" />
                            {lot.seller?.name}
                          </span>
                          {lot.seller?.mill_route && (
                            <span className="text-[10px] font-mono px-1 rounded bg-slate-100 text-slate-700 border border-slate-200">
                              {lot.seller.mill_route} Furnace
                            </span>
                          )}
                        </div>

                        <div className="flex items-center justify-between text-[11px] text-slate-500">
                          <span className="flex items-center gap-1">
                            <MapPin className="w-3 h-3 text-slate-400" />
                            {lot.seller?.city}, {lot.seller?.state}
                          </span>
                          {lot.certificate?.heat_number && (
                            <span className="font-mono">
                              Heat #{lot.certificate.heat_number}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Explicit Certificate Provenance & QC Status Badge */}
                      <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px]">
                        {lot.certificate?.melt_pour_country === "USA" ? (
                          <span className="inline-flex items-center gap-1 text-emerald-800 font-medium text-[11px]">
                            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                            Melt: USA (BAA)
                          </span>
                        ) : lot.certificate?.melt_pour_country ? (
                          <span className="inline-flex items-center gap-1 text-slate-700 font-mono text-[10px]">
                            Melt: {lot.certificate.melt_pour_country}
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-amber-700 font-medium text-[10px]">
                            Melt: Unspecified
                          </span>
                        )}
                        <span className="text-slate-500 font-mono text-[10px]">
                          {lot.certificate?.heat_number ? `Heat #${lot.certificate.heat_number}` : "Certified"}
                        </span>
                      </div>
                    </div>

                    {/* Action Link to Batch Passport */}
                    <div className="pt-3">
                      <Link href={`/listings/${lot.id}`} className="w-full block">
                        <Button variant="outline" size="sm" className="w-full justify-between">
                          <span>Inspect Batch Passport</span>
                          <ArrowRight className="w-3.5 h-3.5 text-slate-400" />
                        </Button>
                      </Link>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}

        {/* View Mode: Compact Industrial Table */}
        {!isLoading && processedListings.length > 0 && viewMode === "table" && (
          <Card className="border-slate-200 bg-white shadow-2xs overflow-hidden">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-slate-50">
                    <TableHead>Specification &amp; Grade</TableHead>
                    <TableHead>Product Form</TableHead>
                    <TableHead>Thickness</TableHead>
                    <TableHead>Available Qty</TableHead>
                    <TableHead>FOB Price ($/ton)</TableHead>
                    <TableHead>Delivered ({buyerZip})</TableHead>
                    <TableHead>Producing Facility</TableHead>
                    <TableHead>Provenance &amp; Traceability</TableHead>
                    <TableHead className="text-right">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {processedListings.map((lot) => (
                    <TableRow key={lot.id} className="hover:bg-slate-50/50">
                      <TableCell className="font-semibold text-slate-900">
                        <Link href={`/listings/${lot.id}`} className="hover:underline">
                          {lot.grade}
                        </Link>
                        <span className="text-[10px] text-slate-500 block font-normal">
                          {lot.materialFamily}
                        </span>
                      </TableCell>
                      <TableCell className="text-xs text-slate-700">{lot.form}</TableCell>
                      <TableCell className="text-xs font-mono">{lot.thickness_in.toFixed(3)}&quot;</TableCell>
                      <TableCell className="text-xs font-mono font-semibold text-slate-900">
                        {lot.quantity_tons.toFixed(1)} tons
                      </TableCell>
                      <TableCell className="text-xs font-mono font-bold text-slate-900">
                        ${lot.price_per_ton.toLocaleString()}
                        <span className="text-[10px] text-slate-500 block font-normal">
                          ${(lot.price_per_ton / 20).toFixed(2)}/cwt
                        </span>
                      </TableCell>
                      <TableCell className="text-xs font-mono text-sky-950 font-semibold">
                        {lot.deliveredCost ? (
                          <>
                            ${lot.deliveredPricePerTon.toLocaleString()}
                            <span className="text-[10px] text-slate-500 block font-normal">
                              {lot.deliveredCost.distanceMiles} mi route
                            </span>
                          </>
                        ) : (
                          <span className="text-slate-400">&mdash;</span>
                        )}
                      </TableCell>
                      <TableCell className="text-xs text-slate-700">
                        <div>{lot.seller?.name}</div>
                        <span className="text-[11px] text-slate-500">
                          {lot.seller?.city}, {lot.seller?.state}
                        </span>
                      </TableCell>
                      <TableCell className="text-xs font-mono">
                        {lot.certificate?.heat_number ? (
                          <div>
                            <Badge variant="outline" size="sm" className="font-mono text-[10px]">
                              {lot.certificate.heat_number}
                            </Badge>
                            {lot.certificate.melt_pour_country === "USA" ? (
                              <span className="text-[10px] text-emerald-800 font-semibold block mt-0.5">
                                Melt: USA (BAA)
                              </span>
                            ) : lot.certificate.melt_pour_country ? (
                              <span className="text-[10px] text-slate-600 block mt-0.5">
                                Melt: {lot.certificate.melt_pour_country}
                              </span>
                            ) : (
                              <span className="text-[10px] text-amber-700 italic block mt-0.5">
                                Melt: Unspecified
                              </span>
                            )}
                          </div>
                        ) : (
                          <span className="text-slate-400">Uncertified</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <Link href={`/listings/${lot.id}`}>
                          <Button size="sm" variant="outline">
                            Inspect
                          </Button>
                        </Link>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </Card>
        )}
      </div>
    </PageContainer>
  );
}

export default function ListingsPage() {
  return (
    <Suspense fallback={<div className="p-12 text-center text-xs text-slate-500 font-mono">Loading inventory catalog...</div>}>
      <MarketplaceContent />
    </Suspense>
  );
}
