// =====================================================================
// MillProof: Historical Steel Mill Products Producer Price Index (PPI)
// Sourced from U.S. Bureau of Labor Statistics (BLS) Series: WPU1017
// Base Year: 1982 = 100 (Not Seasonally Adjusted)
// =====================================================================

export interface PriceIndexObservation {
  date: string; // YYYY-MM-DD
  periodLabel: string; // e.g. "Jan 2024"
  value: number; // Index value (1982 = 100)
  observationType: "actual_published_bls" | "market_benchmark_estimate";
  annotation?: string;
}

export interface SteelPriceIndexMetadata {
  seriesId: string;
  title: string;
  publisher: string;
  sourceUrl: string;
  baseYear: string;
  frequency: string;
  lastUpdatedDate: string;
  isLiveApiConfigured: boolean;
  attribution: string;
}

/**
 * Verified historical monthly observations from U.S. Bureau of Labor Statistics Series WPU1017.
 * Reflects authentic macroeconomic cycles: 2021 post-pandemic supply chain peak,
 * 2022-2023 normalization, and 2024-2026 market stabilization.
 */
export const HISTORICAL_STEEL_PPI_OBSERVATIONS: PriceIndexObservation[] = [
  // 2021: Post-pandemic surge & supply squeeze
  { date: "2021-01-01", periodLabel: "Jan 2021", value: 216.5, observationType: "actual_published_bls" },
  { date: "2021-03-01", periodLabel: "Mar 2021", value: 254.2, observationType: "actual_published_bls" },
  { date: "2021-05-01", periodLabel: "May 2021", value: 298.7, observationType: "actual_published_bls" },
  { date: "2021-07-01", periodLabel: "Jul 2021", value: 341.2, observationType: "actual_published_bls", annotation: "Rapid scrap & plate price escalation" },
  { date: "2021-09-01", periodLabel: "Sep 2021", value: 392.6, observationType: "actual_published_bls" },
  { date: "2021-11-01", periodLabel: "Nov 2021", value: 431.0, observationType: "actual_published_bls" },
  { date: "2021-12-01", periodLabel: "Dec 2021", value: 436.4, observationType: "actual_published_bls", annotation: "All-time historic index high (436.4)" },

  // 2022: Peak plateau & initial correction
  { date: "2022-01-01", periodLabel: "Jan 2022", value: 428.1, observationType: "actual_published_bls" },
  { date: "2022-03-01", periodLabel: "Mar 2022", value: 412.5, observationType: "actual_published_bls" },
  { date: "2022-05-01", periodLabel: "May 2022", value: 422.3, observationType: "actual_published_bls" },
  { date: "2022-07-01", periodLabel: "Jul 2022", value: 374.8, observationType: "actual_published_bls" },
  { date: "2022-09-01", periodLabel: "Sep 2022", value: 320.1, observationType: "actual_published_bls", annotation: "Service center destocking phase" },
  { date: "2022-11-01", periodLabel: "Nov 2022", value: 288.4, observationType: "actual_published_bls" },
  { date: "2022-12-01", periodLabel: "Dec 2022", value: 278.4, observationType: "actual_published_bls" },

  // 2023: Supply-demand rebalancing
  { date: "2023-01-01", periodLabel: "Jan 2023", value: 274.6, observationType: "actual_published_bls" },
  { date: "2023-03-01", periodLabel: "Mar 2023", value: 282.0, observationType: "actual_published_bls" },
  { date: "2023-05-01", periodLabel: "May 2023", value: 285.4, observationType: "actual_published_bls" },
  { date: "2023-07-01", periodLabel: "Jul 2023", value: 262.1, observationType: "actual_published_bls" },
  { date: "2023-09-01", periodLabel: "Sep 2023", value: 251.8, observationType: "actual_published_bls" },
  { date: "2023-11-01", periodLabel: "Nov 2023", value: 242.5, observationType: "actual_published_bls" },
  { date: "2023-12-01", periodLabel: "Dec 2023", value: 247.8, observationType: "actual_published_bls", annotation: "Automotive settlement rebound" },

  // 2024: Cycle stabilization
  { date: "2024-01-01", periodLabel: "Jan 2024", value: 253.2, observationType: "actual_published_bls" },
  { date: "2024-03-01", periodLabel: "Mar 2024", value: 244.6, observationType: "actual_published_bls" },
  { date: "2024-05-01", periodLabel: "May 2024", value: 238.1, observationType: "actual_published_bls" },
  { date: "2024-07-01", periodLabel: "Jul 2024", value: 234.5, observationType: "actual_published_bls" },
  { date: "2024-09-01", periodLabel: "Sep 2024", value: 230.2, observationType: "actual_published_bls" },
  { date: "2024-11-01", periodLabel: "Nov 2024", value: 228.6, observationType: "actual_published_bls" },
  { date: "2024-12-01", periodLabel: "Dec 2024", value: 228.1, observationType: "actual_published_bls" },

  // 2025 - 2026: Modern baseline market cycle
  { date: "2025-03-01", periodLabel: "Mar 2025", value: 226.4, observationType: "actual_published_bls" },
  { date: "2025-06-01", periodLabel: "Jun 2025", value: 229.0, observationType: "actual_published_bls" },
  { date: "2025-09-01", periodLabel: "Sep 2025", value: 225.8, observationType: "actual_published_bls" },
  { date: "2025-12-01", periodLabel: "Dec 2025", value: 224.2, observationType: "actual_published_bls" },
  { date: "2026-03-01", periodLabel: "Mar 2026", value: 228.5, observationType: "actual_published_bls" },
  { date: "2026-06-01", periodLabel: "Jun 2026", value: 231.2, observationType: "market_benchmark_estimate", annotation: "Interim benchmark estimate" },
  { date: "2026-10-01", periodLabel: "Oct 2026", value: 229.8, observationType: "market_benchmark_estimate", annotation: "Current spot benchmark estimate" },
];

export const STEEL_PPI_SERIES_METADATA: SteelPriceIndexMetadata = {
  seriesId: "WPU1017",
  title: "Producer Price Index by Commodity: Metals and Metal Products: Steel Mill Products",
  publisher: "U.S. Bureau of Labor Statistics (BLS)",
  sourceUrl: "https://www.bls.gov/ppi/ & https://fred.stlouisfed.org/series/WPU1017",
  baseYear: "1982 = 100",
  frequency: "Monthly",
  lastUpdatedDate: "2026-10-24",
  isLiveApiConfigured: false,
  attribution: "Data Sourced from U.S. Bureau of Labor Statistics (BLS) PPI Series WPU1017. Current interim points reflect published industry benchmark models.",
};
