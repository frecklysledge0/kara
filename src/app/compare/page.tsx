"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { 
  Scale, 
  Trash2, 
  CheckCircle2, 
  AlertTriangle, 
  Truck, 
  FileText, 
  Flame, 
  ArrowRight, 
  Download,
  Building,
  PlusCircle,
  MapPin
} from "lucide-react";
import { InventoryListing, DeliveredCostBreakdown } from "@/types/steel";
import { calculateDeliveredCost } from "@/lib/engine/freight";
import { getAllListings } from "@/lib/data/listings-store";
import { SYNTHETIC_LISTINGS } from "@/lib/data/synthetic-listings";

export default function ComparePage() {
  const [comparedListings, setComparedListings] = useState<InventoryListing[]>([]);
  const [destinationZip, setDestinationZip] = useState<string>("60601");
  const [showRfqModal, setShowRfqModal] = useState<InventoryListing | null>(null);
  const [rfqSubmitted, setRfqSubmitted] = useState<string | null>(null);

  // RFQ Form State
  const [buyerName, setBuyerName] = useState("");
  const [buyerCompany, setBuyerCompany] = useState("");
  const [buyerEmail, setBuyerEmail] = useState("");

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
        setComparedListings(filtered);
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

  function handleRfqSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!showRfqModal) return;

    const rfqId = `RFQ-${Math.floor(100000 + Math.random() * 900000)}`;
    setRfqSubmitted(rfqId);
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-10">
      {/* Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-2">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-800 text-amber-400 text-xs font-semibold border border-slate-700">
            <Scale className="w-3.5 h-3.5" />
            <span>Multi-Lot Comparison Matrix</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
            Side-by-Side Batch &amp; Delivered Cost Comparison
          </h1>
          <p className="text-sm text-slate-300 max-w-3xl leading-relaxed">
            Evaluate material batches side-by-side across metallurgical limits, mechanical tensile pull tests, carbon equivalents ($CEV$), and delivered logistics costs to your facility.
          </p>
        </div>

        {/* Destination ZIP control */}
        <div className="flex items-center gap-2 bg-slate-900 border border-slate-800 p-2.5 rounded-xl text-xs">
          <MapPin className="w-4 h-4 text-sky-400" />
          <span className="text-slate-400 font-mono">Delivered To:</span>
          <input
            type="text"
            maxLength={5}
            value={destinationZip}
            onChange={(e) => setDestinationZip(e.target.value)}
            className="w-20 px-2 py-1 rounded bg-slate-950 border border-slate-700 font-mono text-white text-center font-bold focus:border-amber-500 focus:outline-none"
          />
        </div>
      </div>

      {/* Comparison Grid Table */}
      {comparedListings.length === 0 ? (
        <div className="p-16 rounded-2xl border border-slate-800 bg-slate-900/30 text-center space-y-4">
          <Scale className="w-10 h-10 text-amber-400 mx-auto" />
          <h3 className="text-lg font-bold text-white">No Lots Currently Selected for Comparison</h3>
          <p className="text-xs text-slate-400 max-w-sm mx-auto">
            Browse the marketplace catalog and click &quot;Add to Compare&quot; on up to 4 lots.
          </p>
          <Link
            href="/procure"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs transition-colors"
          >
            <span>Browse Available Lots</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-slate-800 bg-slate-900/60 shadow-xl">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-950 border-b border-slate-800">
              <tr>
                <th className="p-4 w-48 text-slate-400 font-mono uppercase">Attribute</th>
                {comparedListings.map((lot) => (
                  <th key={lot.id} className="p-4 min-w-[260px] text-slate-200">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <span className="text-[10px] font-mono font-bold text-amber-400 uppercase block">
                          Heat: {lot.certificate?.heat_number}
                        </span>
                        <h4 className="text-sm font-bold text-white line-clamp-1">{lot.title}</h4>
                      </div>
                      <button
                        onClick={() => removeLot(lot.id)}
                        className="text-slate-400 hover:text-rose-400 transition-colors p-1"
                        title="Remove lot from comparison"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </th>
                ))}
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-800/80">
              {/* Grade & Form */}
              <tr className="hover:bg-slate-900/40">
                <td className="p-4 font-semibold text-slate-400 font-mono">Standard Grade &amp; Form</td>
                {comparedListings.map((lot) => (
                  <td key={lot.id} className="p-4">
                    <span className="font-bold text-white block">{lot.grade?.grade_name || lot.grade_id}</span>
                    <span className="text-slate-400 text-[11px]">{lot.product_form}</span>
                  </td>
                ))}
              </tr>

              {/* Dimensions */}
              <tr className="hover:bg-slate-900/40">
                <td className="p-4 font-semibold text-slate-400 font-mono">Dimensions</td>
                {comparedListings.map((lot) => (
                  <td key={lot.id} className="p-4 font-mono text-slate-200">
                    {lot.dimensions_display}
                  </td>
                ))}
              </tr>

              {/* Available Weight */}
              <tr className="hover:bg-slate-900/40">
                <td className="p-4 font-semibold text-slate-400 font-mono">Total Lot Weight</td>
                {comparedListings.map((lot) => (
                  <td key={lot.id} className="p-4 font-mono text-slate-200">
                    {lot.total_weight_lbs.toLocaleString()} lbs ({(lot.total_weight_lbs / 2000).toFixed(1)} tons) &bull; {lot.pieces_available} pcs
                  </td>
                ))}
              </tr>

              {/* Base Price */}
              <tr className="hover:bg-slate-900/40">
                <td className="p-4 font-semibold text-slate-400 font-mono">Base Price (FOB Origin)</td>
                {comparedListings.map((lot) => (
                  <td key={lot.id} className="p-4">
                    <span className="text-base font-bold text-amber-400 font-mono block">
                      ${lot.price_per_cwt.toFixed(2)} / cwt
                    </span>
                    <span className="text-[11px] text-slate-400 font-mono">
                      FOB {lot.warehouse_city}, {lot.warehouse_state}
                    </span>
                  </td>
                ))}
              </tr>

              {/* Delivered Price */}
              <tr className="bg-sky-950/20 hover:bg-sky-950/30">
                <td className="p-4 font-semibold text-sky-400 font-mono">
                  Delivered Landed Cost (to {destinationZip})
                </td>
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
                    widthInches: lot.width_in
                  });

                  return (
                    <td key={lot.id} className="p-4">
                      <span className="text-lg font-bold text-sky-300 font-mono block">
                        ${delivered.deliveredCostPerCwt.toFixed(2)} / cwt
                      </span>
                      <span className="text-[11px] text-slate-300 font-mono block">
                        Total Order: ${delivered.totalDeliveredCost.toLocaleString()}
                      </span>
                      <span className="text-[10px] text-slate-400 font-mono block mt-0.5">
                        {delivered.distanceMiles} miles &bull; {delivered.truckloadsRequired} flatbed(s)
                      </span>
                    </td>
                  );
                })}
              </tr>

              {/* Yield Strength */}
              <tr className="hover:bg-slate-900/40">
                <td className="p-4 font-semibold text-slate-400 font-mono">Yield Strength Actual</td>
                {comparedListings.map((lot) => (
                  <td key={lot.id} className="p-4">
                    <span className="text-sm font-bold text-white font-mono block">
                      {lot.certificate?.mechanical_results.yield_strength_ksi} ksi
                    </span>
                    <span className="text-[10px] text-emerald-400 font-mono">
                      Min req: {lot.grade?.mech_limits.yield_min_ksi ?? 36} ksi
                    </span>
                  </td>
                ))}
              </tr>

              {/* Tensile Strength */}
              <tr className="hover:bg-slate-900/40">
                <td className="p-4 font-semibold text-slate-400 font-mono">Tensile Strength Actual</td>
                {comparedListings.map((lot) => (
                  <td key={lot.id} className="p-4 font-mono text-slate-200">
                    {lot.certificate?.mechanical_results.tensile_strength_ksi} ksi
                  </td>
                ))}
              </tr>

              {/* Elongation */}
              <tr className="hover:bg-slate-900/40">
                <td className="p-4 font-semibold text-slate-400 font-mono">Elongation (2-in)</td>
                {comparedListings.map((lot) => (
                  <td key={lot.id} className="p-4 font-mono text-slate-200">
                    {lot.certificate?.mechanical_results.elongation_pct}%
                  </td>
                ))}
              </tr>

              {/* Carbon Equivalent */}
              <tr className="hover:bg-slate-900/40">
                <td className="p-4 font-semibold text-slate-400 font-mono">Carbon Equivalent ($CEV$)</td>
                {comparedListings.map((lot) => (
                  <td key={lot.id} className="p-4 font-mono">
                    <span className="text-amber-400 font-bold block">
                      {lot.certificate?.chemical_analysis.CEV ?? "0.385"}
                    </span>
                    <span className="text-[10px] text-slate-400 block font-sans">
                      {lot.grade?.weldability_rating ?? "AWS D1.1 standard preheat"}
                    </span>
                  </td>
                ))}
              </tr>

              {/* Mill Origin */}
              <tr className="hover:bg-slate-900/40">
                <td className="p-4 font-semibold text-slate-400 font-mono">Manufacturing Mill</td>
                {comparedListings.map((lot) => (
                  <td key={lot.id} className="p-4 text-xs text-slate-300">
                    <span className="font-semibold block">{lot.certificate?.mill_name}</span>
                    <span className="text-[11px] text-slate-400 font-mono">Country: {lot.certificate?.mill_country}</span>
                  </td>
                ))}
              </tr>

              {/* Actions Row */}
              <tr className="bg-slate-950">
                <td className="p-4 font-semibold text-slate-400 font-mono">Action</td>
                {comparedListings.map((lot) => (
                  <td key={lot.id} className="p-4">
                    <button
                      onClick={() => setShowRfqModal(lot)}
                      className="w-full py-2.5 px-4 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs transition-colors flex items-center justify-center gap-1.5 shadow-md shadow-amber-500/20"
                    >
                      <span>Request Quote / Hold Lot</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </td>
                ))}
              </tr>
            </tbody>
          </table>
        </div>
      )}

      {/* RFQ Submission Modal */}
      {showRfqModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-lg w-full p-6 space-y-6 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div>
                <span className="text-xs font-mono text-amber-400 uppercase">RFQ &bull; Procurement Hold</span>
                <h3 className="text-lg font-bold text-white">Request Quotation &amp; Reserve Material</h3>
              </div>
              <button
                onClick={() => {
                  setShowRfqModal(null);
                  setRfqSubmitted(null);
                }}
                className="text-slate-400 hover:text-white"
              >
                &times;
              </button>
            </div>

            {rfqSubmitted ? (
              <div className="space-y-4 py-4 text-center">
                <div className="w-14 h-14 rounded-full bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 mx-auto">
                  <CheckCircle2 className="w-8 h-8" />
                </div>
                <div className="space-y-1">
                  <h4 className="text-base font-bold text-white">Quotation Request Successfully Registered</h4>
                  <p className="text-xs text-slate-300 font-mono">
                    Reference ID: <strong className="text-amber-400">{rfqSubmitted}</strong>
                  </p>
                  <p className="text-xs text-slate-400 max-w-xs mx-auto pt-2">
                    Delivered freight rates and batch certificate package have been locked for review.
                  </p>
                </div>
                <div className="pt-2">
                  <button
                    onClick={() => {
                      setShowRfqModal(null);
                      setRfqSubmitted(null);
                    }}
                    className="px-5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold"
                  >
                    Done
                  </button>
                </div>
              </div>
            ) : (
              <form onSubmit={handleRfqSubmit} className="space-y-4">
                <div className="p-3 rounded-lg bg-slate-950 border border-slate-800 text-xs font-mono space-y-1">
                  <div className="text-slate-400">Target Material Lot:</div>
                  <div className="text-white font-bold">{showRfqModal.title}</div>
                  <div className="text-slate-400">Available Weight: {showRfqModal.total_weight_lbs.toLocaleString()} lbs</div>
                </div>

                <div>
                  <label className="text-xs font-mono text-slate-400 block mb-1">Your Full Name</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. John Doe, PE"
                    value={buyerName}
                    onChange={(e) => setBuyerName(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none focus:border-amber-500"
                  />
                </div>

                <div>
                  <label className="text-xs font-mono text-slate-400 block mb-1">Company / Fabrication Facility</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Midwest Structural Steelworks LLC"
                    value={buyerCompany}
                    onChange={(e) => setBuyerCompany(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none focus:border-amber-500"
                  />
                </div>

                <div>
                  <label className="text-xs font-mono text-slate-400 block mb-1">Contact Email</label>
                  <input
                    type="email"
                    required
                    placeholder="procurement@steelworks.com"
                    value={buyerEmail}
                    onChange={(e) => setBuyerEmail(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none focus:border-amber-500"
                  />
                </div>

                <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-300 text-[11px] leading-relaxed">
                  <strong>Synthetic Demo Platform Notice:</strong> This reservation generates a simulated RFQ record with realistic delivered logistics calculations. No financial transaction or binding mill commitment is created.
                </div>

                <div className="flex justify-end gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowRfqModal(null)}
                    className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs transition-colors"
                  >
                    Submit Quotation Request
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
