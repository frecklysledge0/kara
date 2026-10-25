import type { CustomerListing } from "@/types/customer";
import type { RankedListingCandidate } from "@/types/assistant";
import { formatPrice } from "@/lib/customer/catalog";
import { CompareToggle } from "./CompareToggle";

export function SellerCard({ listing, selected, showDemo, candidate, onSelect, onContact }: {
  listing: CustomerListing; selected: boolean; showDemo: boolean;
  candidate?: RankedListingCandidate; onSelect: () => void; onContact: () => void;
}) {
  const details = listing.details;
  return <article className={`seller-card ${selected ? "is-selected" : ""}`} id={`seller-${listing.id}`}>
    <button type="button" className="seller-select" aria-pressed={selected} onClick={onSelect} aria-label={`Select ${listing.seller_name}, ${listing.grade_name} ${listing.form} on globe`}>
      <span className="seller-title">{listing.seller_name.replace(/\s*\(Synthetic Demo\)/i, "")}</span>
      <span className="small muted">{listing.city}{listing.state && `, ${listing.state}`}</span>
      <span className="selection-dot" aria-hidden="true" />
    </button>
    {showDemo && listing.is_demo && <span className="demo-label">Synthetic demo</span>}
    <p className="seller-material">{listing.grade_name} <span className="muted">/ {listing.form}</span></p>
    <div className="seller-meta"><span>{listing.quantity_tons} tons available</span><span>{formatPrice(listing.price_per_ton)}</span></div>
    <CompareToggle id={listing.id} />
    <div className="seller-actions">
      <button type="button" className="contact-button" onClick={onContact}>Contact seller <span aria-hidden="true">↗</span></button>
      <details className="seller-details">
        <summary>Details</summary>
        <div className="seller-detail-content">
          <dl>
            <div><dt>Thickness</dt><dd>{details.thickness_in ? `${details.thickness_in} in` : "Not supplied"}</dd></div>
            <div><dt>Certificate</dt><dd>{details.certificate ? "On file; review required" : "Not supplied"}</dd></div>
            <div><dt>Heat number</dt><dd>{details.heat_number || "Not supplied"}</dd></div>
            <div><dt>Production route</dt><dd>{details.mill_route || "Not supplied"}</dd></div>
            <div><dt>Origin</dt><dd>{details.origin || "Not supplied"}</dd></div>
          </dl>
          {Object.keys(details.chemistry).length > 0 && <p className="small"><span className="muted">Reported chemistry (% by weight): </span>{Object.entries(details.chemistry).filter(([, value]) => typeof value === "number").map(([element, value]) => `${element} ${value}`).join(" · ")}</p>}
          {candidate?.freight_breakdown && <p className="small muted">Estimated freight: {new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(candidate.freight_breakdown.freight_total)} across {candidate.freight_breakdown.truckloads} truckload(s), to {candidate.destination_city}, {candidate.destination_state}. Destination may be a benchmark default; confirm with the seller.</p>}
          {candidate?.explanation?.relevant_limitations.map((item) => <p key={item} className="small muted">{item}</p>)}
          {!listing.coordinates && <p className="small muted">Warehouse coordinates are missing or unconfirmed. This lot is available in the list only.</p>}
          <p className="small muted">Base material price excludes freight and taxes. One ton = 2,000 lb. {listing.is_demo && "Synthetic inventory; these are not live batch records."}</p>
        </div>
      </details>
    </div>
  </article>;
}
