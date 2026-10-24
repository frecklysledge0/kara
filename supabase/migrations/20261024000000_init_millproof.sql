-- =====================================================================
-- MillProof: AI-Assisted B2B Steel Marketplace
-- Migration: 20261024000000_init_millproof.sql
-- Description: Core schema for standards, sellers, MTR certificates,
--              inventory listings, delivered logistics, and RFQs.
-- =====================================================================

-- 1. Standard Steel Grade Reference Library
CREATE TABLE IF NOT EXISTS grade_standards (
    id TEXT PRIMARY KEY, -- e.g. 'astm-a36', 'astm-a572-50'
    standard_org TEXT NOT NULL, -- e.g. 'ASTM', 'EN', 'AISI'
    grade_name TEXT NOT NULL, -- e.g. 'A572 Grade 50'
    category TEXT NOT NULL, -- 'Carbon Structural', 'HSLA', 'Pressure Vessel', 'Stainless', 'Alloy'
    description TEXT NOT NULL,
    typical_applications TEXT[] NOT NULL DEFAULT '{}',
    weldability_rating TEXT NOT NULL, -- 'Excellent', 'Good with preheat', 'Requires strict WPS'
    max_cev NUMERIC(4,2), -- Carbon Equivalent upper threshold
    chem_limits JSONB NOT NULL DEFAULT '{}', -- min/max limits for C, Mn, P, S, Si, Cr, Ni, Mo, Cu, V, etc.
    mech_limits JSONB NOT NULL DEFAULT '{}', -- min/max for yield, tensile, elongation, hardness, impact
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- 2. Certified Sellers / Steel Service Centers
CREATE TABLE IF NOT EXISTS sellers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    business_type TEXT NOT NULL, -- 'Integrated Mill', 'Mini-Mill', 'Steel Service Center', 'Master Distributor'
    headquarters_city TEXT NOT NULL,
    headquarters_state TEXT NOT NULL,
    rating NUMERIC(3,2) DEFAULT 4.80,
    is_synthetic_demo BOOLEAN DEFAULT TRUE NOT NULL,
    contact_email TEXT,
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- 3. Material Test Certificates (MTR / MTC EN 10204 3.1)
CREATE TABLE IF NOT EXISTS material_test_certificates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    heat_number TEXT NOT NULL,
    cert_number TEXT NOT NULL,
    mill_name TEXT NOT NULL,
    mill_country TEXT NOT NULL DEFAULT 'USA',
    specification TEXT NOT NULL, -- e.g. 'ASTM A572-50'
    en10204_type TEXT DEFAULT '3.1' NOT NULL,
    product_form TEXT NOT NULL, -- 'Plate', 'Hot Rolled Coil', 'Wide Flange Beam', 'Round Bar'
    dimensions JSONB NOT NULL, -- thickness_in, width_in, length_in, weight_lbs
    chemical_analysis JSONB NOT NULL, -- actual heat analysis: C, Mn, P, S, Si, etc.
    mechanical_results JSONB NOT NULL, -- actual tests: yield_psi, tensile_psi, elongation_pct
    heat_treatment TEXT DEFAULT 'As-Rolled' NOT NULL,
    storage_path TEXT, -- private Supabase Storage object path
    extracted_by_model TEXT DEFAULT 'gemini-2.5',
    qc_status TEXT DEFAULT 'passed' NOT NULL CHECK (qc_status IN ('passed', 'flagged', 'review_required')),
    qc_summary JSONB NOT NULL DEFAULT '{}',
    is_synthetic_demo BOOLEAN DEFAULT TRUE NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- 4. Steel Inventory Listings
CREATE TABLE IF NOT EXISTS inventory_listings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    seller_id UUID REFERENCES sellers(id) ON DELETE CASCADE,
    certificate_id UUID REFERENCES material_test_certificates(id) ON DELETE SET NULL,
    grade_id TEXT REFERENCES grade_standards(id) ON DELETE RESTRICT,
    title TEXT NOT NULL,
    product_form TEXT NOT NULL, -- 'Plate', 'Hot Rolled Coil', 'Wide Flange Beam', 'Round Bar', 'Structural Tubing'
    dimensions_display TEXT NOT NULL,
    thickness_in NUMERIC(7,4) NOT NULL,
    width_in NUMERIC(7,2) NOT NULL,
    length_in NUMERIC(7,2) NOT NULL,
    pieces_available INTEGER NOT NULL DEFAULT 1 CHECK (pieces_available >= 0),
    total_weight_lbs NUMERIC(10,2) NOT NULL CHECK (total_weight_lbs > 0),
    price_per_cwt NUMERIC(8,2) NOT NULL CHECK (price_per_cwt > 0), -- USD per 100 lbs
    warehouse_city TEXT NOT NULL,
    warehouse_state TEXT NOT NULL,
    warehouse_lat NUMERIC(8,4) NOT NULL,
    warehouse_lng NUMERIC(8,4) NOT NULL,
    min_order_quantity_lbs NUMERIC(10,2) DEFAULT 5000 NOT NULL,
    status TEXT DEFAULT 'active' NOT NULL CHECK (status IN ('draft', 'active', 'reserved', 'sold')),
    is_synthetic_demo BOOLEAN DEFAULT TRUE NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- 5. RFQs (Requests for Quotation) & Delivered Landed Cost Estimates
CREATE TABLE IF NOT EXISTS rfqs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    buyer_name TEXT NOT NULL,
    buyer_company TEXT NOT NULL,
    target_grade TEXT NOT NULL,
    product_form TEXT NOT NULL,
    thickness_in NUMERIC(7,4),
    destination_zip TEXT NOT NULL,
    destination_city TEXT NOT NULL,
    destination_state TEXT NOT NULL,
    destination_lat NUMERIC(8,4) NOT NULL,
    destination_lng NUMERIC(8,4) NOT NULL,
    quantity_lbs NUMERIC(10,2) NOT NULL CHECK (quantity_lbs > 0),
    selected_listing_id UUID REFERENCES inventory_listings(id) ON DELETE SET NULL,
    calculated_freight NUMERIC(10,2),
    calculated_total_cost NUMERIC(10,2),
    status TEXT DEFAULT 'submitted' NOT NULL CHECK (status IN ('submitted', 'under_review', 'quoted', 'accepted', 'closed')),
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Create Indexes for fast querying
CREATE INDEX IF NOT EXISTS idx_inventory_grade ON inventory_listings(grade_id);
CREATE INDEX IF NOT EXISTS idx_inventory_status ON inventory_listings(status);
CREATE INDEX IF NOT EXISTS idx_inventory_dimensions ON inventory_listings(thickness_in, product_form);
CREATE INDEX IF NOT EXISTS idx_mtr_heat ON material_test_certificates(heat_number);
CREATE INDEX IF NOT EXISTS idx_mtr_qc ON material_test_certificates(qc_status);

-- Enable Row Level Security (RLS) for all tables
ALTER TABLE grade_standards ENABLE ROW LEVEL SECURITY;
ALTER TABLE sellers ENABLE ROW LEVEL SECURITY;
ALTER TABLE material_test_certificates ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory_listings ENABLE ROW LEVEL SECURITY;
ALTER TABLE rfqs ENABLE ROW LEVEL SECURITY;

-- Public read access for standard reference library & active listings
CREATE POLICY "Public read grade standards" ON grade_standards FOR SELECT USING (true);
CREATE POLICY "Public read sellers" ON sellers FOR SELECT USING (true);
CREATE POLICY "Public read active listings" ON inventory_listings FOR SELECT USING (status = 'active');
CREATE POLICY "Public read certs for active listings" ON material_test_certificates FOR SELECT USING (true);
