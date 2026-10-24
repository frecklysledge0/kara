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
import { DeliveredCostBreakdown } from "@/types/steel";

interface FreightCostChartProps {
  delivered: DeliveredCostBreakdown;
}

export function FreightCostChart({ delivered }: FreightCostChartProps) {
  const data = [
    {
      category: "Landed Cost ($)",
      baseMaterial: delivered.baseMaterialCost,
      freight: delivered.baseFreightRate,
      fuelSurcharge: delivered.fuelSurcharge
    }
  ];

  return (
    <div className="w-full h-44 bg-slate-950 p-3 rounded-xl border border-slate-800">
      <div className="text-[11px] font-mono text-slate-400 mb-2 flex justify-between">
        <span>Delivered Landed Cost Breakdown ($ Total)</span>
        <span className="text-emerald-400 font-bold">${delivered.totalDeliveredCost.toLocaleString()} Total</span>
      </div>
      <ResponsiveContainer width="100%" height="80%">
        <BarChart layout="vertical" data={data} margin={{ top: 5, right: 20, left: 20, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
          <XAxis type="number" stroke="#94a3b8" fontSize={11} tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`} />
          <YAxis type="category" dataKey="category" stroke="#94a3b8" fontSize={11} hide />
          <Tooltip
            contentStyle={{
              backgroundColor: "#0f172a",
              borderColor: "#334155",
              borderRadius: "8px",
              color: "#f8fafc",
              fontSize: "12px",
              fontFamily: "monospace"
            }}
            formatter={(val: any) => [`$${Number(val).toLocaleString()}`, ""]}
          />
          <Legend wrapperStyle={{ fontSize: "11px" }} />
          <Bar dataKey="baseMaterial" stackId="a" fill="#f59e0b" name="Base Material" radius={[0, 0, 0, 0]} />
          <Bar dataKey="freight" stackId="a" fill="#0284c7" name="Flatbed Mileage" />
          <Bar dataKey="fuelSurcharge" stackId="a" fill="#38bdf8" name="Fuel Surcharge (18.5%)" radius={[0, 4, 4, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
