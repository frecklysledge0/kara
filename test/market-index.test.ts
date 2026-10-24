import { describe, it, expect } from "vitest";
import {
  HISTORICAL_STEEL_PPI_OBSERVATIONS,
  STEEL_PPI_SERIES_METADATA,
} from "@/lib/data/steel-ppi";
import { GET } from "@/app/api/market-index/route";

describe("Historical Steel Price Index Module", () => {
  it("contains curated, authentic BLS Series WPU1017 observations", () => {
    expect(HISTORICAL_STEEL_PPI_OBSERVATIONS.length).toBeGreaterThan(15);
    expect(STEEL_PPI_SERIES_METADATA.seriesId).toBe("WPU1017");
    expect(STEEL_PPI_SERIES_METADATA.publisher).toBe("U.S. Bureau of Labor Statistics (BLS)");
    expect(STEEL_PPI_SERIES_METADATA.baseYear).toBe("1982 = 100");

    // Check specific known historical peak (Dec 2021 = 436.4)
    const dec2021 = HISTORICAL_STEEL_PPI_OBSERVATIONS.find((o) => o.date === "2021-12-01");
    expect(dec2021).toBeDefined();
    expect(dec2021?.value).toBe(436.4);
    expect(dec2021?.observationType).toBe("actual_published_bls");
  });

  it("distinguishes actual published BLS observations from benchmark estimates", () => {
    const actuals = HISTORICAL_STEEL_PPI_OBSERVATIONS.filter(
      (o) => o.observationType === "actual_published_bls"
    );
    expect(actuals.length).toBeGreaterThan(10);
    // All observations should have valid dates (YYYY-MM-DD) and positive values
    for (const obs of HISTORICAL_STEEL_PPI_OBSERVATIONS) {
      expect(obs.date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(obs.value).toBeGreaterThan(100);
      expect(obs.periodLabel).toBeTruthy();
    }
  });

  it("serves GET /api/market-index with transparent fallback when FRED API key is unconfigured", async () => {
    const response = await GET();
    expect(response.status).toBe(200);

    const body = await response.json();
    expect(body.success).toBe(true);
    expect(body.metadata.seriesId).toBe("WPU1017");
    expect(body.metadata.publisher).toBe("U.S. Bureau of Labor Statistics (BLS)");

    // Since FRED_API_KEY is not in the environment, fallback must be explicitly declared
    if (!process.env.FRED_API_KEY) {
      expect(body.metadata.isLiveApiConfigured).toBe(false);
      expect(body.metadata.liveApiStatus).toBe("unconfigured_fallback");
    }

    // Analytics calculations
    expect(body.analytics.currentValue).toBeGreaterThan(200);
    expect(body.analytics.fiveYearHigh).toBeGreaterThanOrEqual(436.4);
    expect(body.analytics.fiveYearLow).toBeLessThanOrEqual(220.0);
    expect(typeof body.analytics.yoyChangePct).toBe("number");

    // Observations list
    expect(Array.isArray(body.observations)).toBe(true);
    expect(body.observations.length).toBe(HISTORICAL_STEEL_PPI_OBSERVATIONS.length);
  });
});
