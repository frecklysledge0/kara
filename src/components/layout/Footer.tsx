import React from "react";
import Link from "next/link";

export function Footer() {
  return (
    <footer className="w-full border-t border-slate-200 bg-white text-slate-600 text-xs py-10 mt-auto">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
          {/* Brand & Purpose */}
          <div className="space-y-2 md:col-span-1">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded bg-slate-900 text-white flex items-center justify-center font-bold text-[10px]">
                MP
              </div>
              <span className="font-bold text-sm text-slate-900 tracking-tight">MillProof</span>
            </div>
            <p className="text-xs text-slate-500 leading-relaxed">
              Industrial B2B steel procurement platform connecting verified mill inventory with deterministic batch document verification.
            </p>
          </div>

          {/* Navigation */}
          <div>
            <h4 className="font-semibold text-slate-900 uppercase tracking-wider text-[11px] mb-3">
              Procurement
            </h4>
            <ul className="space-y-2 text-xs">
              <li>
                <Link href="/dashboard" className="hover:text-slate-900 transition-colors">
                  Dashboard
                </Link>
              </li>
              <li>
                <Link href="/listings" className="hover:text-slate-900 transition-colors">
                  Material Marketplace
                </Link>
              </li>
              <li>
                <Link href="/" className="hover:text-slate-900 transition-colors">
                  Find Your Steel
                </Link>
              </li>
            </ul>
          </div>

          {/* Supplier */}
          <div>
            <h4 className="font-semibold text-slate-900 uppercase tracking-wider text-[11px] mb-3">
              Suppliers &amp; Mills
            </h4>
            <ul className="space-y-2 text-xs">
              <li>
                <Link href="/sell" className="hover:text-slate-900 transition-colors">
                  Upload &amp; Verify MTRs
                </Link>
              </li>
              <li>
                <Link href="/sell#guidelines" className="hover:text-slate-900 transition-colors">
                  EN 10204 3.1 Standards
                </Link>
              </li>
              <li>
                <Link href="/listings" className="hover:text-slate-900 transition-colors">
                  Published Inventory
                </Link>
              </li>
            </ul>
          </div>

          {/* Compliance Notice */}
          <div className="space-y-2">
            <h4 className="font-semibold text-slate-900 uppercase tracking-wider text-[11px] mb-3">
              Deterministic Verification
            </h4>
            <p className="text-[11px] text-slate-500 leading-relaxed bg-slate-50 p-3 rounded border border-slate-200">
              Material batch evaluations are performed deterministically against published ASTM/EN standards. Document fields are verified numerically, not cryptographically. All sample data is clearly identified.
            </p>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="pt-6 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-3 text-slate-500 text-[11px]">
          <p>&copy; 2026 MillProof Industrial Procurement Systems. Synthetic demo environment.</p>
          <div className="flex items-center gap-3 text-[11px] font-mono">
            <span>ASTM A36 / A572 / A514 / A516</span>
            <span>&bull;</span>
            <span>Flatbed Freight Bounds</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
