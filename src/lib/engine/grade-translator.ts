// =====================================================================
// MillProof: Cross-Standard Steel Grade Translation Engine
// Sourced metallurgical equivalence mapping across ASTM, EN, JIS, CSA, ISO, and DIN
// =====================================================================

import { CURATED_GRADES } from "@/lib/data/grades";
import { SteelGradeEntry } from "@/types/grades";

export type EquivalenceConfidence = "Direct Equivalent" | "Close Substitute" | "Partial Match";

export interface GradeTranslationResult {
  query: string;
  matchedGrade: SteelGradeEntry;
  canonicalName: string;
  applicableStandard: string;
  sourceStandardOrg: string;
  sourceDesignation: string;
  confidence: EquivalenceConfidence;
  sourceNotes: string;
  differencesSummary: {
    chemistry: string;
    mechanical: string;
    weldability: string;
  };
  eorApprovalRecommended: boolean;
  citation: string;
}

interface EquivalenceEntry {
  aliasPattern: RegExp;
  sourceStandardOrg: string;
  sourceDesignation: string;
  targetGradeId: string;
  confidence: EquivalenceConfidence;
  sourceNotes: string;
  chemistryDelta: string;
  mechanicalDelta: string;
  weldabilityDelta: string;
  eorApprovalRecommended: boolean;
  citation: string;
}

/**
 * Curated knowledge base of cross-standard equivalence mappings.
 * Each entry references published international standards and engineering cross-references.
 */
