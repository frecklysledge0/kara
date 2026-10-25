"use client";

import Link from "next/link";
import { useEffect, useState, type ReactNode } from "react";
import { ArrowRight, Scale, X } from "lucide-react";
import { useCustomerSearch } from "@/components/customer/CustomerState";
import { CompareToggle } from "@/components/customer/CompareToggle";
import { formatPrice } from "@/lib/customer/catalog";
import { fetchWithTimeout } from "@/lib/network";
import type { CustomerListing } from "@/types/customer";

export default function ComparePage() {
  const { state, update, ready } = useCustomerSearch();
  const [busy, setBusy] = useState(true);
  const [error, setError] = useState("");
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    void fetchWithTimeout("/api/customer-inventory", { signal: controller.signal, cache: "no-store" })
      .then(async (res) => { if (!res.ok) throw new Error(); return res.json(); })
      .then((body: { listings: CustomerListing[] }) => { update({ inventory: body.listings }); setError(""); })
      .catch(() => { if (!controller.signal.aborted) setError("We couldn't refresh inventory. Retry to check current availability; your selections are kept."); })
      .finally(() => { if (!controller.signal.aborted) setBusy(false); });
    return () => controller.abort();
  }, [update, attempt]);
  const selected = state.compareIds.map((id) => state.inventory.find((lot) => lot.id === id)).filter((lot): lot is CustomerListing => Boolean(lot));
  const missing = state.compareIds.filter((id) => !state.inventory.some((lot) => lot.id === id));
  const rows: Array<[string, (lot: CustomerListing) => ReactNode]> = [
    ["Supplier", (lot) => lot.seller_name], ["Warehouse", (lot) => `${lot.city}${lot.state ? `, ${lot.state}` : ""}`],
    ["Grade / form", (lot) => `${lot.grade_name} / ${lot.form}`], ["Available quantity", (lot) => `${lot.quantity_tons} tons`],
    ["Base material price", (lot) => formatPrice(lot.price_per_ton)],
    ["Thickness", (lot) => lot.details.thickness_in == null ? "Not supplied" : `${lot.details.thickness_in} in`],
    ["Mill certificate", (lot) => lot.details.certificate ? "On file — review before purchase" : "Not supplied"],
    ["Heat number", (lot) => lot.details.heat_number || "Not supplied"],
    ["Melt / pour origin", (lot) => lot.details.origin || "Not supplied"],
    ["Reported chemistry (% by weight)", (lot) => Object.entries(lot.details.chemistry).filter(([, value]) => typeof value === "number").map(([key, value]) => `${key}: ${value}`).join(" · ") || "Not supplied"],
  ];
  return <div className="comparison-page customer-content">
    <div className="section-heading"><div><p className="eyebrow">Make an informed choice</p><h1>Compare your steel.</h1><p className="muted">Put up to three supplier lots side by side. Keep the facts in view.</p></div><Link className="text-button" href="/know-your-steel">Compare grade properties <ArrowRight size={15} /></Link></div>
    {(busy || !ready) && <p role="status">Loading inventory for comparison…</p>}
    {error && <p role="alert" className="customer-error">{error} <button type="button" className="text-button" onClick={() => { setBusy(true); setAttempt((value) => value + 1); }}>Retry</button></p>}
    {!busy && missing.length > 0 && <div className="customer-error"><p>These saved lots are no longer in the available inventory:</p>{missing.map((id) => <button type="button" className="text-button" key={id} onClick={() => update({ compareIds: state.compareIds.filter((value) => value !== id) })}>Remove unavailable lot {id} <X size={14} /></button>)}</div>}
    {selected.length > 0 ? <>
      <div className="comparison-scroll" tabIndex={0} role="region" aria-label="Supplier lot comparison">
        <table className="comparison-table"><caption>Supplier lot comparison · Prices exclude freight and taxes</caption><thead><tr><th scope="col">What matters</th>{selected.map((lot) => <th key={lot.id} scope="col"><span>{lot.grade_name}</span><small>{lot.is_demo ? "Synthetic demo lot" : "Published lot"}</small><button type="button" className="text-button" onClick={() => update({ compareIds: state.compareIds.filter((id) => id !== lot.id) })} aria-label={`Remove ${lot.seller_name} ${lot.grade_name} from comparison`}><X size={14} />Remove</button></th>)}</tr></thead>
          <tbody>{rows.map(([label, render]) => <tr key={label}><th scope="row">{label}</th>{selected.map((lot) => <td key={lot.id}>{render(lot)}</td>)}</tr>)}
            <tr><th scope="row">Next step</th>{selected.map((lot) => <td key={lot.id}><Link className="text-button" href={`/listings/${encodeURIComponent(lot.id)}`}>Inspect lot & request quote <ArrowRight size={15} /></Link></td>)}</tr>
          </tbody></table>
      </div>
      <button className="text-button" type="button" onClick={() => update({ compareIds: [] })}>Clear comparison</button>
    </> : !busy && <div className="comparison-empty"><Scale size={32} /><h2>Choose the lots you want to compare.</h2><p>Use “Compare lot” below or on your search results. No lots are selected for you.</p><Link className="solid-button" href="/?prompt=Railing%20for%20a%20coastal%20boardwalk%2C%20about%205%20tons%2C%20near%20Miami">Try a coastal boardwalk project <ArrowRight size={15} /></Link></div>}
    <div className="section-heading"><div><p className="eyebrow">Available inventory</p><h2>Add a lot to compare.</h2></div><Link className="text-button" href="/">Find steel for my project <ArrowRight size={15} /></Link></div>
    <div className="comparison-catalog">{state.inventory.map((lot) => <article key={lot.id}><span className="eyebrow">{lot.is_demo ? "Synthetic demo" : "Published inventory"}</span><h3>{lot.grade_name} · {lot.form}</h3><p>{lot.seller_name}</p><p className="small muted">{lot.city}, {lot.state} · {lot.quantity_tons} tons · {formatPrice(lot.price_per_ton)}</p><CompareToggle id={lot.id} /></article>)}</div>
    {!busy && !error && !state.inventory.length && <p className="empty-results">No supplier lots are currently available. <Link href="/">Describe your project to explore suitable grades.</Link></p>}
    <p className="reference-note">Compare published facts; missing data remains marked as missing. Confirm availability, certificates, and freight directly with the supplier. One ton = 2,000 lb.</p>
  </div>;
}
