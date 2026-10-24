"use client";

import React from "react";
import { Leaf, Info, ArrowDownRight, Truck, Factory } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { calculateEmissions, EmissionsCalculationParams } from "@/lib/engine/emissions";

interface EmissionsPanelProps extends EmissionsCalculationParams {
  className?: string;
  compact?: boolean;
}

export function EmissionsPanel({
  quantityTons,
  tonUnit = "us_short_ton",
  millRoute = "EAF",
  materialFamily = "Structural Carbon Steel",
  roadDistanceMiles = 0,
  className = "",
  compact = false,
}: EmissionsPanelProps) {
  const result = calculateEmissions({
    quantityTons,
    tonUnit,
    millRoute,
    materialFamily,
    roadDistanceMiles,
  });

  const isLowCarbon = result.emissionsIntensity_tCO2ePerTon < 1.0;

  if (compact) {
    return (
      <div className={`p-2.5 rounded bg-emerald-50/70 border border-emerald-200/80 text-xs flex items-center justify-between ${className}`}>
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-full bg-emerald-100 text-emerald-800 flex items-center justify-center shrink-0">
            <Leaf className="w-3.5 h-3.5" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="font-semibold text-emerald-950 font-mono">
                {result.totalEmissionsMetricTons} t CO₂e
              </span>
              <Badge variant="outline" size="sm" className="font-mono text-[9px] bg-white text-emerald-800 border-emerald-300">
                A1-A4 Scope
              </Badge>
            </div>
            <span className="text-[10px] text-emerald-800">
              {result.emissionsIntensity_tCO2ePerTon} t CO₂e/t &bull; {millRoute === "EAF" ? "EAF Mini-Mill" : "BOF"}
            </span>
          </div>
        </div>

        <div className="text-right">
          <span className="text-[10px] font-mono text-emerald-700 block">
            Range: [{result.uncertaintyRange.minTotalMetricTons}-{result.uncertaintyRange.maxTotalMetricTons}] t
          </span>
          {result.savingsVsGlobalAvgMetricTons > 0 && (
            <span className="text-[9px] text-emerald-800 font-medium">
              -{result.savingsVsGlobalAvgMetricTons}t vs global avg
            </span>
          )}
        </div>
      </div>
    );
  }

  return (
    <Card className={`border-slate-200 bg-white shadow-2xs ${className}`}>
      <CardHeader className="pb-2 border-b border-slate-100">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded bg-emerald-50 border border-emerald-200 text-emerald-700 flex items-center justify-center">
              <Leaf className="w-4 h-4" />
            </div>
            <div>
              <CardTitle className="text-sm font-semibold text-slate-900">
                Estimated Embodied Carbon &amp; Logistics Footprint
              </CardTitle>
              <div className="text-[11px] text-slate-500 font-mono">
                System Boundary: {result.systemBoundary}
              </div>
            </div>
          </div>
          <Badge
            variant={isLowCarbon ? "success" : "secondary"}
            size="sm"
            className="font-mono text-[10px]"
          >
            {isLowCarbon ? "Low-Carbon Circular Steel" : "Conventional Intensity"}
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="p-4 space-y-4">
        {/* Metric Summary Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
          <div className="p-2.5 rounded bg-slate-50 border border-slate-200/80">
            <span className="text-[10px] uppercase font-mono text-slate-500 block">
              Total Footprint (A1-A4)
            </span>
            <div className="text-lg font-bold font-mono text-slate-900 mt-0.5">
              {result.totalEmissionsMetricTons}{" "}
              <span className="text-xs font-normal text-slate-500">t CO₂e</span>
            </div>
            <span className="text-[10px] text-slate-500 font-mono">
              Uncertainty: ±{result.uncertaintyRange.uncertaintyPct}%
            </span>
          </div>

          <div className="p-2.5 rounded bg-slate-50 border border-slate-200/80">
            <span className="text-[10px] uppercase font-mono text-slate-500 block">
              Emissions Intensity
            </span>
            <div className="text-lg font-bold font-mono text-slate-900 mt-0.5">
              {result.emissionsIntensity_tCO2ePerTon}{" "}
              <span className="text-xs font-normal text-slate-500">t CO₂e / t</span>
            </div>
            <span className="text-[10px] text-slate-500 font-mono">
              Per metric ton delivered
            </span>
          </div>

          <div className="p-2.5 rounded bg-slate-50 border border-slate-200/80">
            <span className="text-[10px] uppercase font-mono text-slate-500 block">
              A1-A3 Mill Production
            </span>
            <div className="text-lg font-bold font-mono text-slate-900 mt-0.5 flex items-center gap-1">
              <Factory className="w-3.5 h-3.5 text-slate-400" />
              <span>{result.productionEmissionsMetricTons}</span>
              <span className="text-xs font-normal text-slate-500">t</span>
            </div>
            <span className="text-[10px] text-slate-500">
              {millRoute === "EAF" ? "EAF Mini-Mill" : "BOF Blast Furnace"}
            </span>
          </div>

          <div className="p-2.5 rounded bg-slate-50 border border-slate-200/80">
            <span className="text-[10px] uppercase font-mono text-slate-500 block">
              A4 Highway Transport
            </span>
            <div className="text-lg font-bold font-mono text-slate-900 mt-0.5 flex items-center gap-1">
              <Truck className="w-3.5 h-3.5 text-slate-400" />
              <span>{result.transportEmissionsMetricTons}</span>
              <span className="text-xs font-normal text-slate-500">t</span>
            </div>
            <span className="text-[10px] text-slate-500">
              {roadDistanceMiles > 0 ? `${roadDistanceMiles} mi diesel flatbed` : "Origin pickup"}
            </span>
          </div>
        </div>

        {/* Explicit Uncertainty Range Callout */}
        <div className="p-2.5 rounded bg-slate-50 border border-slate-200 text-xs flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Info className="w-3.5 h-3.5 text-slate-500 shrink-0" />
            <span className="text-slate-700">
              <strong>Explicit Uncertainty Range:</strong> [{result.uncertaintyRange.minTotalMetricTons} to {result.uncertaintyRange.maxTotalMetricTons} metric tons CO₂e] based on grid emissions variation and highway terrain.
            </span>
          </div>
          {result.savingsVsGlobalAvgMetricTons > 0 && (
            <span className="text-emerald-800 font-semibold flex items-center gap-1 shrink-0 font-mono text-xs">
              <ArrowDownRight className="w-3.5 h-3.5 text-emerald-600" />
              Saved {result.savingsVsGlobalAvgMetricTons}t vs 1.89t/t global benchmark
            </span>
          )}
        </div>

        {/* Documented Factor Sources & Disclaimers */}
        <div className="pt-2 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-[10px] text-slate-500">
          <div>
            <strong>Sources:</strong> {result.dataSources.production} &bull; {result.dataSources.transport}
          </div>
          <div className="italic text-slate-400">
            {result.disclaimer}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
