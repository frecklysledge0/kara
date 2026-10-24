import { describe, it, expect } from "vitest";
import { translateGrade, getPopularGradeTranslations } from "@/lib/engine/grade-translator";

describe("MillProof Cross-Standard Grade Translator", () => {
  it("translates European S355JR / S355J2 to ASTM A572 Grade 50 with Direct Equivalent confidence", () => {
    const results = translateGrade("S355JR");
    expect(results.length).toBeGreaterThan(0);
    const match = results[0];
    expect(match.canonicalName).toBe("ASTM A572 Grade 50");
    expect(match.confidence).toBe("Direct Equivalent");
    expect(match.sourceStandardOrg).toContain("EN");
    expect(match.differencesSummary.mechanical).toContain("355 MPa");
  });

  it("translates European 1.4404 to AISI 316L stainless steel", () => {
    const results = translateGrade("1.4404");
    expect(results.length).toBeGreaterThan(0);
    const match = results[0];
    expect(match.canonicalName).toContain("316L");
    expect(match.confidence).toBe("Direct Equivalent");
    expect(match.differencesSummary.chemistry).toContain("C <=");
  });

  it("translates Japanese JIS SS400 to ASTM A36 with Close Substitute confidence", () => {
    const results = translateGrade("SS400");
    expect(results.length).toBeGreaterThan(0);
    const match = results[0];
    expect(match.canonicalName).toBe("ASTM A36");
    expect(match.confidence).toBe("Close Substitute");
    expect(match.sourceStandardOrg).toContain("JIS");
    expect(match.eorApprovalRecommended).toBe(true);
  });

  it("translates German 42CrMo4 to AISI 4140 alloy engineering steel", () => {
    const results = translateGrade("42CrMo4");
    expect(results.length).toBeGreaterThan(0);
    const match = results[0];
    expect(match.canonicalName).toBe("AISI 4140");
    expect(match.confidence).toBe("Direct Equivalent");
  });

  it("translates Canadian CSA 350W to ASTM A572 Grade 50", () => {
    const results = translateGrade("350W");
    expect(results.length).toBeGreaterThan(0);
    const match = results[0];
    expect(match.canonicalName).toBe("ASTM A572 Grade 50");
    expect(match.confidence).toBe("Direct Equivalent");
    expect(match.sourceStandardOrg).toContain("CSA");
  });

  it("translates European 1.4462 and UNS S31803 to Duplex 2205", () => {
    const resultsEn = translateGrade("1.4462");
    expect(resultsEn.length).toBeGreaterThan(0);
    expect(resultsEn[0].canonicalName).toContain("2205");

    const resultsUns = translateGrade("UNS S31803");
    expect(resultsUns.length).toBeGreaterThan(0);
    expect(resultsUns[0].canonicalName).toContain("2205");
  });

  it("returns empty array for empty or whitespace query", () => {
    expect(translateGrade("")).toEqual([]);
    expect(translateGrade("   ")).toEqual([]);
  });

  it("provides popular pre-configured translation examples", () => {
    const examples = getPopularGradeTranslations();
    expect(examples.length).toBeGreaterThan(4);
    expect(examples.some((e) => e.from.includes("S355"))).toBe(true);
    expect(examples.some((e) => e.from.includes("1.4404"))).toBe(true);
  });
});
