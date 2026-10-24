"use client";

import { useEffect } from "react";
import { recordListingView } from "@/lib/storage";

export function ListingViewTracker({ listingId }: { listingId: string }) {
  useEffect(() => {
    if (listingId) {
      recordListingView(listingId);
    }
  }, [listingId]);

  return null;
}
