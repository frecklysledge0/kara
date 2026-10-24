import { GradeStandard } from "@/types/steel";

export const GRADE_STANDARDS_REGISTRY: Record<string, GradeStandard> = {
  "astm-a36": {
    id: "astm-a36",
    standard_org: "ASTM",
    grade_name: "A36 Structural Carbon",
    category: "Carbon Structural",
    description: "Standard structural steel for bolted, riveted, or welded construction of bridges, buildings, and general structural applications.",
    typical_applications: ["Bridge girders", "Commercial buildings", "Base plates", "General fabrication"],
    weldability_rating: "Excellent (AWS D1.1 prequalified)",
    max_cev: 0.40,
    chem_limits: {
      C: { max: 0.25 },
      Mn: { min: 0.80, max: 1.20 },
      P: { max: 0.040 },
      S: { max: 0.050 },
      Si: { max: 0.40 },
      Cu: { min: 0.20 }
    },
    mech_limits: {
      yield_min_ksi: 36.0,
      tensile_min_ksi: 58.0,
      tensile_max_ksi: 80.0,
      elongation_min_pct: 20.0
    }
  },
  "astm-a572-50": {
    id: "astm-a572-50",
    standard_org: "ASTM",
    grade_name: "A572 Grade 50 (HSLA)",
    category: "High-Strength Low-Alloy",
    description: "High-strength low-alloy columbium-vanadium structural steel offering exceptional strength-to-weight ratio with superior weldability.",
    typical_applications: ["Highway bridges", "Heavy construction equipment", "Transmission towers", "Crane booms"],
    weldability_rating: "Good with standard preheat",
    max_cev: 0.43,
    chem_limits: {
      C: { max: 0.23 },
      Mn: { max: 1.35 },
      P: { max: 0.040 },
      S: { max: 0.050 },
      Si: { max: 0.40 },
      V: { min: 0.01, max: 0.15 },
      Nb: { min: 0.005, max: 0.05 }
    },
    mech_limits: {
      yield_min_ksi: 50.0,
      tensile_min_ksi: 65.0,
      elongation_min_pct: 18.0
    }
  },
  "astm-a514": {
    id: "astm-a514",
    standard_org: "ASTM",
    grade_name: "A514 (T-1) Quenched & Tempered",
    category: "Quenched & Tempered Alloy",
    description: "High-yield strength quenched and tempered alloy steel plate intended primarily for welded bridges and mining equipment requiring 100 ksi minimum yield.",
    typical_applications: ["Heavy mining dump bodies", "Offshore crane jibs", "Excavator buckets", "Wear liners"],
    weldability_rating: "Requires strict WPS & low-hydrogen electrode control",
    max_cev: 0.58,
    chem_limits: {
      C: { min: 0.12, max: 0.21 },
      Mn: { min: 0.70, max: 1.00 },
      P: { max: 0.035 },
      S: { max: 0.035 },
      Si: { min: 0.20, max: 0.35 },
      Cr: { min: 0.40, max: 0.65 },
      Mo: { min: 0.15, max: 0.25 },
      B: { min: 0.001, max: 0.005 }
    },
    mech_limits: {
      yield_min_ksi: 100.0,
      tensile_min_ksi: 110.0,
      tensile_max_ksi: 130.0,
      elongation_min_pct: 16.0,
      hardness_max_hbw: 293
    }
  },
  "astm-a516-70": {
    id: "astm-a516-70",
    standard_org: "ASTM",
    grade_name: "A516 Grade 70 (PVQ)",
    category: "Pressure Vessel Quality",
    description: "Carbon steel plate intended primarily for service in welded pressure vessels where improved notch toughness is essential for moderate and lower temperature service.",
    typical_applications: ["Industrial boilers", "Petrochemical pressure vessels", "Gas storage spheres", "Cryogenic tanks"],
    weldability_rating: "Good with ASME Section IX procedures",
    max_cev: 0.44,
    chem_limits: {
      C: { max: 0.28 },
      Mn: { min: 0.85, max: 1.20 },
      P: { max: 0.025 },
      S: { max: 0.025 },
      Si: { min: 0.15, max: 0.40 }
    },
    mech_limits: {
      yield_min_ksi: 38.0,
      tensile_min_ksi: 70.0,
      tensile_max_ksi: 90.0,
      elongation_min_pct: 21.0,
      charpy_temp_f: -50.0,
      charpy_min_ft_lbs: 20.0
    }
  },
  "aisi-304l": {
    id: "aisi-304l",
    standard_org: "AISI",
    grade_name: "304L Austenitic Stainless",
    category: "Stainless Steel",
    description: "Extra-low carbon version of 304 stainless steel providing immunity to carbide precipitation during welding with excellent general corrosion resistance.",
    typical_applications: ["Food and beverage processing", "Chemical tanks", "Architectural facades", "Cryogenic equipment"],
    weldability_rating: "Excellent (308L filler recommended)",
    chem_limits: {
      C: { max: 0.030 },
      Mn: { max: 2.00 },
      P: { max: 0.045 },
      S: { max: 0.030 },
      Si: { max: 0.75 },
      Cr: { min: 18.00, max: 20.00 },
      Ni: { min: 8.00, max: 12.00 },
      N: { max: 0.10 }
    },
    mech_limits: {
      yield_min_ksi: 25.0,
      tensile_min_ksi: 70.0,
      elongation_min_pct: 40.0,
      hardness_max_hbw: 201
    }
  },
  "aisi-316l": {
    id: "aisi-316l",
    standard_org: "AISI",
    grade_name: "316L Marine Grade Stainless",
    category: "Stainless Steel",
    description: "Molybdenum-bearing austenitic stainless steel offering superior resistance to pitting and crevice corrosion in chloride and harsh marine environments.",
    typical_applications: ["Marine hardware", "Pharmaceutical equipment", "Offshore piping", "Chemical plants"],
    weldability_rating: "Excellent (316L filler required)",
    chem_limits: {
      C: { max: 0.030 },
      Mn: { max: 2.00 },
      P: { max: 0.045 },
      S: { max: 0.030 },
      Si: { max: 0.75 },
      Cr: { min: 16.00, max: 18.00 },
      Ni: { min: 10.00, max: 14.00 },
      Mo: { min: 2.00, max: 3.00 },
      N: { max: 0.10 }
    },
    mech_limits: {
      yield_min_ksi: 25.0,
      tensile_min_ksi: 70.0,
      elongation_min_pct: 40.0,
      hardness_max_hbw: 217
    }
  },
  "aisi-4140": {
    id: "aisi-4140",
    standard_org: "AISI",
    grade_name: "4140 Chromium-Moly Alloy",
    category: "Alloy Steel",
    description: "Chromium-molybdenum through-hardening alloy steel providing exceptional toughness, high fatigue strength, and wear resistance.",
    typical_applications: ["Drill collars", "Forged shafts", "Heavy gears", "Hydraulic cylinders"],
    weldability_rating: "Requires preheat and post-weld heat treatment",
    max_cev: 0.65,
    chem_limits: {
      C: { min: 0.38, max: 0.43 },
      Mn: { min: 0.75, max: 1.00 },
      P: { max: 0.035 },
      S: { max: 0.040 },
      Si: { min: 0.15, max: 0.35 },
      Cr: { min: 0.80, max: 1.10 },
      Mo: { min: 0.15, max: 0.25 }
    },
    mech_limits: {
      yield_min_ksi: 95.0,
      tensile_min_ksi: 125.0,
      elongation_min_pct: 18.0,
      hardness_max_hbw: 285
    }
  }
};

export const ALL_GRADE_STANDARDS = Object.values(GRADE_STANDARDS_REGISTRY);
