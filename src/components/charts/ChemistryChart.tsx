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
  ResponsiveContainer
} from "recharts";
import { ChemicalAnalysis, ChemistrySpec } from "@/types/steel";

interface ChemistryChartProps {
  actual: ChemicalAnalysis;
  spec: ChemistrySpec;
}

export function ChemistryChart({ actual, spec }: ChemistryChartProps) {
  // Build chart dataset for key elements
  const elements = ["C", "Mn", "Si", "P", "S", "Cr", "Ni", "Mo", "Cu", "V"];

  const data = elements
    .filter((el) => actual[el] !== undefined || spec[el] !== undefined)
    .map((el) => {
      const actualVal = actual[el] ?? 0;
      const maxLimit = spec[el]?.max ?? null;
      const minLimit = spec[el]?.min ?? null;

      return {
        element: el,
        actual: Number(actualVal.toFixed(3)),
        maxLimit: maxLimit !== null ? Number(maxLimit.toFixed(3)) : undefined,
        minLimit: minLimit !== null ? Number(minLimit.toFixed(3)) : undefined
      };
    });

  if (data.length === 0) {
    return <div className="text-xs text-slate-400 py-4">No chemical data available for plotting.</div>;
  }

  return (
    <div className="w-full h-64 bg-slate-950 p-3 rounded-xl border border-slate-800">
      <div className="text-[11px] font-mono text-slate-400 mb-2 flex justify-between">
        <span>Chemical Heat Ladle Analysis vs. ASTM Specified Limits (%)</span>
        <span className="text-amber-400">Deterministic Comparison</span>
      </div>
      <ResponsiveContainer width="100%" height="90%">
        <BarChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
          <XAxis dataKey="element" stroke="#94a3b8" fontSize={11} fontVariant="mono" />
          <YAxis stroke="#94a3b8" fontSize={11} />
          <Tooltip
            contentStyle={{
              backgroundColor: "#0f172a",
              borderColor: "#334155",
              borderRadius: "8px",
              color: "#f8fafc",
              fontSize: "12px",
              fontFamily: "monospace"
            }}
            formatter={(val: unknown) => [`${val}%`, ""]}
          />
          <Legend
            wrapperStyle={{ fontSize: "11px", paddingTop: "6px" }}
          />
          <Bar dataKey="actual" fill="#f59e0b" name="MTR Actual %" radius={[4, 4, 0, 0]} />
          <Bar dataKey="maxLimit" fill="#38bdf8" name="ASTM Max %" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
