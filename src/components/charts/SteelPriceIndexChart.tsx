"use client";

import React, { useState, useEffect } from "react";
import { TrendingUp, TrendingDown, Info, ExternalLink, Calendar, Database } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { PriceIndexObservation, HISTORICAL_STEEL_PPI_OBSERVATIONS, STEEL_PPI_SERIES_METADATA } from "@/lib/data/steel-ppi";

interface SteelPriceIndexChartProps {
  className?: string;
}

export function SteelPriceIndexChart({ className = "" }: SteelPriceIndexChartProps) {
  const [observations, setObservations] = useState<PriceIndexObservation[]>(HISTORICAL_STEEL_PPI_OBSERVATIONS);
  const [activePoint, setActivePoint] = useState<PriceIndexObservation | null>(null);
  const [isLiveConfigured, setIsLiveConfigured] = useState<boolean>(false);

  useEffect(() => {
    let ignore = false;
    fetch("/api/market-index")
      .then((res) => res.json())
      .then((data) => {
        if (!ignore && data.success && Array.isArray(data.observations)) {
          setObservations(data.observations);
          setIsLiveConfigured(Boolean(data.metadata?.isLiveApiConfigured));
          setActivePoint(data.observations[data.observations.length - 1]);
        }
      })
      .catch((err) => {
        console.warn("Using offline BLS PPI series:", err);
      });

    return () => {
      ignore = true;
    };
  }, []);

  const latest = observations[observations.length - 1] || HISTORICAL_STEEL_PPI_OBSERVATIONS[0];
  const active = activePoint || latest;

  const values = observations.map((o) => o.value);
  const minVal = Math.min(...values) * 0.95;
  const maxVal = Math.max(...values) * 1.05;
  const range = maxVal - minVal;

  // SVG dimensions
  const width = 640;
  const height = 220;
  const paddingLeft = 40;
  const paddingRight = 20;
  const paddingTop = 20;
  const paddingBottom = 30;

  const chartWidth = width - paddingLeft - paddingRight;
  const chartHeight = height - paddingTop - paddingBottom;

  const points = observations.map((o, idx) => {
    const x = paddingLeft + (idx / (observations.length - 1)) * chartWidth;
    const y = paddingTop + chartHeight - ((o.value - minVal) / range) * chartHeight;
    return { ...o, x, y };
  });

  const pathD = points.reduce((acc, p, idx) => {
    return idx === 0 ? `M ${p.x} ${p.y}` : `${acc} L ${p.x} ${p.y}`;
  }, "");

  const areaD = `${pathD} L ${points[points.length - 1].x} ${paddingTop + chartHeight} L ${points[0].x} ${paddingTop + chartHeight} Z`;

  // Calculate 12-month change
  const priorYear = observations[Math.max(0, observations.length - 5)];
  const changePct = priorYear ? Number((((latest.value - priorYear.value) / priorYear.value) * 100).toFixed(1)) : 0;
  const isPositive = changePct >= 0;

  return (
    <Card className={`border-slate-200 bg-white shadow-2xs ${className}`}>
      <CardHeader className="pb-3 border-b border-slate-100">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="space-y-0.5">
            <div className="flex items-center gap-2">
              <CardTitle className="text-base text-slate-900">
                Steel Mill Products Producer Price Index (PPI)
              </CardTitle>
              <Badge variant="outline" size="sm" className="font-mono text-slate-700">
                Series: WPU1017
              </Badge>
            </div>
            <CardDescription>
              U.S. Bureau of Labor Statistics monthly benchmark tracking wholesale mill price trends (1982 = 100).
            </CardDescription>
          </div>

          <div className="flex items-center gap-2">
            <Badge
              variant={isLiveConfigured ? "success" : "secondary"}
              size="sm"
              className="text-[10px]"
            >
              <Database className="w-3 h-3 mr-1" />
              {isLiveConfigured ? "FRED API Live" : "Official BLS Dataset"}
            </Badge>
          </div>
        </div>
      </CardHeader>

      <CardContent className="p-4 space-y-4">
        {/* Metric Overview Row */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
          <div className="p-3 rounded bg-slate-50 border border-slate-200/80">
            <span className="text-[10px] font-mono uppercase text-slate-500 block">
              Current Benchmark Index
            </span>
            <div className="text-2xl font-bold font-mono text-slate-900 mt-1">
              {latest.value}
            </div>
            <span className="text-[10px] text-slate-500 font-sans">
              Base: 1982 = 100 ({latest.periodLabel})
            </span>
          </div>

          <div className="p-3 rounded bg-slate-50 border border-slate-200/80">
            <span className="text-[10px] font-mono uppercase text-slate-500 block">
              12-Month Market Trend
            </span>
            <div className={`text-2xl font-bold font-mono mt-1 flex items-center gap-1 ${isPositive ? "text-emerald-800" : "text-sky-900"}`}>
              {isPositive ? <TrendingUp className="w-5 h-5 text-emerald-600" /> : <TrendingDown className="w-5 h-5 text-sky-700" />}
              <span>{changePct > 0 ? `+${changePct}%` : `${changePct}%`}</span>
            </div>
            <span className="text-[10px] text-slate-500 font-sans">
              Stable post-correction cycle
            </span>
          </div>

          <div className="p-3 rounded bg-slate-50 border border-slate-200/80">
            <span className="text-[10px] font-mono uppercase text-slate-500 block">
              5-Year Historic Peak
            </span>
            <div className="text-xl font-bold font-mono text-slate-900 mt-1">
              436.4
            </div>
            <span className="text-[10px] text-slate-500">
              Dec 2021 post-pandemic high
            </span>
          </div>

          <div className="p-3 rounded bg-slate-50 border border-slate-200/80">
            <span className="text-[10px] font-mono uppercase text-slate-500 block">
              5-Year Cycle Low
            </span>
            <div className="text-xl font-bold font-mono text-slate-900 mt-1">
              216.5
            </div>
            <span className="text-[10px] text-slate-500">
              Jan 2021 pre-rally baseline
            </span>
          </div>
        </div>

        {/* Interactive SVG Chart */}
        <div className="relative rounded-lg border border-slate-200 bg-white p-2">
          {/* Active Point Hover Overlay */}
          <div className="flex items-center justify-between text-xs pb-2 px-2 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <Calendar className="w-3.5 h-3.5 text-slate-400" />
              <span className="font-semibold text-slate-800">{active.periodLabel}:</span>
              <span className="font-mono font-bold text-sky-950 text-sm">{active.value}</span>
              <Badge
                variant={active.observationType === "actual_published_bls" ? "outline" : "warning"}
                size="sm"
                className="text-[10px] font-sans"
              >
                {active.observationType === "actual_published_bls" ? "Official BLS Observation" : "Spot Benchmark Estimate"}
              </Badge>
            </div>
            {active.annotation && (
              <span className="text-[11px] text-slate-500 italic hidden sm:inline">
                &ldquo;{active.annotation}&rdquo;
              </span>
            )}
          </div>

          <div className="w-full overflow-x-auto">
            <svg
              viewBox={`0 0 ${width} ${height}`}
              className="w-full h-auto max-h-56 select-none"
            >
              <defs>
                <linearGradient id="steelPpiGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#0284c7" stopOpacity="0.25" />
                  <stop offset="100%" stopColor="#0284c7" stopOpacity="0.0" />
                </linearGradient>
              </defs>

              {/* Grid Lines */}
              {[200, 300, 400].map((gridVal) => {
                const y = paddingTop + chartHeight - ((gridVal - minVal) / range) * chartHeight;
                if (y < paddingTop || y > paddingTop + chartHeight) return null;
                return (
                  <g key={gridVal}>
                    <line
                      x1={paddingLeft}
                      y1={y}
                      x2={width - paddingRight}
                      y2={y}
                      stroke="#e2e8f0"
                      strokeDasharray="3 3"
                    />
                    <text
                      x={paddingLeft - 6}
                      y={y + 3}
                      textAnchor="end"
                      fontSize="9"
                      fill="#94a3b8"
                      fontFamily="monospace"
                    >
                      {gridVal}
                    </text>
                  </g>
                );
              })}

              {/* Shaded Area */}
              <path d={areaD} fill="url(#steelPpiGradient)" />

              {/* Line Curve */}
              <path
                d={pathD}
                fill="none"
                stroke="#0f172a"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />

              {/* Hoverable Datapoints */}
              {points.map((p, idx) => {
                const isSelected = active.date === p.date;
                return (
                  <g key={idx}>
                    <circle
                      cx={p.x}
                      cy={p.y}
                      r={isSelected ? 5 : 2.5}
                      fill={p.observationType === "actual_published_bls" ? (isSelected ? "#0284c7" : "#0f172a") : "#d97706"}
                      stroke="#ffffff"
                      strokeWidth={isSelected ? 2 : 1}
                      className="cursor-pointer transition-all"
                      onMouseEnter={() => setActivePoint(p)}
                    />
                    {/* Event pin for Dec 2021 Peak */}
                    {p.date === "2021-12-01" && (
                      <g>
                        <line x1={p.x} y1={p.y} x2={p.x} y2={p.y - 12} stroke="#64748b" strokeWidth="1" />
                        <text
                          x={p.x}
                          y={p.y - 14}
                          textAnchor="middle"
                          fontSize="8"
                          fontWeight="bold"
                          fill="#475569"
                        >
                          Peak: 436.4
                        </text>
                      </g>
                    )}
                  </g>
                );
              })}

              {/* X-Axis Labels */}
              <text x={paddingLeft} y={height - 8} fontSize="9" fill="#94a3b8" fontFamily="monospace">
                Jan 2021
              </text>
              <text x={paddingLeft + chartWidth / 2} y={height - 8} textAnchor="middle" fontSize="9" fill="#94a3b8" fontFamily="monospace">
                Dec 2023
              </text>
              <text x={width - paddingRight} y={height - 8} textAnchor="end" fontSize="9" fill="#94a3b8" fontFamily="monospace">
                Oct 2026
              </text>
            </svg>
          </div>
        </div>

        {/* Public Data Source Attribution & Disclaimer */}
        <div className="pt-2 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-[11px] text-slate-500">
          <div className="flex items-center gap-1.5">
            <Info className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            <span>
              <strong>Attribution:</strong> {STEEL_PPI_SERIES_METADATA.attribution}
            </span>
          </div>
          <a
            href="https://fred.stlouisfed.org/series/WPU1017"
            target="_blank"
            rel="noopener noreferrer"
            className="text-sky-800 hover:underline flex items-center gap-1 shrink-0 font-medium"
          >
            <span>FRED Series WPU1017</span>
            <ExternalLink className="w-3 h-3" />
          </a>
        </div>
      </CardContent>
    </Card>
  );
}
