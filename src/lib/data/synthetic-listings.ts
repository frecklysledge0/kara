import { Seller, MaterialTestCertificate, InventoryListing } from "@/types/steel";
import { GRADE_STANDARDS_REGISTRY } from "./standards";

export const SYNTHETIC_SELLERS: Seller[] = [
  {
    id: "11111111-1111-4111-8111-111111111111",
    name: "Great Lakes Steel Service (Synthetic Demo)",
    business_type: "Steel Service Center",
    headquarters_city: "Gary",
    headquarters_state: "IN",
    rating: 4.90,
    is_synthetic_demo: true,
    contact_email: "orders@demo-greatlakes.internal"
  },
  {
    id: "22222222-2222-4222-8222-222222222222",
    name: "Gulf Coast Energy Metals (Synthetic Demo)",
    business_type: "Master Distributor",
    headquarters_city: "Houston",
    headquarters_state: "TX",
    rating: 4.85,
    is_synthetic_demo: true,
    contact_email: "sales@demo-gulfcoastmetals.internal"
  },
  {
    id: "33333333-3333-4333-8333-333333333333",
    name: "Allegheny Structural Plate (Synthetic Demo)",
    business_type: "Integrated Mill Processor",
    headquarters_city: "Pittsburgh",
    headquarters_state: "PA",
    rating: 4.95,
    is_synthetic_demo: true,
    contact_email: "support@demo-alleghenyplate.internal"
  },
  {
    id: "44444444-4444-4444-8444-444444444444",
    name: "Midwest Stainless & Alloy Co (Synthetic Demo)",
    business_type: "Specialty Distributor",
    headquarters_city: "Chicago",
    headquarters_state: "IL",
    rating: 4.80,
    is_synthetic_demo: true,
    contact_email: "inventory@demo-midwestalloy.internal"
  }
];

