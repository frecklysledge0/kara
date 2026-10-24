-- =====================================================================
-- MillProof: AI-Assisted B2B Steel Marketplace
-- Migration: 20261024000000_init_millproof.sql
-- Description: Base extension and standard steel grade reference library.
-- =====================================================================

-- Enable UUID extension if not enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

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

-- Enable Row Level Security (RLS)
ALTER TABLE grade_standards ENABLE ROW LEVEL SECURITY;

-- Public read access for standard reference library
DROP POLICY IF EXISTS "Public read grade standards" ON grade_standards;
CREATE POLICY "Public read grade standards" ON grade_standards FOR SELECT USING (true);
