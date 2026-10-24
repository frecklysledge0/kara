import { NextResponse } from "next/server";
import {
  HISTORICAL_STEEL_PPI_OBSERVATIONS,
  STEEL_PPI_SERIES_METADATA,
  PriceIndexObservation,
} from "@/lib/data/steel-ppi";

/**
 * GET /api/market-index
 * Returns historical steel-related price index observations and metadata.
 * Validated public data source: U.S. Bureau of Labor Statistics (BLS) PPI Series WPU1017.
 * Handles timeouts, missing credentials, and quotas server-side with transparent attribution.
 */
export async function GET() {
  const fredApiKey = process.env.FRED_API_KEY;
  let observations: PriceIndexObservation[] = [...HISTORICAL_STEEL_PPI_OBSERVATIONS];
  let isLiveApiConfigured = false;
  let liveApiStatus = "unconfigured_fallback";

  // Check if server-side FRED API key is configured
  if (fredApiKey) {
    try {
      isLiveApiConfigured = true;
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 4000); // 4-second timeout

      const url = `https://api.stlouisfed.org/fred/series/observations?series_id=WPU1017&api_key=${fredApiKey}&file_type=json&sort_order=asc`;
      const response = await fetch(url, {
        signal: controller.signal,
        headers: { "User-Agent": "MillProof-SteelProcurement/1.0" },
        next: { revalidate: 86400 }, // Cache 24 hours
      });

      clearTimeout(timeoutId);

      if (response.ok) {
        const data = await response.json();
        if (data.observations && Array.isArray(data.observations) && data.observations.length > 0) {
          const recentObs = data.observations.slice(-36); // Last 3 years
          observations = recentObs
            .filter((o: { value: string }) => o.value !== ".")
            .map((o: { date: string; value: string }) => {
              const d = new Date(o.date);
              const monthLabel = d.toLocaleString("en-US", { month: "short", year: "numeric", timeZone: "UTC" });
              return {
                date: o.date,
                periodLabel: monthLabel,
                value: Number(parseFloat(o.value).toFixed(1)),
                observationType: "actual_published_bls" as const,
              };
            });
          liveApiStatus = "live_fred_api_connected";
        }
      } else {
        liveApiStatus = `fred_api_http_${response.status}_fallback_used`;
      }
    } catch (err: unknown) {
      console.warn("FRED API fetch failed, falling back to curated BLS series:", err);
      liveApiStatus = "timeout_or_network_error_fallback_used";
    }
  }

  // Calculate market analytics
  const latest = observations[observations.length - 1];
  const priorYear = observations.find((o) => {
    const targetDate = new Date(latest.date);
    targetDate.setFullYear(targetDate.getFullYear() - 1);
    const targetYm = targetDate.toISOString().slice(0, 7);
    return o.date.startsWith(targetYm);
  }) || observations[0];

  const yoyChangePct = priorYear
    ? Number((((latest.value - priorYear.value) / priorYear.value) * 100).toFixed(1))
    : 0;

  const allValues = observations.map((o) => o.value);
  const fiveYearHigh = Math.max(...allValues);
  const fiveYearLow = Math.min(...allValues);

  return NextResponse.json({
    success: true,
    metadata: {
      ...STEEL_PPI_SERIES_METADATA,
      isLiveApiConfigured,
      liveApiStatus,
    },
    analytics: {
      currentValue: latest.value,
      currentPeriod: latest.periodLabel,
      observationType: latest.observationType,
      yoyChangePct,
      fiveYearHigh,
      fiveYearLow,
    },
    observations,
  });
}
