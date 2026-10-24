// =====================================================================
// MillProof: Client-Side Storage Helper for Recent Views & Shortlists
// =====================================================================

const RECENT_KEY = "millproof_recent_views";
const SHORTLIST_KEY = "millproof_shortlist";

export function getRecentlyViewedIds(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(RECENT_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function recordListingView(id: string): void {
  if (typeof window === "undefined" || !id) return;
  try {
    const current = getRecentlyViewedIds().filter((item) => item !== id);
    current.unshift(id);
    localStorage.setItem(RECENT_KEY, JSON.stringify(current.slice(0, 10)));
  } catch {
    // Ignore localStorage write quota / privacy exceptions
  }
}

export function getShortlistedIds(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(SHORTLIST_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function toggleShortlistId(id: string): boolean {
  if (typeof window === "undefined" || !id) return false;
  try {
    const current = getShortlistedIds();
    const exists = current.includes(id);
    const updated = exists ? current.filter((item) => item !== id) : [...current, id];
    localStorage.setItem(SHORTLIST_KEY, JSON.stringify(updated));
    return !exists;
  } catch {
    return false;
  }
}

export function isShortlistedId(id: string): boolean {
  if (typeof window === "undefined" || !id) return false;
  return getShortlistedIds().includes(id);
}
