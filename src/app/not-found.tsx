import React from "react";
import Link from "next/link";
import { Search, ArrowLeft, Layers } from "lucide-react";
import { Button } from "@/components/ui/Button";

export default function NotFound() {
  return (
    <div className="max-w-xl mx-auto px-4 py-24 text-center space-y-6">
      <div className="w-12 h-12 rounded bg-slate-100 border border-slate-200 text-slate-700 flex items-center justify-center mx-auto font-mono text-sm font-bold">
        404
      </div>

      <div className="space-y-2">
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">
          Page Not Found
        </h1>
        <p className="text-xs sm:text-sm text-slate-600 max-w-sm mx-auto leading-relaxed">
          The requested route, material listing, or specification document does not exist or has been relocated.
        </p>
      </div>

      <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
        <Link href="/">
          <Button variant="outline" size="sm">
            <ArrowLeft className="w-3.5 h-3.5 mr-1.5" />
            Return to Home
          </Button>
        </Link>
        <Link href="/listings">
          <Button variant="primary" size="sm">
            <Search className="w-3.5 h-3.5 mr-1.5" />
            Search Marketplace
          </Button>
        </Link>
      </div>
    </div>
  );
}