const CURATED_EQUIVALENCE_INDEX: EquivalenceEntry[] = [
  // ASTM A36 Equivalents
  {
    aliasPattern: /^(en\s*10025-2\s*)?s275(jr|j0|j2)?$/i,
    sourceStandardOrg: "EN (European Standards)",
    sourceDesignation: "EN 10025-2 S275JR (1.0044)",
    targetGradeId: "astm-a36",
    confidence: "Close Substitute",
    sourceNotes: "Minimum yield is 275 MPa (39.9 ksi), slightly exceeding A36 minimum (36 ksi). Carbon, manganese, and phosphorus limits closely align.",
    chemistryDelta: "S275JR permits up to 0.21% C vs 0.25% C max in A36; slightly tighter European ladle limits.",
    mechanicalDelta: "Yield: 275 MPa (39.9 ksi) vs 248 MPa (36.0 ksi). Tensile range 410-560 MPa aligns with A36 400-550 MPa (58-80 ksi).",
    weldabilityDelta: "Both Group I prequalified steels under AWS D1.1 / EN 1011-2.",
    eorApprovalRecommended: false,
    citation: "EN 10025-2:2019 Table 7 & ASTM A36/A36M-19 Table 2",
  },
  {
    aliasPattern: /^(jis\s*g3101\s*)?ss400$/i,
    sourceStandardOrg: "JIS (Japanese Industrial Standards)",
    sourceDesignation: "JIS G3101 SS400",
    targetGradeId: "astm-a36",
    confidence: "Close Substitute",
    sourceNotes: "Standard Japanese structural carbon steel. Tensile range 400-510 MPa matches A36; SS400 does not specify chemistry limits for C, Mn, or Si.",
    chemistryDelta: "SS400 specifies only P <= 0.050% and S <= 0.050%; A36 enforces strict C, Mn, P, S, and Si limits.",
    mechanicalDelta: "SS400 specifies minimum yield 245 MPa for t <= 16mm (35.5 ksi), closely matching A36 (36.0 ksi).",
    weldabilityDelta: "SS400 is not explicitly defined as guaranteed weldable without MTR chemistry verification of Carbon Equivalent (CEV).",
    eorApprovalRecommended: true,
    citation: "JIS G 3101:2020 & ASTM A36/A36M-19",
  },
  {
    aliasPattern: /^(csa\s*g40\.21\s*)?260w$/i,
    sourceStandardOrg: "CSA (Canadian Standards Association)",
    sourceDesignation: "CSA G40.21 260W",
    targetGradeId: "astm-a36",
    confidence: "Direct Equivalent",
    sourceNotes: "Canadian standard weldable structural steel with guaranteed 260 MPa (37.7 ksi) minimum yield.",
    chemistryDelta: "CSA 260W has 0.22% C max and CEV <= 0.40, fully compliant with A36 tolerances.",
    mechanicalDelta: "Yield 260 MPa (37.7 ksi) vs 250 MPa (36 ksi) for A36.",
    weldabilityDelta: "Direct weldable substitute with low carbon equivalent.",
    eorApprovalRecommended: false,
    citation: "CSA G40.20/G40.21-13 & ASTM A36/A36M",
  },
  {
    aliasPattern: /^(din\s*17100\s*)?st\s*37(-2)?$/i,
    sourceStandardOrg: "DIN (German Standards)",
    sourceDesignation: "DIN 17100 St 37-2 (1.0037)",
    targetGradeId: "astm-a36",
    confidence: "Close Substitute",
    sourceNotes: "Historical German designation superseded by EN 10025 S235/S275.",
    chemistryDelta: "C <= 0.17% for normal plates; cleaner chemistry than basic A36.",
    mechanicalDelta: "Yield 235 MPa (34 ksi) minimum; slightly lower than A36 36 ksi.",
    weldabilityDelta: "Excellent weldability, preheat seldom required.",
    eorApprovalRecommended: true,
    citation: "DIN 17100 (Historical) / EN 10025-2",
  },

  // ASTM A572 Grade 50 Equivalents
  {
    aliasPattern: /^(en\s*10025-2\s*)?s355(jr|j0|j2|k2)?$/i,
    sourceStandardOrg: "EN (European Standards)",
    sourceDesignation: "EN 10025-2 S355JR / S355J2 (1.0577)",
    targetGradeId: "astm-a572-50",
    confidence: "Direct Equivalent",
    sourceNotes: "Primary European HSLA structural grade. Minimum yield 355 MPa (51.5 ksi) matches A572 Grade 50 (50 ksi). S355J2 includes guaranteed -20°C (27J) impact testing.",
    chemistryDelta: "Both employ microalloying (Nb/V) with C <= 0.23% (A572-50) and C <= 0.22% (S355J2).",
    mechanicalDelta: "Yield: 355 MPa (51.5 ksi) vs 345 MPa (50.0 ksi). Tensile: 470-630 MPa vs 450 MPa (65 ksi) min.",
    weldabilityDelta: "Both prequalified under AWS D1.1 / EN 1011-2 with low hydrogen practices.",
    eorApprovalRecommended: false,
    citation: "EN 10025-2:2019 Table 7 & ASTM A572/A572M-21 Table 1",
  },
  {
    aliasPattern: /^(csa\s*g40\.21\s*)?350w$/i,
    sourceStandardOrg: "CSA (Canadian Standards Association)",
    sourceDesignation: "CSA G40.21 350W",
    targetGradeId: "astm-a572-50",
    confidence: "Direct Equivalent",
    sourceNotes: "Ubiquitous Canadian 350 MPa (50.8 ksi) yield weldable structural steel grade.",
    chemistryDelta: "Controlled carbon equivalent formula and 0.23% C max.",
    mechanicalDelta: "Yield 350 MPa (50.8 ksi) matches A572 Gr 50 (50.0 ksi).",
    weldabilityDelta: "Prequalified across Canadian and US structural welding codes.",
    eorApprovalRecommended: false,
    citation: "CSA G40.21-13 & ASTM A572/A572M-21",
  },
  {
    aliasPattern: /^(jis\s*g3106\s*)?sm490(a|b|c)?$/i,
    sourceStandardOrg: "JIS (Japanese Industrial Standards)",
    sourceDesignation: "JIS G3106 SM490A",
    targetGradeId: "astm-a572-50",
    confidence: "Direct Equivalent",
    sourceNotes: "Japanese weldable structural steel with minimum yield 325 MPa (t<=16mm) or 315 MPa, tensile 490-610 MPa.",
    chemistryDelta: "Controlled C <= 0.20%, Mn <= 1.60%, P <= 0.035%, S <= 0.035%.",
    mechanicalDelta: "Tensile 490 MPa (71 ksi) minimum.",
    weldabilityDelta: "Specifically formulated for welded building frames and bridges.",
    eorApprovalRecommended: false,
    citation: "JIS G 3106:2020 Table 2",
  },
  {
    aliasPattern: /^(din\s*17100\s*)?st\s*52(-3)?$/i,
    sourceStandardOrg: "DIN (German Standards)",
    sourceDesignation: "DIN 17100 St 52-3 (1.0570)",
    targetGradeId: "astm-a572-50",
    confidence: "Close Substitute",
    sourceNotes: "Classic German 355 MPa structural steel, now standardized as S355.",
    chemistryDelta: "C <= 0.20%, Mn <= 1.60%, Si <= 0.55%.",
    mechanicalDelta: "Yield 355 MPa (51.5 ksi) aligns with A572 Grade 50.",
    weldabilityDelta: "Weldable with low-hydrogen electrodes.",
    eorApprovalRecommended: false,
    citation: "DIN 17100 / EN 10025-2",
  },

  // ASTM A588 Weathering Steel Equivalents
  {
    aliasPattern: /^(en\s*10025-5\s*)?s355(j0|j2)?w$/i,
    sourceStandardOrg: "EN (European Standards)",
    sourceDesignation: "EN 10025-5 S355J2W (1.8965)",
    targetGradeId: "astm-a588",
    confidence: "Direct Equivalent",
    sourceNotes: "European atmospheric corrosion-resistant weathering steel with 355 MPa yield and Cr-Cu-Ni patina-forming alloy system.",
    chemistryDelta: "Contains Cu (0.25-0.55%), Cr (0.40-0.80%), and Ni (0.12-0.65%), matching ASTM A588 Grade A.",
    mechanicalDelta: "Minimum yield 355 MPa (51.5 ksi) matches A588 50 ksi requirement.",
    weldabilityDelta: "Requires matching weathering filler metals (AWS E8018-W2 or equivalent) for uniform patina color.",
    eorApprovalRecommended: false,
    citation: "EN 10025-5:2019 Table 2 & ASTM A588/A588M-19 Table 1",
  },
  {
    aliasPattern: /^(aashto\s*m270\s*)?(grade\s*)?50w$/i,
    sourceStandardOrg: "AASHTO (US Highway Officials)",
    sourceDesignation: "AASHTO M270 Grade 50W",
    targetGradeId: "astm-a588",
    confidence: "Direct Equivalent",
    sourceNotes: "US highway bridge standard matching ASTM A588 with mandatory CVN impact toughness Zone 1, 2, or 3.",
    chemistryDelta: "Identical chemical requirements to ASTM A588 Grade A/B.",
    mechanicalDelta: "Identical yield (50 ksi) and tensile (70 ksi) requirements with bridge CVN mandate.",
    weldabilityDelta: "Prequalified under AWS D1.5 Bridge Welding Code.",
    eorApprovalRecommended: false,
    citation: "AASHTO M 270M/M 270 & ASTM A588/A588M",
  },

  // SAE/AISI 1018 Equivalents
  {
    aliasPattern: /^(en\s*10083-2\s*)?(c15|c15e|1\.1141)$/i,
    sourceStandardOrg: "EN (European Standards)",
    sourceDesignation: "EN 10083-2 C15E / 1.1141",
    targetGradeId: "sae-1018",
    confidence: "Close Substitute",
    sourceNotes: "European case-hardening non-alloy engineering steel with 0.12-0.18% C.",
    chemistryDelta: "C15E has 0.12-0.18% C vs 0.15-0.20% C in 1018; Mn 0.30-0.60% vs 0.60-0.90% in 1018.",
    mechanicalDelta: "Similar cold-drawn or normalized mechanical properties.",
    weldabilityDelta: "Readily weldable without preheat.",
    eorApprovalRecommended: false,
    citation: "EN 10083-2:2006 & SAE J403",
  },
  {
    aliasPattern: /^(jis\s*g4051\s*)?s15c$/i,
    sourceStandardOrg: "JIS (Japanese Industrial Standards)",
    sourceDesignation: "JIS G4051 S15C",
    targetGradeId: "sae-1018",
    confidence: "Close Substitute",
    sourceNotes: "Japanese machinery carbon steel with 0.13-0.18% C and 0.30-0.60% Mn.",
    chemistryDelta: "Slightly lower manganese content than AISI 1018 (0.60-0.90% Mn).",
    mechanicalDelta: "Comparable tensile and yield properties in normalized condition.",
    weldabilityDelta: "High weldability and machinability.",
    eorApprovalRecommended: false,
    citation: "JIS G 4051:2016",
  },

  // SAE/AISI 1045 Equivalents
  {
    aliasPattern: /^(en\s*10083-2\s*)?(c45|c45e|1\.1191)$/i,
    sourceStandardOrg: "EN (European Standards)",
    sourceDesignation: "EN 10083-2 C45E / 1.1191",
    targetGradeId: "sae-1045",
    confidence: "Direct Equivalent",
    sourceNotes: "European standard 0.45% carbon machinery steel for shafts, axles, and gears.",
    chemistryDelta: "C45E: 0.42-0.50% C, 0.50-0.80% Mn. AISI 1045: 0.43-0.50% C, 0.60-0.90% Mn.",
    mechanicalDelta: "Virtually identical quench and temper response and tensile ranges.",
    weldabilityDelta: "Requires 400-500°F preheat and post-weld stress relief due to high hardenability.",
    eorApprovalRecommended: false,
    citation: "EN 10083-2:2006 & SAE J403",
  },
  {
    aliasPattern: /^(jis\s*g4051\s*)?s45c$/i,
    sourceStandardOrg: "JIS (Japanese Industrial Standards)",
    sourceDesignation: "JIS G4051 S45C",
    targetGradeId: "sae-1045",
    confidence: "Direct Equivalent",
    sourceNotes: "Ubiquitous Japanese machinery steel with 0.42-0.48% C.",
    chemistryDelta: "Matches AISI 1045 chemistry limits within 0.02%.",
    mechanicalDelta: "Direct substitution for shafts, studs, and machinery blanks.",
    weldabilityDelta: "Preheat mandatory to avoid heat-affected zone cracking.",
    eorApprovalRecommended: false,
    citation: "JIS G 4051:2016",
  },

  // AISI 4140 Equivalents
  {
    aliasPattern: /^(en\s*10083-3\s*)?(42crmo4|1\.7225)$/i,
    sourceStandardOrg: "EN (European Standards)",
    sourceDesignation: "EN 10083-3 42CrMo4 / 1.7225",
    targetGradeId: "aisi-4140",
    confidence: "Direct Equivalent",
    sourceNotes: "European chromium-molybdenum alloy steel with 0.90-1.20% Cr and 0.15-0.30% Mo.",
    chemistryDelta: "42CrMo4: 0.38-0.45% C, 0.90-1.20% Cr, 0.15-0.30% Mo. AISI 4140: 0.38-0.43% C, 0.80-1.10% Cr, 0.15-0.25% Mo.",
    mechanicalDelta: "Identical hardenability band (Jominy end-quench curves) and quenched/tempered strength.",
    weldabilityDelta: "Requires strict preheat (500°F) and post-weld heat treatment (PWHT).",
    eorApprovalRecommended: false,
    citation: "EN 10083-3:2006 & SAE J404",
  },
  {
    aliasPattern: /^(jis\s*g4053\s*)?scm440$/i,
    sourceStandardOrg: "JIS (Japanese Industrial Standards)",
    sourceDesignation: "JIS G4053 SCM440",
    targetGradeId: "aisi-4140",
    confidence: "Direct Equivalent",
    sourceNotes: "Japanese Cr-Mo alloy steel with 0.38-0.43% C, 0.90-1.20% Cr, 0.15-0.30% Mo.",
    chemistryDelta: "Virtually identical composition to AISI 4140 and 42CrMo4.",
    mechanicalDelta: "Direct substitute for heavy-duty drive shafts, fasteners, and gears.",
    weldabilityDelta: "Low-hydrogen procedures and thermal soak required.",
    eorApprovalRecommended: false,
    citation: "JIS G 4053:2016",
  },

  // AISI 304 Stainless Equivalents
  {
    aliasPattern: /^(en\s*10088-2\s*)?(1\.4301|x5crni18-10)$/i,
    sourceStandardOrg: "EN (European Standards)",
    sourceDesignation: "EN 10088-2 1.4301 / X5CrNi18-10",
    targetGradeId: "aisi-304",
    confidence: "Direct Equivalent",
    sourceNotes: "Primary European 18-8 austenitic stainless steel with 17.5-19.5% Cr and 8.0-10.5% Ni.",
    chemistryDelta: "1.4301 permits C <= 0.07%; AISI 304 specifies C <= 0.08%. Chromium and nickel limits coincide.",
    mechanicalDelta: "Yield 210 MPa (30.5 ksi) and tensile 520-720 MPa match ASTM A240 requirements.",
    weldabilityDelta: "Excellent weldability; susceptible to sensitization in heavy sections if C exceeds 0.03%.",
    eorApprovalRecommended: false,
    citation: "EN 10088-2:2014 & ASTM A240/A240M-20",
  },
  {
    aliasPattern: /^(jis\s*g4303\s*)?sus304$/i,
    sourceStandardOrg: "JIS (Japanese Industrial Standards)",
    sourceDesignation: "JIS G4303 SUS304",
    targetGradeId: "aisi-304",
    confidence: "Direct Equivalent",
    sourceNotes: "Standard Japanese 18-8 austenitic stainless steel.",
    chemistryDelta: "C <= 0.08%, Cr 18.0-20.0%, Ni 8.0-10.5%.",
    mechanicalDelta: "Identical physical, chemical, and non-magnetic austenitic characteristics.",
    weldabilityDelta: "Direct substitute across food, sanitary, and architectural applications.",
    eorApprovalRecommended: false,
    citation: "JIS G 4303:2012 & ASTM A240",
  },

  // AISI 316L Stainless Equivalents
  {
    aliasPattern: /^(en\s*10088-2\s*)?(1\.4404|x2crnimo17-12-2)$/i,
    sourceStandardOrg: "EN (European Standards)",
    sourceDesignation: "EN 10088-2 1.4404 / X2CrNiMo17-12-2",
    targetGradeId: "aisi-316l",
    confidence: "Direct Equivalent",
    sourceNotes: "European low-carbon molybdenum-bearing austenitic stainless steel (16.5-18.5% Cr, 10.0-13.0% Ni, 2.0-2.5% Mo).",
    chemistryDelta: "Both enforce C <= 0.030% to prevent chromium carbide precipitation at grain boundaries.",
    mechanicalDelta: "Yield 220 MPa (31.9 ksi), tensile 520-670 MPa match ASTM A240 316L requirements.",
    weldabilityDelta: "Immune to intergranular corrosion in the as-welded state without post-weld annealing.",
    eorApprovalRecommended: false,
    citation: "EN 10088-2:2014 & ASTM A240/A240M-20",
  },
  {
    aliasPattern: /^(jis\s*g4303\s*)?sus316l$/i,
    sourceStandardOrg: "JIS (Japanese Industrial Standards)",
    sourceDesignation: "JIS G4303 SUS316L",
    targetGradeId: "aisi-316l",
    confidence: "Direct Equivalent",
    sourceNotes: "Japanese low-carbon molybdenum austenitic grade.",
    chemistryDelta: "C <= 0.030%, Cr 16.0-18.0%, Ni 12.0-15.0%, Mo 2.0-3.0%.",
    mechanicalDelta: "PREN rating ~23-25 for chloride pitting resistance.",
    weldabilityDelta: "Direct substitute for marine, chemical, and pharmaceutical processing equipment.",
    eorApprovalRecommended: false,
    citation: "JIS G 4303:2012 & ASTM A240",
  },

  // AISI 409 Stainless Equivalents
  {
    aliasPattern: /^(en\s*10088-2\s*)?(1\.4512|x2crti12)$/i,
    sourceStandardOrg: "EN (European Standards)",
    sourceDesignation: "EN 10088-2 1.4512 / X2CrTi12",
    targetGradeId: "aisi-409",
    confidence: "Direct Equivalent",
    sourceNotes: "European titanium-stabilized 11-12% chromium ferritic stainless steel.",
    chemistryDelta: "Contains 10.5-12.5% Cr with Ti stabilization (6x C min) to bind carbon and prevent intergranular corrosion.",
    mechanicalDelta: "Ferritic structure, magnetic, yield ~220 MPa (32 ksi), tensile 380-560 MPa.",
    weldabilityDelta: "Susceptible to grain growth in heat-affected zone (HAZ); requires controlled low heat input.",
    eorApprovalRecommended: false,
    citation: "EN 10088-2:2014 & ASTM A240",
  },
  {
    aliasPattern: /^(jis\s*g4305\s*)?sus409l$/i,
    sourceStandardOrg: "JIS (Japanese Industrial Standards)",
    sourceDesignation: "JIS G4305 SUS409L",
    targetGradeId: "aisi-409",
    confidence: "Direct Equivalent",
    sourceNotes: "Japanese titanium-stabilized low-carbon ferritic stainless grade for automotive exhaust applications.",
    chemistryDelta: "Matches AISI 409 chemical specification.",
    mechanicalDelta: "Direct substitute for catalytic converter housings and silencers.",
    weldabilityDelta: "Specialized procedures needed to prevent embrittlement.",
    eorApprovalRecommended: false,
    citation: "JIS G 4305:2012 & ASTM A240",
  },

  // Duplex 2205 Equivalents
  {
    aliasPattern: /^(en\s*10088-2\s*)?(1\.4462|x2crnimon22-5-3)$/i,
    sourceStandardOrg: "EN (European Standards)",
    sourceDesignation: "EN 10088-2 1.4462 / X2CrNiMoN22-5-3",
    targetGradeId: "duplex-2205",
    confidence: "Direct Equivalent",
    sourceNotes: "Standard European designation for 2205 22% Cr duplex stainless steel (50/50 austenite-ferrite microstructure).",
    chemistryDelta: "21.0-23.0% Cr, 4.5-6.5% Ni, 2.5-3.5% Mo, 0.10-0.22% N. Exactly mirrors UNS S31803 / S32205.",
    mechanicalDelta: "Minimum yield 450 MPa (65 ksi), tensile 650-880 MPa. Over double the yield strength of 316L.",
    weldabilityDelta: "Requires nitrogen-supplemented shielding gas and controlled heat input to preserve 50/50 phase balance.",
    eorApprovalRecommended: false,
    citation: "EN 10088-2:2014 & ASTM A240/A240M UNS S32205",
  },
  {
    aliasPattern: /^uns\s*s31803$/i,
    sourceStandardOrg: "UNS / ASTM",
    sourceDesignation: "UNS S31803 (Standard Duplex 2205)",
    targetGradeId: "duplex-2205",
    confidence: "Direct Equivalent",
    sourceNotes: "Original UNS designation for 22Cr duplex stainless. Most modern material is dual-certified to tighter S32205 limits.",
    chemistryDelta: "S31803 allows slightly wider Cr (21-23%), Mo (2.5-3.5%), and N (0.08-0.20%) ranges than S32205.",
    mechanicalDelta: "Identical minimum tensile (95 ksi) and yield (65 ksi) requirements.",
    weldabilityDelta: "WPS must specify heat input between 0.5 - 2.5 kJ/mm.",
    eorApprovalRecommended: false,
    citation: "ASTM A240/A240M-20 & NACE MR0175/ISO 15156",
  },
  {
    aliasPattern: /^(nace\s*mr0175|iso\s*15156(-3)?)$/i,
    sourceStandardOrg: "NACE / ISO",
    sourceDesignation: "NACE MR0175 / ISO 15156-3 Table A.24",
    targetGradeId: "duplex-2205",
    confidence: "Direct Equivalent",
    sourceNotes: "Approved standard for sour oil & gas environment service (H2S partial pressure <= 0.3 psi, temp <= 450°F).",
    chemistryDelta: "Requires PREN >= 34.0, max hardness 28 HRC (270 HBW).",
    mechanicalDelta: "Guaranteed impact toughness and corrosion cracking resistance.",
    weldabilityDelta: "Requires microstructural examination of weld and HAZ to verify 30-70% ferrite content.",
    eorApprovalRecommended: true,
    citation: "NACE MR0175 / ISO 15156-3",
  },
];