export const SYNTHETIC_CERTIFICATES: MaterialTestCertificate[] = [
  {
    id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
    heat_number: "H-784291",
    cert_number: "MTR-2026-GLS-0419",
    mill_name: "Burns Harbor Plate Works",
    mill_country: "USA",
    specification: "ASTM A572 Grade 50",
    en10204_type: "3.1",
    product_form: "Plate",
    dimensions: {
      thickness_in: 0.750,
      width_in: 96.0,
      length_in: 240.0,
      weight_lbs: 4896.0
    },
    chemical_analysis: {
      C: 0.18,
      Mn: 1.15,
      P: 0.015,
      S: 0.008,
      Si: 0.24,
      V: 0.035,
      Nb: 0.021,
      Cr: 0.04,
      Ni: 0.03,
      Mo: 0.01,
      Cu: 0.12,
      CEV: 0.385
    },
    mechanical_results: {
      yield_strength_ksi: 54.8,
      tensile_strength_ksi: 72.4,
      elongation_pct: 23.5
    },
    heat_treatment: "As-Rolled",
    extracted_by_model: "gemini-2.5",
    qc_status: "passed",
    qc_summary: {
      status: "PASS",
      standards_met: ["ASTM A572-50", "AASHTO M223"],
      cev_evaluation: "Under 0.43 max threshold (0.385 calculated)",
      weldability: "Standard AWS D1.1 preheat applies",
      flags: []
    },
    is_synthetic_demo: true
  },
  {
    id: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
    heat_number: "H-912044",
    cert_number: "MTR-2026-GC-8812",
    mill_name: "Baytown Heavy Plate Rolling",
    mill_country: "USA",
    specification: "ASTM A516 Grade 70 (Normalized)",
    en10204_type: "3.1",
    product_form: "Plate",
    dimensions: {
      thickness_in: 1.250,
      width_in: 120.0,
      length_in: 480.0,
      weight_lbs: 20400.0
    },
    chemical_analysis: {
      C: 0.22,
      Mn: 1.10,
      P: 0.012,
      S: 0.004,
      Si: 0.28,
      Cr: 0.05,
      Ni: 0.08,
      Mo: 0.02,
      Cu: 0.09,
      CEV: 0.418
    },
    mechanical_results: {
      yield_strength_ksi: 46.2,
      tensile_strength_ksi: 78.9,
      elongation_pct: 27.0,
      charpy_impact_f: -50.0,
      charpy_avg_ft_lbs: 38.0
    },
    heat_treatment: "Normalized @ 1650°F",
    extracted_by_model: "gemini-2.5",
    qc_status: "passed",
    qc_summary: {
      status: "PASS",
      standards_met: ["ASTM A516-70", "ASME SA-516-70"],
      cev_evaluation: "0.418 within PVQ limits",
      impact_testing: "Exceeds 20 ft-lbs @ -50°F requirement (38 ft-lbs avg)",
      flags: []
    },
    is_synthetic_demo: true
  },
  {
    id: "cccccccc-cccc-4ccc-8ccc-cccccccccccc",
    heat_number: "H-643810",
    cert_number: "MTR-2026-AP-1033",
    mill_name: "Coatesville Heavy Plate Mill",
    mill_country: "USA",
    specification: "ASTM A514 Grade B",
    en10204_type: "3.1",
    product_form: "Plate",
    dimensions: {
      thickness_in: 0.500,
      width_in: 96.0,
      length_in: 288.0,
      weight_lbs: 3916.8
    },
    chemical_analysis: {
      C: 0.17,
      Mn: 0.88,
      P: 0.014,
      S: 0.003,
      Si: 0.27,
      Cr: 0.52,
      Mo: 0.21,
      B: 0.0022,
      CEV: 0.495
    },
    mechanical_results: {
      yield_strength_ksi: 108.5,
      tensile_strength_ksi: 118.2,
      elongation_pct: 19.0,
      hardness_hbw: 269
    },
    heat_treatment: "Quenched @ 1650°F, Tempered @ 1150°F",
    extracted_by_model: "gemini-2.5",
    qc_status: "passed",
    qc_summary: {
      status: "PASS",
      standards_met: ["ASTM A514 Grade B"],
      yield_test: "108.5 ksi exceeds 100 ksi minimum",
      flags: []
    },
    is_synthetic_demo: true
  },
  {
    id: "dddddddd-dddd-4ddd-8ddd-dddddddddddd",
    heat_number: "H-339211",
    cert_number: "MTR-2026-MW-7741",
    mill_name: "Sandusky Precision Stainless",
    mill_country: "USA",
    specification: "AISI 316L / ASTM A240",
    en10204_type: "3.1",
    product_form: "Plate",
    dimensions: {
      thickness_in: 0.375,
      width_in: 72.0,
      length_in: 144.0,
      weight_lbs: 1101.6
    },
    chemical_analysis: {
      C: 0.021,
      Mn: 1.45,
      P: 0.028,
      S: 0.002,
      Si: 0.45,
      Cr: 16.85,
      Ni: 11.20,
      Mo: 2.18,
      N: 0.042
    },
    mechanical_results: {
      yield_strength_ksi: 39.5,
      tensile_strength_ksi: 84.1,
      elongation_pct: 52.0,
      hardness_hbw: 168
    },
    heat_treatment: "Solution Annealed @ 1950°F, Water Quenched",
    extracted_by_model: "gemini-2.5",
    qc_status: "passed",
    qc_summary: {
      status: "PASS",
      standards_met: ["AISI 316L", "ASTM A240", "NACE MR0175 / ISO 15156"],
      flags: []
    },
    is_synthetic_demo: true
  },
  {
    id: "eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee",
    heat_number: "H-552199",
    cert_number: "MTR-2026-GLS-9011",
    mill_name: "Midwest Structural Rolling Mill",
    mill_country: "USA",
    specification: "ASTM A36",
    en10204_type: "3.1",
    product_form: "Hot Rolled Coil",
    dimensions: {
      thickness_in: 0.250,
      width_in: 60.0,
      length_in: 0.0,
      weight_lbs: 38500.0
    },
    chemical_analysis: {
      C: 0.21,
      Mn: 0.95,
      P: 0.018,
      S: 0.012,
      Si: 0.22,
      Cu: 0.22,
      CEV: 0.380
    },
    mechanical_results: {
      yield_strength_ksi: 41.2,
      tensile_strength_ksi: 66.4,
      elongation_pct: 26.0
    },
    heat_treatment: "As-Rolled Master Coil",
    extracted_by_model: "gemini-2.5",
    qc_status: "passed",
    qc_summary: {
      status: "PASS",
      standards_met: ["ASTM A36"],
      flags: []
    },
    is_synthetic_demo: true
  }
];

