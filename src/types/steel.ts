// =====================================================================
// MillProof: Domain Type Definitions (TypeScript Strict Mode)
// =====================================================================

export interface ChemicalLimits {
  min?: number;
  max?: number;
}

export interface ChemistrySpec {
  [element: string]: ChemicalLimits;
}

export interface MechanicalSpec {
  yield_min_ksi?: number;
  yield_max_ksi?: number;
  tensile_min_ksi?: number;
  tensile_max_ksi?: number;
  elongation_min_pct?: number;
  hardness_max_hbw?: number;
  charpy_temp_f?: number;
  charpy_min_ft_lbs?: number;
}

export interface GradeStandard {
  id: string; // e.g., 'astm-a572-50'
  standard_org: string; // 'ASTM' | 'AISI' | 'EN'
  grade_name: string; // 'A572 Grade 50'
  category: string;
  description: string;
  typical_applications: string[];
  weldability_rating: string;
  max_cev?: number; // Carbon Equivalent upper bound
  chem_limits: ChemistrySpec;
  mech_limits: MechanicalSpec;
}

export interface Seller {
  id: string;
  name: string;
  business_type: string;
  headquarters_city: string;
  headquarters_state: string;
  rating: number;
  is_synthetic_demo: boolean;
  contact_email?: string;
}

export interface ChemicalAnalysis {
  C?: number;
  Mn?: number;
  P?: number;
  S?: number;
  Si?: number;
  Cr?: number;
  Ni?: number;
  Mo?: number;
  Cu?: number;
  V?: number;
  Nb?: number;
  Nb_Cb?: number;
  Ti?: number;
  Al?: number;
  B?: number;
  N?: number;
  CEV?: number;
  [key: string]: number | undefined;
}

export interface MechanicalResults {
  yield_strength_ksi: number;
  tensile_strength_ksi: number;
  elongation_pct: number;
  reduction_of_area_pct?: number;
  hardness_hbw?: number;
  charpy_impact_f?: number;
  charpy_avg_ft_lbs?: number;
}

export interface ElementComplianceCheck {
  element: string;
  actual: number;
  min?: number;
  max?: number;
  status: 'PASS' | 'FAIL' | 'MARGINAL';
  note?: string;
}

export interface MechanicalComplianceCheck {
  property: string;
  actual: number;
  min?: number;
  max?: number;
  unit: string;
  status: 'PASS' | 'FAIL';
  note?: string;
}

export interface MTRQCSummary {
  status: 'PASS' | 'FAIL' | 'REVIEW_REQUIRED';
  standards_met: string[];
  cev_evaluation?: string;
  weldability?: string;
  chemistry_checks?: ElementComplianceCheck[];
  mechanical_checks?: MechanicalComplianceCheck[];
  flags: string[];
  [key: string]: unknown;
}

export interface MaterialTestCertificate {
  id: string;
  heat_number: string;
  cert_number: string;
  mill_name: string;
  mill_country: string;
  specification: string;
  en10204_type: '2.1' | '2.2' | '3.1' | '3.2';
  product_form: string;
  dimensions: {
    thickness_in: number;
    width_in: number;
    length_in: number;
    weight_lbs: number;
  };
  chemical_analysis: ChemicalAnalysis;
  mechanical_results: MechanicalResults;
  heat_treatment: string;
  storage_path?: string;
  extracted_by_model: string;
  qc_status: 'passed' | 'flagged' | 'review_required';
  qc_summary: MTRQCSummary;
  is_synthetic_demo: boolean;
  created_at?: string;
}

export interface InventoryListing {
  id: string;
  seller_id: string;
  seller?: Seller;
  certificate_id?: string;
  certificate?: MaterialTestCertificate;
  grade_id: string;
  grade?: GradeStandard;
  title: string;
  product_form: 'Plate' | 'Hot Rolled Coil' | 'Wide Flange Beam' | 'Round Bar' | 'Structural Tubing';
  dimensions_display: string;
  thickness_in: number;
  width_in: number;
  length_in: number;
  pieces_available: number;
  total_weight_lbs: number;
  price_per_cwt: number; // USD per 100 lbs
  warehouse_city: string;
  warehouse_state: string;
  warehouse_lat: number;
  warehouse_lng: number;
  min_order_quantity_lbs: number;
  status: 'draft' | 'active' | 'reserved' | 'sold';
  is_synthetic_demo: boolean;
  created_at?: string;
}

export interface DeliveredCostBreakdown {
  listingId: string;
  destinationZip: string;
  distanceMiles: number;
  weightLbs: number;
  totalTons: number;
  baseMaterialCost: number;
  truckloadsRequired: number;
  baseFreightRate: number;
  fuelSurcharge: number;
  totalFreightCost: number;
  totalDeliveredCost: number;
  deliveredCostPerCwt: number;
  assumptions: string[];
}

export interface BuyerRequirementInput {
  applicationDescription: string;
  environmentType?: 'Indoor structural' | 'Outdoor bridge' | 'Offshore/Marine' | 'Cryogenic' | 'High-temperature' | 'Pressure vessel';
  targetYieldStrengthKsi?: number;
  thicknessInches?: number;
  preferredProductForm?: string;
  destinationZip?: string;
}

export interface TranslatedRequirement {
  suggestedGrades: Array<{
    gradeId: string;
    gradeName: string;
    matchReason: string;
    suitabilityScore: number; // 0 - 100
    considerations: string[];
  }>;
  keyMechanicalCriteria: {
    minYieldKsi: number;
    minTensileKsi: number;
    charpyImpactRequired: boolean;
    charpyTempF?: number;
  };
  keyChemicalCriteria: {
    maxCev: number;
    weldabilityRequirement: string;
  };
  recommendedProductForms: string[];
  assumptionsMade: string[];
}