/**
 * Searches the curated equivalence index and canonical knowledge base for matching grades.
 */
export function translateGrade(query: string): GradeTranslationResult[] {
  if (!query || query.trim() === "") return [];

  const cleanQuery = query.trim().toLowerCase();
  const results: GradeTranslationResult[] = [];
  const seenGradeIds = new Set<string>();

  // 1. Direct match in curated international equivalence index
  for (const entry of CURATED_EQUIVALENCE_INDEX) {
    if (entry.aliasPattern.test(cleanQuery) || cleanQuery.includes(entry.sourceDesignation.toLowerCase())) {
      const targetGrade = CURATED_GRADES.find((g) => g.id === entry.targetGradeId);
      if (targetGrade && !seenGradeIds.has(targetGrade.id)) {
        seenGradeIds.add(targetGrade.id);
        results.push({
          query,
          matchedGrade: targetGrade,
          canonicalName: targetGrade.canonical_name,
          applicableStandard: targetGrade.applicable_standard,
          sourceStandardOrg: entry.sourceStandardOrg,
          sourceDesignation: entry.sourceDesignation,
          confidence: entry.confidence,
          sourceNotes: entry.sourceNotes,
          differencesSummary: {
            chemistry: entry.chemistryDelta,
            mechanical: entry.mechanicalDelta,
            weldability: entry.weldabilityDelta,
          },
          eorApprovalRecommended: entry.eorApprovalRecommended,
          citation: entry.citation,
        });
      }
    }
  }

  // 2. Direct match against canonical names, UNS numbers, or cross_standards in data/grades.json
  for (const grade of CURATED_GRADES) {
    if (seenGradeIds.has(grade.id)) continue;

    const matchesCanonical =
      grade.canonical_name.toLowerCase().includes(cleanQuery) ||
      grade.id.toLowerCase().includes(cleanQuery);
    const matchesUns = grade.uns_number && grade.uns_number.toLowerCase().includes(cleanQuery);
    const matchesEn = grade.en_designation && grade.en_designation.toLowerCase().includes(cleanQuery);

    const crossMatch = grade.cross_standard_equivalents.find((eq) =>
      eq.designation.toLowerCase().includes(cleanQuery) ||
      cleanQuery.includes(eq.designation.toLowerCase())
    );

    if (matchesCanonical || matchesUns || matchesEn || crossMatch) {
      seenGradeIds.add(grade.id);
      results.push({
        query,
        matchedGrade: grade,
        canonicalName: grade.canonical_name,
        applicableStandard: grade.applicable_standard,
        sourceStandardOrg: crossMatch ? crossMatch.standard_org : "ASTM/AISI",
        sourceDesignation: crossMatch ? crossMatch.designation : grade.canonical_name,
        confidence: crossMatch ? crossMatch.confidence : "Direct Equivalent",
        sourceNotes: crossMatch
          ? crossMatch.source_notes
          : `Direct match with curated canonical grade ${grade.canonical_name} (${grade.applicable_standard}).`,
        differencesSummary: {
          chemistry: `Governed by ${grade.chemistry_limits.source}.`,
          mechanical: `Minimum yield: ${grade.mechanical_properties.yield_strength.min ?? "—"} ${grade.mechanical_properties.yield_strength.unit}; Tensile: ${grade.mechanical_properties.tensile_strength.min ?? "—"}-${grade.mechanical_properties.tensile_strength.max ?? "—"} ${grade.mechanical_properties.tensile_strength.unit}.`,
          weldability: `${grade.weldability.rating}. Processes: ${grade.weldability.recommended_processes.join(", ")}.`,
        },
        eorApprovalRecommended: crossMatch ? crossMatch.confidence === "Partial Match" : false,
        citation: grade.source_references[0]?.title || grade.applicable_standard,
      });
    }
  }

  return results;
}

/**
 * Returns common popular translation examples for user guidance.
 */
export function getPopularGradeTranslations(): Array<{ from: string; to: string; standard: string }> {
  return [
    { from: "EN 10025-2 S355J2", to: "ASTM A572 Grade 50", standard: "Structural HSLA" },
    { from: "EN 10088-2 1.4404", to: "AISI 316L", standard: "Austenitic Stainless" },
    { from: "JIS G3101 SS400", to: "ASTM A36", standard: "Carbon Plate" },
    { from: "EN 10083-3 42CrMo4", to: "AISI 4140", standard: "Alloy Engineering" },
    { from: "EN 10088-2 1.4462", to: "2205 Duplex Stainless", standard: "Duplex 22Cr" },
    { from: "EN 10025-5 S355J2W", to: "ASTM A588", standard: "Weathering Steel" },
    { from: "JIS G4051 S45C", to: "SAE/AISI 1045", standard: "Machinery Carbon" },
  ];
}
