"use client";

import React from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { Info } from "lucide-react";

export interface ChemistryDataPoint {
  element: string;
  actual: number;
  maxLimit?: number;
  minLimit?: number;
  unit: string;
}

interface ChemistryChartProps {
  chemistry?: Record<string, number | { value: number | null; unit?: string } | null | undefined>;
  specLimits?: Record<string, { min?: number | null; max?: number | null; unit?: string } | undefined>;
  actual?: Record<string, number | { value: number | null; unit?: string } | null | undefined>;
  spec?: Record<string, { min?: number | null; max?: number | null; unit?: string } | undefined>;
  sourceContext?: string;
  gradeName?: string;
}

export function ChemistryChart({
  chemistry,
  specLimits,
  actual,
  spec,
  sourceContext = "Published ASTM/SAE Standard",
  gradeName = "Specified Grade",
}: ChemistryChartProps) {
  const resolvedChemistry = chemistry || actual || {};
  const resolvedLimits = specLimits || spec || {};
  // Common key elements in standard carbon/alloy/stainless specifications
  const standardElements = ["C", "Mn", "P", "S", "Si", "Cr", "Ni", "Mo", "Cu", "V", "Nb", "Ti"];

  const plotData: ChemistryDataPoint[] = [];
  const missingInMtr: string[] = [];

  for (const el of standardElements) {
    // Resolve actual value
    const rawEntry = resolvedChemistry[el] ?? resolvedChemistry[el.toUpperCase()] ?? resolvedChemistry[el.toLowerCase()];
    let actualVal: number | null = null;
    let unit = "% by weight";

    if (typeof rawEntry === "number" && !isNaN(rawEntry)) {
      actualVal = rawEntry;
    } else if (rawEntry && typeof rawEntry === "object" && "value" in rawEntry) {
      if (typeof rawEntry.value === "number" && !isNaN(rawEntry.value)) {
        actualVal = rawEntry.value;
      }
      if (rawEntry.unit) unit = rawEntry.unit;
    }

    // Resolve spec limit
    const spec = resolvedLimits[el] ?? resolvedLimits[el.toUpperCase()];

    if (actualVal !== null) {
      // NEVER plot unknown values as zero. Only plot when actual extracted value is present!
      plotData.push({
        element: el,
        actual: Number(actualVal.toFixed(3)),
        maxLimit: spec?.max !== null && spec?.max !== undefined ? Number(spec.max.toFixed(3)) : undefined,
        minLimit: spec?.min !== null && spec?.min !== undefined ? Number(spec.min.toFixed(3)) : undefined,
        unit,
      });
    } else if (spec && (spec.max !== null || spec.min !== null)) {
      // If element is defined in standard but not reported in MTR, track as missing data
      missingInMtr.push(el);
    }
  }

  if (plotData.length === 0) {
    return (
      <div className="p-6 rounded border border-slate-200 bg-slate-50 text-center space-y-2">
        <Info className="w-5 h-5 text-slate-400 mx-auto" />
        <p className="text-xs text-slate-600">
          No quantitative chemical ladle analysis available for plotting.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="p-4 rounded border border-slate-200 bg-white shadow-2xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-100">
          <div>
            <h4 className="text-xs font-semibold text-slate-900 tracking-wide uppercase">
              Ladle Chemistry vs. {gradeName} Limits
            </h4>
            <span className="text-[11px] text-slate-500 font-mono">
              Units: % by weight &bull; Source: {sourceContext}
            </span>
          </div>
          <div className="text-[11px] font-mono text-slate-500">
            {plotData.length} elements reported
          </div>
        </div>

        <div className="w-full h-64 pt-3">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={plotData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
              <XAxis dataKey="element" stroke="#64748b" fontSize={11} tickLine={false} />
              <YAxis stroke="#64748b" fontSize={11} tickLine={false} />
              <Tooltip
                contentStyle={{
                  backgroundColor: "#0f172a",
                  borderColor: "#334155",
                  borderRadius: "6px",
                  color: "#f8fafc",
                  fontSize: "11px",
                  fontFamily: "monospace",
                  padding: "8px 12px",
                }}
                formatter={(val: unknown, name: unknown) => {
                  const label = name === "actual" ? "MTR Actual" : name === "maxLimit" ? "ASTM Max" : "ASTM Min";
                  return [`${val}% by wt`, label];
                }}
              />
              <Legend
                wrapperStyle={{ fontSize: "11px", paddingTop: "8px" }}
                formatter={(value) => {
                  if (value === "actual") return "Reported Ladle Analysis";
                  if (value === "maxLimit") return "Standard Maximum Limit";
                  if (value === "minLimit") return "Standard Minimum Limit";
                  return value;
                }}
              />
              <Bar dataKey="actual" fill="#1e293b" name="actual" radius={[2, 2, 0, 0]} maxBarSize={36} />
              <Bar dataKey="maxLimit" fill="#0284c7" name="maxLimit" radius={[2, 2, 0, 0]} maxBarSize={36} />
              <Bar dataKey="minLimit" fill="#64748b" name="minLimit" radius={[2, 2, 0, 0]} maxBarSize={36} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Missing Elements Notice */}
        {missingInMtr.length > 0 && (
          <div className="mt-3 pt-2 border-t border-slate-100 flex items-center gap-1.5 text-[11px] text-slate-500">
            <span className="font-semibold text-slate-600">Standard elements not reported in MTR:</span>
            <span className="font-mono">{missingInMtr.join(", ")}</span>
            <span className="text-slate-400">&mdash; not plotted as zero</span>
          </div>
        )}
      </div>

      {/* Mandatory Disclaimer */}
      <div className="flex items-start gap-1.5 text-[11px] text-slate-500 px-1">
        <Info className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
        <span>
          <strong>Comparative Screening:</strong> Plotted actuals represent verbatim MTR ladle records compared with published standard limits. Chart does not constitute metallurgical or structural engineering approval.
        </span>
      </div>
    </div>
  );
}
