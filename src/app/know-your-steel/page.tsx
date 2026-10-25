import type { Metadata } from "next";
import { Suspense } from "react";
import { CURATED_GRADES } from "@/lib/data/grades";
import { SteelExplorer } from "@/components/customer/SteelExplorer";

export const metadata: Metadata = { title: "Know Your Steel | MillProof", description: "Explore steel composition, strength, corrosion resistance, and weldability using curated grade reference data." };

export default function KnowYourSteelPage() {
  return <Suspense fallback={<div className="explorer-loading">Opening the material library…</div>}><SteelExplorer grades={CURATED_GRADES} /></Suspense>;
}