export const SYNTHETIC_LISTINGS: InventoryListing[] = [
  {
    id: "10101010-1010-4010-8010-101010101010",
    seller_id: "11111111-1111-4111-8111-111111111111",
    seller: SYNTHETIC_SELLERS[0],
    certificate_id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
    certificate: SYNTHETIC_CERTIFICATES[0],
    grade_id: "astm-a572-50",
    grade: GRADE_STANDARDS_REGISTRY["astm-a572-50"],
    title: '0.750" A572 Gr 50 Heavy Structural Plate (Heat H-784291)',
    product_form: "Plate",
    dimensions_display: '0.750" x 96" x 240"',
    thickness_in: 0.750,
    width_in: 96.0,
    length_in: 240.0,
    pieces_available: 8,
    total_weight_lbs: 39168.0,
    price_per_cwt: 49.50,
    warehouse_city: "Gary",
    warehouse_state: "IN",
    warehouse_lat: 41.5934,
    warehouse_lng: -87.3464,
    min_order_quantity_lbs: 4896.0,
    status: "active",
    is_synthetic_demo: true
  },
  {
    id: "20202020-2020-4020-8020-202020202020",
    seller_id: "22222222-2222-4222-8222-222222222222",
    seller: SYNTHETIC_SELLERS[1],
    certificate_id: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
    certificate: SYNTHETIC_CERTIFICATES[1],
    grade_id: "astm-a516-70",
    grade: GRADE_STANDARDS_REGISTRY["astm-a516-70"],
    title: '1.250" A516 Gr 70 PVQ Normalized Vessel Plate (Charpy -50°F Tested)',
    product_form: "Plate",
    dimensions_display: '1.250" x 120" x 480"',
    thickness_in: 1.250,
    width_in: 120.0,
    length_in: 480.0,
    pieces_available: 3,
    total_weight_lbs: 61200.0,
    price_per_cwt: 64.00,
    warehouse_city: "Houston",
    warehouse_state: "TX",
    warehouse_lat: 29.7604,
    warehouse_lng: -95.3698,
    min_order_quantity_lbs: 20400.0,
    status: "active",
    is_synthetic_demo: true
  },
  {
    id: "30303030-3030-4030-8030-303030303030",
    seller_id: "33333333-3333-4333-8333-333333333333",
    seller: SYNTHETIC_SELLERS[2],
    certificate_id: "cccccccc-cccc-4ccc-8ccc-cccccccccccc",
    certificate: SYNTHETIC_CERTIFICATES[2],
    grade_id: "astm-a514",
    grade: GRADE_STANDARDS_REGISTRY["astm-a514"],
    title: '0.500" A514 T-1 High Yield 100ksi Quenched & Tempered Plate',
    product_form: "Plate",
    dimensions_display: '0.500" x 96" x 288"',
    thickness_in: 0.500,
    width_in: 96.0,
    length_in: 288.0,
    pieces_available: 10,
    total_weight_lbs: 39168.0,
    price_per_cwt: 88.00,
    warehouse_city: "Pittsburgh",
    warehouse_state: "PA",
    warehouse_lat: 40.4406,
    warehouse_lng: -79.9959,
    min_order_quantity_lbs: 7833.6,
    status: "active",
    is_synthetic_demo: true
  },
  {
    id: "40404040-4040-4040-8040-404040404040",
    seller_id: "44444444-4444-4444-8444-444444444444",
    seller: SYNTHETIC_SELLERS[3],
    certificate_id: "dddddddd-dddd-4ddd-8ddd-dddddddddddd",
    certificate: SYNTHETIC_CERTIFICATES[3],
    grade_id: "aisi-316l",
    grade: GRADE_STANDARDS_REGISTRY["aisi-316l"],
    title: '0.375" 316L Marine Grade Stainless Mill Plate (NACE Compliant)',
    product_form: "Plate",
    dimensions_display: '0.375" x 72" x 144"',
    thickness_in: 0.375,
    width_in: 72.0,
    length_in: 144.0,
    pieces_available: 14,
    total_weight_lbs: 15422.4,
    price_per_cwt: 265.00,
    warehouse_city: "Chicago",
    warehouse_state: "IL",
    warehouse_lat: 41.8781,
    warehouse_lng: -87.6298,
    min_order_quantity_lbs: 2203.2,
    status: "active",
    is_synthetic_demo: true
  },
  {
    id: "50505050-5050-4050-8050-505050505050",
    seller_id: "11111111-1111-4111-8111-111111111111",
    seller: SYNTHETIC_SELLERS[0],
    certificate_id: "eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee",
    certificate: SYNTHETIC_CERTIFICATES[4],
    grade_id: "astm-a36",
    grade: GRADE_STANDARDS_REGISTRY["astm-a36"],
    title: '0.250" A36 Hot Rolled Master Steel Coil (Slit-to-Width Available)',
    product_form: "Hot Rolled Coil",
    dimensions_display: '0.250" x 60" Master Coil',
    thickness_in: 0.250,
    width_in: 60.0,
    length_in: 0.0,
    pieces_available: 1,
    total_weight_lbs: 38500.0,
    price_per_cwt: 42.00,
    warehouse_city: "Gary",
    warehouse_state: "IN",
    warehouse_lat: 41.5934,
    warehouse_lng: -87.3464,
    min_order_quantity_lbs: 38500.0,
    status: "active",
    is_synthetic_demo: true
  }
];
