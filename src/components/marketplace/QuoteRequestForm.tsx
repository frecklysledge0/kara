"use client";

import React, { useState } from "react";
import Link from "next/link";
import { 
  CheckCircle2, 
  AlertTriangle, 
  RefreshCw, 
  Send,
  Info,
  ArrowRight
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { ListingWithRelations } from "@/types/database";

interface QuoteRequestFormProps {
  listing: ListingWithRelations;
  onSuccess?: (quoteId: string) => void;
  onClose?: () => void;
}

export function QuoteRequestForm({ listing, onSuccess, onClose }: QuoteRequestFormProps) {
  const [buyerName, setBuyerName] = useState("");
  const [buyerEmail, setBuyerEmail] = useState("");
  const [buyerCompany, setBuyerCompany] = useState("");
  const [buyerPhone, setBuyerPhone] = useState("");
  const [buyerCity, setBuyerCity] = useState("Chicago");
  const [buyerState, setBuyerState] = useState("IL");
  const [buyerZip, setBuyerZip] = useState("60601");
  const [requestedTons, setRequestedTons] = useState<number>(listing.quantity_tons);
  const [neededByDate, setNeededByDate] = useState("");
  const [notes, setNotes] = useState("");

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [submittedQuote, setSubmittedQuote] = useState<{
    id: string;
    totalCost: number;
    costPerTon: number;
  } | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      if (requestedTons <= 0) {
        throw new Error("Requested tonnage must be greater than zero.");
      }
      if (requestedTons > listing.quantity_tons) {
        throw new Error(`Requested quantity (${requestedTons} tons) exceeds available inventory (${listing.quantity_tons} tons).`);
      }

      const res = await fetch("/api/quotes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          listing_id: listing.id,
          buyer_name: buyerName,
          buyer_email: buyerEmail,
          buyer_company: buyerCompany || undefined,
          buyer_phone: buyerPhone || undefined,
          buyer_city: buyerCity,
          buyer_state: buyerState,
          buyer_zip: buyerZip || undefined,
          quantity_tons: Number(requestedTons),
          needed_by_date: neededByDate || undefined,
          notes: notes || undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to submit quote request.");
      }

      setSubmittedQuote({
        id: data.quote.id,
        totalCost: data.quote.estimated_delivered_cost,
        costPerTon: data.quote.delivered_cost_per_ton,
      });

      if (onSuccess) onSuccess(data.quote.id);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Error submitting quote";
      setErrorMessage(msg);
    } finally {
      setIsSubmitting(false);
    }
  }

  if (submittedQuote) {
    return (
      <div className="p-5 sm:p-6 rounded-lg border border-emerald-300 bg-white space-y-5 text-slate-800">
        <div className="text-center space-y-2">
          <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center mx-auto shadow-xs">
            <CheckCircle2 className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-900">
              Request for Quotation Submitted
            </h3>
            <p className="text-xs text-emerald-800 font-mono">
              Inquiry Reference: {submittedQuote.id}
            </p>
          </div>
        </div>

        {/* Section 1: What Was Submitted */}
        <div className="p-3.5 rounded bg-slate-50 border border-slate-200 space-y-2.5 text-xs">
          <span className="font-semibold text-slate-900 uppercase font-mono text-[10px] tracking-wider block">
            1. Inquiry Summary (Audit Preserved)
          </span>
          <div className="grid grid-cols-2 gap-2 text-slate-600">
            <div>
              <span className="text-[10px] text-slate-400 block uppercase">Material Grade:</span>
              <strong className="text-slate-900">{listing.grade}</strong>
            </div>
            <div>
              <span className="text-[10px] text-slate-400 block uppercase">Requested Tonnage:</span>
              <strong className="text-slate-900">{requestedTons} tons ({listing.form})</strong>
            </div>
            <div>
              <span className="text-[10px] text-slate-400 block uppercase">Destination:</span>
              <span className="text-slate-800">{buyerCity}, {buyerState} {buyerZip ? `(${buyerZip})` : ""}</span>
            </div>
            <div>
              <span className="text-[10px] text-slate-400 block uppercase">Estimated Landed Cost:</span>
              <strong className="text-sky-950">${submittedQuote.costPerTon.toLocaleString()}/ton (${submittedQuote.totalCost.toLocaleString()} total)</strong>
            </div>
          </div>
        </div>

        {/* Section 2: What Happens Next */}
        <div className="p-3.5 rounded bg-sky-50/50 border border-sky-200/80 space-y-2.5 text-xs text-slate-700">
          <span className="font-semibold text-sky-950 uppercase font-mono text-[10px] tracking-wider block">
            2. What Happens Next (Timeline &amp; SLA)
          </span>
          <ol className="space-y-2 list-decimal list-inside text-slate-700">
            <li className="leading-relaxed">
              <strong className="text-slate-900">48-Hour Inventory Hold:</strong> The requested material lot ({requestedTons} tons) is temporarily placed in reservation to prevent double-selling.
            </li>
            <li className="leading-relaxed">
              <strong className="text-slate-900">Seller Verification (4–8 Business Hours):</strong> {listing.seller?.name || "The producing mill"} reviews cutting schedules and verifies current flatbed trucking rates.
            </li>
            <li className="leading-relaxed">
              <strong className="text-slate-900">Review Confirmed Quote:</strong> You will be notified in <em>Orders &amp; Quotes</em> once formal pricing is posted. No financial commitment until you review and accept.
            </li>
          </ol>
        </div>

        <div className="pt-2 flex flex-wrap items-center justify-center gap-2">
          <Link href={`/orders?highlight=${submittedQuote.id}`}>
            <Button size="sm" variant="primary">
              View in Orders &amp; Quotes
              <ArrowRight className="w-3.5 h-3.5 ml-1" />
            </Button>
          </Link>
          <Link href="/dashboard">
            <Button size="sm" variant="outline">
              Back to Dashboard
            </Button>
          </Link>
          {onClose && (
            <Button size="sm" variant="outline" onClick={onClose}>
              Close Dialog
            </Button>
          )}
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {errorMessage && (
        <div className="p-3 rounded border border-rose-300 bg-rose-50 text-rose-900 text-xs flex items-start gap-2">
          <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Lot Context Box */}
      <div className="p-3 rounded bg-slate-50 border border-slate-200 text-xs flex items-center justify-between">
        <div>
          <span className="font-semibold text-slate-900">{listing.grade}</span>
          <span className="text-slate-500 block text-[11px]">
            {listing.form} &bull; {listing.thickness_in.toFixed(3)}&quot; &bull; FOB ${listing.price_per_ton}/ton
          </span>
        </div>
        <div className="text-right font-mono">
          <span className="text-slate-500 text-[10px] block uppercase">Available</span>
          <span className="font-bold text-slate-900">{listing.quantity_tons} tons</span>
        </div>
      </div>

      {/* Quantity & Date */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="space-y-1">
          <label className="text-xs font-semibold text-slate-700">Requested Tonnage (tons) *</label>
          <Input
            type="number"
            step="0.25"
            min="0.5"
            max={listing.quantity_tons}
            value={requestedTons}
            onChange={(e) => setRequestedTons(Number(e.target.value))}
            required
            className="text-xs font-mono"
          />
        </div>

        <div className="space-y-1">
          <label className="text-xs font-semibold text-slate-700">Required Delivery Date</label>
          <Input
            type="date"
            value={neededByDate}
            onChange={(e) => setNeededByDate(e.target.value)}
            className="text-xs font-mono"
          />
        </div>
      </div>

      {/* Contact Details */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="space-y-1">
          <label className="text-xs font-semibold text-slate-700">Contact Name *</label>
          <Input
            placeholder="e.g. Jane Doe"
            value={buyerName}
            onChange={(e) => setBuyerName(e.target.value)}
            required
            className="text-xs"
          />
        </div>

        <div className="space-y-1">
          <label className="text-xs font-semibold text-slate-700">Business Email *</label>
          <Input
            type="email"
            placeholder="jane@fabricators.com"
            value={buyerEmail}
            onChange={(e) => setBuyerEmail(e.target.value)}
            required
            className="text-xs"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="space-y-1">
          <label className="text-xs font-semibold text-slate-700">Company / Organization</label>
          <Input
            placeholder="Midwest Infrastructure LLC"
            value={buyerCompany}
            onChange={(e) => setBuyerCompany(e.target.value)}
            className="text-xs"
          />
        </div>

        <div className="space-y-1">
          <label className="text-xs font-semibold text-slate-700">Phone Number</label>
          <Input
            type="tel"
            placeholder="(312) 555-0199"
            value={buyerPhone}
            onChange={(e) => setBuyerPhone(e.target.value)}
            className="text-xs font-mono"
          />
        </div>
      </div>

      {/* Destination Location */}
      <div className="grid grid-cols-3 gap-3">
        <div className="space-y-1 col-span-1">
          <label className="text-xs font-semibold text-slate-700">Destination City *</label>
          <Input
            placeholder="Chicago"
            value={buyerCity}
            onChange={(e) => setBuyerCity(e.target.value)}
            required
            className="text-xs"
          />
        </div>

        <div className="space-y-1 col-span-1">
          <label className="text-xs font-semibold text-slate-700">State *</label>
          <Input
            placeholder="IL"
            maxLength={2}
            value={buyerState}
            onChange={(e) => setBuyerState(e.target.value.toUpperCase())}
            required
            className="text-xs font-mono"
          />
        </div>

        <div className="space-y-1 col-span-1">
          <label className="text-xs font-semibold text-slate-700">ZIP Code</label>
          <Input
            placeholder="60601"
            maxLength={5}
            value={buyerZip}
            onChange={(e) => setBuyerZip(e.target.value)}
            className="text-xs font-mono"
          />
        </div>
      </div>

      {/* Notes & Delivery Constraints */}
      <div className="space-y-1">
        <label className="text-xs font-semibold text-slate-700">Logistics &amp; Delivery Notes</label>
        <textarea
          rows={2}
          placeholder="Specify unloading constraints (e.g. overhead crane required, 48ft flatbed access, jobsite delivery hours)..."
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          className="w-full text-xs rounded border border-slate-300 p-2 text-slate-900 focus:outline-none focus:ring-1 focus:ring-slate-900"
        />
      </div>

      {/* Notice */}
      <div className="flex items-start gap-1.5 text-[11px] text-slate-500">
        <Info className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
        <span>
          <strong>No Financial Commitment:</strong> Submitting an RFQ places a 48-hour reservation hold and generates an authorized delivery estimate. No payment or purchase obligation is incurred at this stage.
        </span>
      </div>

      {/* Form Action Buttons */}
      <div className="flex items-center justify-between pt-2">
        {onClose && (
          <Button type="button" variant="outline" size="sm" onClick={onClose}>
            Cancel
          </Button>
        )}
        <Button type="submit" variant="primary" size="sm" disabled={isSubmitting} className="ml-auto">
          {isSubmitting ? (
            <>
              <RefreshCw className="w-3.5 h-3.5 mr-1.5 animate-spin" /> Submitting...
            </>
          ) : (
            <>
              <Send className="w-3.5 h-3.5 mr-1.5" /> Submit Request for Quotation
            </>
          )}
        </Button>
      </div>
    </form>
  );
}
