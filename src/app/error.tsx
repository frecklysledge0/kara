"use client";

import React, { useEffect } from "react";
import { AlertTriangle, RefreshCw, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/Button";

export default function ErrorBoundary({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Application Error Boundary caught error:", error);
  }, [error]);

  return (
    <div className="max-w-xl mx-auto px-4 py-24 text-center space-y-6">
      <div className="w-12 h-12 rounded bg-rose-50 border border-rose-200 text-rose-700 flex items-center justify-center mx-auto">
        <AlertTriangle className="w-6 h-6" />
      </div>

      <div className="space-y-2">
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">
          Something went wrong
        </h1>
        <p className="text-xs sm:text-sm text-slate-600 max-w-md mx-auto leading-relaxed">
          An unexpected error occurred while rendering this interface. Details have been logged for inspection.
        </p>
        {error.message && (
          <div className="mt-3 p-3 rounded bg-slate-100 border border-slate-200 text-slate-800 font-mono text-[11px] text-left overflow-x-auto max-w-md mx-auto">
            {error.message}
          </div>
        )}
      </div>

      <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
        <Button onClick={() => reset()} variant="primary" size="sm">
          <RefreshCw className="w-3.5 h-3.5 mr-1.5" />
          Retry Operation
        </Button>
        <Button
          onClick={() => (window.location.href = "/")}
          variant="outline"
          size="sm"
        >
          <ArrowLeft className="w-3.5 h-3.5 mr-1.5" />
          Return to Home
        </Button>
      </div>
    </div>
  );
}
