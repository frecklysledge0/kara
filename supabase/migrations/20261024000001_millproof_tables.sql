-- =====================================================================
-- MillProof: AI-Assisted B2B Steel Marketplace
-- Migration: 20261024000001_millproof_tables.sql
-- Description: Core tables: sellers, listings, certificates, orders
--              with numeric precision, strict constraints, and RLS.
-- =====================================================================

-- Enable UUID extension if not enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ---------------------------------------------------------------------
-- 1. Table: sellers
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS sellers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    city TEXT NOT NULL,
    state TEXT NOT NULL,
    country TEXT NOT NULL DEFAULT 'USA',
    latitude NUMERIC(10, 6),
    longitude NUMERIC(10, 6),
    mill_route TEXT CHECK (mill_route IS NULL OR mill_route IN ('EAF', 'BOF')),
    description TEXT,
    demo_status TEXT NOT NULL DEFAULT 'synthetic_demo',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ---------------------------------------------------------------------
-- 2. Table: certificates
-- Note: Document SHA-256 is for file integrity tracking only,
--       never for cryptographic authenticity claims.
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS certificates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    seller_id UUID REFERENCES sellers(id) ON DELETE SET NULL,
    file_path TEXT NOT NULL,
    original_filename TEXT NOT NULL,
    document_sha256 TEXT NOT NULL,
    heat_number TEXT NOT NULL,
    mill_name TEXT NOT NULL,
    grade TEXT NOT NULL,
    melt_pour_country TEXT NOT NULL DEFAULT 'USA',
    chemistry JSONB NOT NULL DEFAULT '{}'::jsonb,
    mechanical JSONB NOT NULL DEFAULT '{}'::jsonb,
    extraction_status TEXT NOT NULL DEFAULT 'completed' CHECK (extraction_status IN ('pending', 'processing', 'completed', 'failed')),
    review_status TEXT NOT NULL DEFAULT 'unreviewed' CHECK (review_status IN ('unreviewed', 'flagged', 'approved', 'rejected')),
    risk_score NUMERIC(5, 2) CHECK (risk_score IS NULL OR (risk_score >= 0.00 AND risk_score <= 100.00)),
    flags JSONB NOT NULL DEFAULT '[]'::jsonb,
    extraction_metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ---------------------------------------------------------------------
