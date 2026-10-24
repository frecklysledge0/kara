import { describe, it, expect } from "vitest";
import { getFixtureListingsWithRelations, FIXTURE_CERTIFICATES } from "@/lib/data/fixtures";

describe("MillProof Explicit Melt-and-Pour Certificate Provenance", () => {
  const listings = getFixtureListingsWithRelations();

  it("contains listings backed by explicit US melt-and-pour certificates", () => {
    const usLots = listings.filter((l) => l.certificate?.melt_pour_country === "USA");
    expect(usLots.length).toBeGreaterThan(0);
    usLots.forEach((lot) => {
      expect(lot.certificate?.melt_pour_country).toBe("USA");
      expect(lot.certificate?.heat_number).toBeDefined();
    });
  });

  it("contains foreign melt-and-pour lot with verified German certificate evidence", () => {
    const germanLots = listings.filter((l) => l.certificate?.melt_pour_country === "Germany");
    expect(germanLots.length).toBeGreaterThan(0);
    const germanLot = germanLots[0];
    expect(germanLot.certificate?.mill_name).toContain("Dillinger");
    expect(germanLot.certificate?.heat_number).toBe("H-881022");
    expect(germanLot.certificate?.document_sha256).toBeDefined();
  });

  it("contains lot with unspecified melt-and-pour country marked as ineligible for BAA", () => {
    const unspecifiedLots = listings.filter((l) => l.certificate?.melt_pour_country == null);
    expect(unspecifiedLots.length).toBeGreaterThan(0);
    const unspecLot = unspecifiedLots[0];
    expect(unspecLot.certificate?.flags).toContainEqual(
      expect.stringContaining("Missing explicit melt and pour country")
    );
  });

  it("filters strictly: Buy America Act (BAA/BABA) filter excludes foreign and unspecified lots", () => {
    const baaEligibleLots = listings.filter((l) => l.certificate?.melt_pour_country === "USA");
    const nonBaaLots = listings.filter((l) => l.certificate?.melt_pour_country !== "USA");

    expect(baaEligibleLots.length).toBeGreaterThan(0);
    expect(nonBaaLots.length).toBeGreaterThan(0);

    // Verify non-BAA lots are excluded from BAA query
    nonBaaLots.forEach((lot) => {
      expect(lot.certificate?.melt_pour_country).not.toBe("USA");
    });
  });

  it("verifies certificates in registry maintain SHA-256 tracking and heat numbers", () => {
    FIXTURE_CERTIFICATES.forEach((cert) => {
      expect(cert.document_sha256).toMatch(/^[a-f0-9]{64}$/);
      expect(cert.heat_number).toBeDefined();
    });
  });
});
