"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { DemoBanner } from "@/components/common/DemoBanner";
import { CustomerState } from "@/components/customer/CustomerState";
import "@/components/customer/customer.css";

export function AppChrome({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const customer = ["/", "/assistant", "/know-your-steel"].includes(pathname);
  return <CustomerState>
    {customer ? <div className="customer-app">
      <a className="customer-skip" href="#customer-main">Skip to content</a>
      <header className="customer-header">
        <Link className="customer-logo" href="/" aria-label="MillProof home"><span aria-hidden="true" className="brand-mark">M</span>MillProof<span className="brand-dot">®</span></Link>
        <nav aria-label="Customer navigation">
          <Link href="/" aria-current={pathname !== "/know-your-steel" ? "page" : undefined}>Find Steel</Link>
          <Link href="/know-your-steel" aria-current={pathname === "/know-your-steel" ? "page" : undefined}>Know Your Steel</Link>
        </nav>
        <Link className="seller-link" href="/sell">For Sellers <span aria-hidden="true">↗</span></Link>
      </header>
      <main id="customer-main">{children}</main>
      <footer className="customer-footer"><span>MillProof</span><span>Material knowledge. Human connections.</span><span>© 2026</span></footer>
    </div> : <><DemoBanner /><Header /><main className="flex-1">{children}</main><Footer /></>}
  </CustomerState>;
}