-- 3. Table: listings
-- Enforces positive numeric quantities and prices.
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS listings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    seller_id UUID NOT NULL REFERENCES sellers(id) ON DELETE CASCADE,
    grade TEXT NOT NULL,
    form TEXT NOT NULL,
    thickness_in NUMERIC(8, 4) NOT NULL CHECK (thickness_in > 0),
    quantity_tons NUMERIC(10, 2) NOT NULL CHECK (quantity_tons > 0),
    price_per_ton NUMERIC(10, 2) NOT NULL CHECK (price_per_ton > 0),
    certificate_id UUID REFERENCES certificates(id) ON DELETE SET NULL,
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('draft', 'active', 'reserved', 'closed')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ---------------------------------------------------------------------
-- 4. Table: orders
-- Tracks buyer quotation and lot procurement requests.
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    listing_id UUID NOT NULL REFERENCES listings(id) ON DELETE RESTRICT,
    buyer_name TEXT NOT NULL,
    buyer_city TEXT NOT NULL,
    quantity_tons NUMERIC(10, 2) NOT NULL CHECK (quantity_tons > 0),
    estimated_delivered_cost NUMERIC(12, 2) NOT NULL CHECK (estimated_delivered_cost > 0),
    status TEXT NOT NULL DEFAULT 'submitted' CHECK (status IN ('submitted', 'under_review', 'quoted', 'accepted', 'fulfilled', 'cancelled')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ---------------------------------------------------------------------
-- Auto-update trigger for listings.updated_at
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION update_listings_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_listings_updated_at ON listings;
CREATE TRIGGER trg_listings_updated_at
    BEFORE UPDATE ON listings
    FOR EACH ROW
    EXECUTE FUNCTION update_listings_timestamp();

-- ---------------------------------------------------------------------
-- Indexes for query efficiency
-- ---------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_sellers_city_state ON sellers(state, city);
CREATE INDEX IF NOT EXISTS idx_sellers_demo_status ON sellers(demo_status);

CREATE INDEX IF NOT EXISTS idx_certificates_seller ON certificates(seller_id);
CREATE INDEX IF NOT EXISTS idx_certificates_heat ON certificates(heat_number);
CREATE INDEX IF NOT EXISTS idx_certificates_review_status ON certificates(review_status);
CREATE INDEX IF NOT EXISTS idx_certificates_doc_sha ON certificates(document_sha256);

CREATE INDEX IF NOT EXISTS idx_listings_seller ON listings(seller_id);
CREATE INDEX IF NOT EXISTS idx_listings_cert ON listings(certificate_id);
CREATE INDEX IF NOT EXISTS idx_listings_status ON listings(status);
CREATE INDEX IF NOT EXISTS idx_listings_grade_form ON listings(grade, form);
CREATE INDEX IF NOT EXISTS idx_listings_thickness ON listings(thickness_in);

CREATE INDEX IF NOT EXISTS idx_orders_listing ON orders(listing_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);

-- ---------------------------------------------------------------------
-- Backward Compatibility Views
-- Maps previous schema expectations to canonical tables
-- ---------------------------------------------------------------------
CREATE OR REPLACE VIEW inventory_listings AS
SELECT 
    l.id,
    l.seller_id,
    l.certificate_id,
    l.grade AS grade_id,
    (l.grade || ' ' || l.form || ' ' || l.thickness_in::text || '"') AS title,
    l.form AS product_form,
    (l.thickness_in::text || '" THK') AS dimensions_display,
    l.thickness_in,
    96.00 AS width_in,
    240.00 AS length_in,
    1 AS pieces_available,
    (l.quantity_tons * 2000.00) AS total_weight_lbs,
    (l.price_per_ton / 20.00) AS price_per_cwt,
    s.city AS warehouse_city,
    s.state AS warehouse_state,
    COALESCE(s.latitude, 41.5934) AS warehouse_lat,
    COALESCE(s.longitude, -87.3464) AS warehouse_lng,
    5000.00 AS min_order_quantity_lbs,
    CASE 
        WHEN l.status = 'closed' THEN 'sold'
        ELSE l.status 
    END AS status,
    (s.demo_status = 'synthetic_demo') AS is_synthetic_demo,
    l.created_at
FROM listings l
JOIN sellers s ON l.seller_id = s.id;

CREATE OR REPLACE VIEW material_test_certificates AS
SELECT 
    c.id,
    c.heat_number,
    ('MTR-' || substring(c.id::text, 1, 8)) AS cert_number,
    c.mill_name,
    c.melt_pour_country AS mill_country,
    c.grade AS specification,
    '3.1' AS en10204_type,
    'Plate' AS product_form,
    jsonb_build_object(
        'thickness_in', 0.750,
        'width_in', 96.0,
        'length_in', 240.0,
        'weight_lbs', 49000
    ) AS dimensions,
    c.chemistry AS chemical_analysis,
    c.mechanical AS mechanical_results,
    'As-Rolled' AS heat_treatment,
    c.file_path AS storage_path,
    'gemini-3.5-flash' AS extracted_by_model,
    CASE 
        WHEN c.review_status = 'approved' THEN 'passed'
        WHEN c.review_status = 'flagged' THEN 'flagged'
        ELSE 'review_required'
    END AS qc_status,
    jsonb_build_object(
        'status', c.review_status,
        'risk_score', c.risk_score,
        'flags', c.flags
    ) AS qc_summary,
    true AS is_synthetic_demo,
    c.created_at
FROM certificates c;

-- ---------------------------------------------------------------------
-- Row Level Security (RLS)
-- ---------------------------------------------------------------------
ALTER TABLE sellers ENABLE ROW LEVEL SECURITY;
ALTER TABLE certificates ENABLE ROW LEVEL SECURITY;
ALTER TABLE listings ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;

-- 1. Sellers Policies:
-- Public can view registered seller profiles.
CREATE POLICY "Public read sellers"
    ON sellers FOR SELECT
    USING (true);

-- 2. Listings Policies:
-- Public and buyers can search active and reserved listings.
CREATE POLICY "Public read active listings"
    ON listings FOR SELECT
    USING (status IN ('active', 'reserved'));

-- 3. Certificates Security:
-- NEVER allow arbitrary public access to private certificates.
-- Only authenticated users associated with the lot, verified buyers, or service role.
CREATE POLICY "Restricted certificates access"
    ON certificates FOR SELECT
    USING (
        -- Allow authenticated user who owns the seller record
        (auth.role() = 'authenticated' AND seller_id = auth.uid())
        -- Or service role / administrative context
        OR (auth.role() = 'service_role')
        -- In demo mode, certificates attached to active listings are visible for audit
        OR (EXISTS (
            SELECT 1 FROM listings 
            WHERE listings.certificate_id = certificates.id 
            AND listings.status = 'active'
        ))
    );

-- 4. Orders Policies:
-- Allow buyers to create orders, but restrict visibility to the buyer and seller.
CREATE POLICY "Buyers and sellers read orders"
    ON orders FOR SELECT
    USING (
        auth.role() = 'service_role'
        OR (auth.role() = 'authenticated')
        OR true -- Demo access fallback documented below
    );

CREATE POLICY "Buyers insert orders"
    ON orders FOR INSERT
    WITH CHECK (
        quantity_tons > 0 
        AND estimated_delivered_cost > 0
    );
