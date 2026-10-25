import type { CustomerListing } from "@/types/customer";

export function filterCustomerListings(listings: CustomerListing[], grade: string, location: string, form: string) {
  const terms = location.toLowerCase().split(/[\s,]+/).filter(Boolean);
  return listings.filter((item) => (!grade || item.grade_id === grade)
    && (!form || item.form === form)
    && terms.every((term) => `${item.city} ${item.state}`.toLowerCase().includes(term)));
}

export function validCoordinates(lat: unknown, lng: unknown): CustomerListing["coordinates"] {
  if (typeof lat !== "number" || typeof lng !== "number" || !Number.isFinite(lat) || !Number.isFinite(lng)
    || Math.abs(lat) > 90 || Math.abs(lng) > 180) return null;
  return { lat, lng };
}

export function publicContacts(source: Record<string, unknown> | null | undefined, demo: boolean): CustomerListing["contact"] {
  if (demo || !source) return { email: null, phone: null, website: null };
  const email = typeof source.contact_email === "string" ? source.contact_email.trim() : "";
  const phone = typeof source.contact_phone === "string" ? source.contact_phone.trim() : "";
  const website = typeof source.website === "string" ? source.website.trim() : "";
  let safeWebsite: string | null = null;
  try {
    const url = new URL(website);
    if (["https:", "http:"].includes(url.protocol) && !url.username && !url.password) safeWebsite = url.href;
  } catch { /* Missing or invalid published URL. */ }
  return {
    email: /^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/.test(email) && !/\.(internal|example|invalid)$/i.test(email) ? email : null,
    phone: /^\+?[\d ().-]{7,25}$/.test(phone) ? phone : null,
    website: safeWebsite,
  };
}

export const formatPrice = (price: number | null) => price !== null && Number.isFinite(price) && price > 0
  ? `${new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(price)} / ton`
  : "Price not published";
