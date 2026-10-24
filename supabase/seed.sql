-- =====================================================================
-- MillProof: AI-Assisted B2B Steel Marketplace
-- Seed Data: supabase/seed.sql
-- Note: All seller entities, listings, and certificates are realistic
--       SYNTHETIC DEMO BENCHMARKS. Never treat as real financial quotes.
-- =====================================================================

-- 1. Standards Library
INSERT INTO grade_standards (id, standard_org, grade_name, category, description, typical_applications, weldability_rating, max_cev, chem_limits, mech_limits)
VALUES
(
    'astm-a36',
    'ASTM',
    'A36 Structural Carbon',
    'Carbon Structural',
    'Standard structural steel for bolted, riveted, or welded construction of bridges and buildings, and for general structural purposes.',
    ARRAY['Bridge girders', 'Commercial buildings', 'Base plates', 'General fabrication'],
    'Excellent',
    0.40,
    '{
        "C": {"max": 0.25},
        "Mn": {"min": 0.80, "max": 1.20},
        "P": {"max": 0.040},
        "S": {"max": 0.050},
        "Si": {"max": 0.40},
        "Cu": {"min": 0.20}
    }'::jsonb,
    '{
        "yield_min_ksi": 36.0,
        "tensile_min_ksi": 58.0,
        "tensile_max_ksi": 80.0,
        "elongation_min_pct": 20.0
    }'::jsonb
),
(
    'astm-a572-50',
    'ASTM',
    'A572 Grade 50 (HSLA)',
    'High-Strength Low-Alloy',
    'High-strength low-alloy columbium-vanadium structural steel offering high strength-to-weight ratio with superior weldability.',
    ARRAY['Highway bridges', 'Heavy construction equipment', 'Transmission towers', 'Crane booms'],
    'Good with standard preheat',
    0.43,
    '{
        "C": {"max": 0.23},
        "Mn": {"max": 1.35},
        "P": {"max": 0.040},
        "S": {"max": 0.050},
        "Si": {"max": 0.40},
        "V": {"min": 0.01, "max": 0.15},
        "Nb_Cb": {"min": 0.005, "max": 0.05}
    }'::jsonb,
    '{
        "yield_min_ksi": 50.0,
        "tensile_min_ksi": 65.0,
        "elongation_min_pct": 18.0
    }'::jsonb
),
(
    'astm-a514',
    'ASTM',
    'A514 (T-1) Quenched & Tempered',
    'Quenched & Tempered Alloy',
    'High-yield strength, quenched and tempered alloy steel plate intended primarily for welded bridges and other structures requiring 100 ksi yield.',
    ARRAY['Heavy mining dump bodies', 'Offshore crane jibs', 'Excavator buckets', 'Chutes'],
    'Requires strict WPS & hydrogen control',
    0.58,
    '{
        "C": {"min": 0.12, "max": 0.21},
        "Mn": {"min": 0.70, "max": 1.00},
        "P": {"max": 0.035},
        "S": {"max": 0.035},
        "Si": {"min": 0.20, "max": 0.35},
        "Cr": {"min": 0.40, "max": 0.65},
        "Mo": {"min": 0.15, "max": 0.25},
        "B": {"min": 0.001, "max": 0.005}
    }'::jsonb,
    '{
        "yield_min_ksi": 100.0,
        "tensile_min_ksi": 110.0,
        "tensile_max_ksi": 130.0,
        "elongation_min_pct": 16.0,
        "hardness_max_hbw": 293
    }'::jsonb
),
(
    'astm-a516-70',
    'ASTM',
    'A516 Grade 70 (PVQ)',
    'Pressure Vessel Quality',
    'Carbon steel plate intended primarily for service in welded pressure vessels where improved notch toughness is essential for moderate and lower temperature service.',
    ARRAY['Industrial boilers', 'Petrochemical pressure vessels', 'Gas storage spheres', 'Heat exchangers'],
    'Good with ASME Section IX procedures',
    0.44,
    '{
        "C": {"max": 0.28},
        "Mn": {"min": 0.85, "max": 1.20},
        "P": {"max": 0.025},
        "S": {"max": 0.025},
        "Si": {"min": 0.15, "max": 0.40}
    }'::jsonb,
    '{
        "yield_min_ksi": 38.0,
        "tensile_min_ksi": 70.0,
        "tensile_max_ksi": 90.0,
        "elongation_min_pct": 21.0,
        "charpy_temp_f": -50.0,
        "charpy_min_ft_lbs": 20.0
    }'::jsonb
),
(
    'aisi-304l',
    'AISI',
    '304L Austenitic Stainless',
    'Stainless Steel',
    'Extra-low carbon version of 304 stainless steel providing immunity to carbide precipitation during welding with excellent corrosion resistance.',
    ARRAY['Food and beverage processing', 'Chemical storage tanks', 'Architectural facades', 'Cryogenic vessels'],
    'Excellent (austenitic filler required)',
    NULL,
    '{
        "C": {"max": 0.030},
        "Mn": {"max": 2.00},
        "P": {"max": 0.045},
        "S": {"max": 0.030},
        "Si": {"max": 0.75},
        "Cr": {"min": 18.00, "max": 20.00},
        "Ni": {"min": 8.00, "max": 12.00},
        "N": {"max": 0.10}
    }'::jsonb,
    '{
        "yield_min_ksi": 25.0,
        "tensile_min_ksi": 70.0,
        "elongation_min_pct": 40.0,
        "hardness_max_hbw": 201
    }'::jsonb
),
(
    'aisi-316l',
    'AISI',
    '316L Marine Grade Stainless',
    'Stainless Steel',
    'Molybdenum-bearing austenitic stainless steel offering superior resistance to pitting and crevice corrosion in chloride and marine environments.',
    ARRAY['Marine fittings', 'Pharmaceutical equipment', 'Offshore piping', 'Chemical processing'],
    'Excellent',
    NULL,
    '{
        "C": {"max": 0.030},
        "Mn": {"max": 2.00},
        "P": {"max": 0.045},
        "S": {"max": 0.030},
        "Si": {"max": 0.75},
        "Cr": {"min": 16.00, "max": 18.00},
        "Ni": {"min": 10.00, "max": 14.00},
        "Mo": {"min": 2.00, "max": 3.00},
        "N": {"max": 0.10}
    }'::jsonb,
    '{
        "yield_min_ksi": 25.0,
        "tensile_min_ksi": 70.0,
        "elongation_min_pct": 40.0,
        "hardness_max_hbw": 217
    }'::jsonb
),
(
    'aisi-4140',
    'AISI',
    '4140 Chromium-Moly Alloy',
    'Alloy Steel',
    'Chromium-molybdenum through-hardening alloy steel providing exceptional toughness, high fatigue strength, and wear resistance.',
    ARRAY['Drill collars', 'Forged shafts', 'Heavy gears', 'Hydraulic cylinders'],
    'Requires preheat and post-weld heat treatment',
    0.65,
    '{
        "C": {"min": 0.38, "max": 0.43},
        "Mn": {"min": 0.75, "max": 1.00},
        "P": {"max": 0.035},
        "S": {"max": 0.040},
        "Si": {"min": 0.15, "max": 0.35},
        "Cr": {"min": 0.80, "max": 1.10},
        "Mo": {"min": 0.15, "max": 0.25}
    }'::jsonb,
    '{
        "yield_min_ksi": 95.0,
        "tensile_min_ksi": 125.0,
        "elongation_min_pct": 18.0,
        "hardness_max_hbw": 285
    }'::jsonb
)
ON CONFLICT (id) DO UPDATE SET
    grade_name = EXCLUDED.grade_name,
    category = EXCLUDED.category,
    description = EXCLUDED.description,
    typical_applications = EXCLUDED.typical_applications,
    weldability_rating = EXCLUDED.weldability_rating,
    max_cev = EXCLUDED.max_cev,
    chem_limits = EXCLUDED.chem_limits,
    mech_limits = EXCLUDED.mech_limits;

-- 2. Realistic Synthetic Demo Sellers
INSERT INTO sellers (id, name, business_type, headquarters_city, headquarters_state, rating, is_synthetic_demo, contact_email)
VALUES
(
    '11111111-1111-4111-8111-111111111111',
    'Great Lakes Steel Service (Synthetic Demo)',
    'Steel Service Center',
    'Gary',
    'IN',
    4.90,
    TRUE,
    'orders@demo-greatlakes.internal'
),
(
    '22222222-2222-4222-8222-222222222222',
    'Gulf Coast Energy Metals (Synthetic Demo)',
    'Master Distributor',
    'Houston',
    'TX',
    4.85,
    TRUE,
    'sales@demo-gulfcoastmetals.internal'
),
(
    '33333333-3333-4333-8333-333333333333',
    'Allegheny Structural Plate (Synthetic Demo)',
    'Integrated Mill Processor',
    'Pittsburgh',
    'PA',
    4.95,
    TRUE,
    'support@demo-alleghenyplate.internal'
),
(
    '44444444-4444-4444-8444-444444444444',
    'Midwest Stainless & Alloy Co (Synthetic Demo)',
    'Specialty Distributor',
    'Chicago',
    'IL',
    4.80,
    TRUE,
    'inventory@demo-midwestalloy.internal'
)
ON CONFLICT (id) DO NOTHING;

-- 3. Realistic Synthetic Material Test Certificates (MTRs)
INSERT INTO material_test_certificates (
    id, heat_number, cert_number, mill_name, mill_country, specification, en10204_type,
    product_form, dimensions, chemical_analysis, mechanical_results, heat_treatment,
    is_synthetic_demo, qc_status, qc_summary
)
VALUES
(
    'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
    'H-784291',
    'MTR-2026-GLS-0419',
    'Burns Harbor Plate Works',
    'USA',
    'ASTM A572 Grade 50',
    '3.1',
    'Plate',
    '{"thickness_in": 0.750, "width_in": 96.0, "length_in": 240.0, "weight_lbs": 4896.0}'::jsonb,
    '{"C": 0.18, "Mn": 1.15, "P": 0.015, "S": 0.008, "Si": 0.24, "V": 0.035, "Nb": 0.021, "Cr": 0.04, "Ni": 0.03, "Mo": 0.01, "Cu": 0.12, "CEV": 0.385}'::jsonb,
    '{"yield_strength_ksi": 54.8, "tensile_strength_ksi": 72.4, "elongation_pct": 23.5}'::jsonb,
    'As-Rolled',
    TRUE,
    'passed',
    '{"status": "PASS", "standards_met": ["ASTM A572-50", "AASHTO M223"], "cev_evaluation": "Under 0.43 max threshold (0.385 calculated)", "weldability": "Standard AWS D1.1 preheat applies"}'::jsonb
),
(
    'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
    'H-912044',
    'MTR-2026-GC-8812',
    'Baytown Heavy Plate Rolling',
    'USA',
    'ASTM A516 Grade 70 (Normalized)',
    '3.1',
    'Plate',
    '{"thickness_in": 1.250, "width_in": 120.0, "length_in": 480.0, "weight_lbs": 20400.0}'::jsonb,
    '{"C": 0.22, "Mn": 1.10, "P": 0.012, "S": 0.004, "Si": 0.28, "Cr": 0.05, "Ni": 0.08, "Mo": 0.02, "Cu": 0.09, "CEV": 0.418}'::jsonb,
    '{"yield_strength_ksi": 46.2, "tensile_strength_ksi": 78.9, "elongation_pct": 27.0, "charpy_impact_f": -50.0, "charpy_avg_ft_lbs": 38.0}'::jsonb,
    'Normalized @ 1650°F',
    TRUE,
    'passed',
    '{"status": "PASS", "standards_met": ["ASTM A516-70", "ASME SA-516-70"], "cev_evaluation": "0.418 within PVQ limits", "impact_testing": "Exceeds 20 ft-lbs @ -50°F requirement (38 ft-lbs avg)"}'::jsonb
),
(
    'cccccccc-cccc-4ccc-8ccc-cccccccccccc',
    'H-643810',
    'MTR-2026-AP-1033',
    'Coatesville Heavy Plate Mill',
    'USA',
    'ASTM A514 Grade B',
    '3.1',
    'Plate',
    '{"thickness_in": 0.500, "width_in": 96.0, "length_in": 288.0, "weight_lbs": 3916.8}'::jsonb,
    '{"C": 0.17, "Mn": 0.88, "P": 0.014, "S": 0.003, "Si": 0.27, "Cr": 0.52, "Mo": 0.21, "B": 0.0022, "CEV": 0.495}'::jsonb,
    '{"yield_strength_ksi": 108.5, "tensile_strength_ksi": 118.2, "elongation_pct": 19.0, "hardness_hbw": 269}'::jsonb,
    'Quenched @ 1650°F, Tempered @ 1150°F',
    TRUE,
    'passed',
    '{"status": "PASS", "standards_met": ["ASTM A514 Grade B"], "yield_test": "108.5 ksi exceeds 100 ksi minimum", "tempering": "Fully verified via mill heat record"}'::jsonb
),
(
    'dddddddd-dddd-4ddd-8ddd-dddddddddddd',
    'H-339211',
    'MTR-2026-MW-7741',
    'Sandusky Precision Stainless Tube & Bar',
    'USA',
    'AISI 316L / ASTM A240',
    '3.1',
    'Plate',
    '{"thickness_in": 0.375, "width_in": 72.0, "length_in": 144.0, "weight_lbs": 1101.6}'::jsonb,
    '{"C": 0.021, "Mn": 1.45, "P": 0.028, "S": 0.002, "Si": 0.45, "Cr": 16.85, "Ni": 11.20, "Mo": 2.18, "N": 0.042}'::jsonb,
    '{"yield_strength_ksi": 39.5, "tensile_strength_ksi": 84.1, "elongation_pct": 52.0, "hardness_hbw": 168}'::jsonb,
    'Solution Annealed @ 1950°F, Water Quenched',
    TRUE,
    'passed',
    '{"status": "PASS", "standards_met": ["AISI 316L", "ASTM A240", "NACE MR0175 / ISO 15156"], "moly_content": "2.18% Mo confirms high chloride pitting resistance", "carbon": "0.021% qualifies as extra-low carbon"}'::jsonb
),
(
    'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee',
    'H-552199',
    'MTR-2026-GLS-9011',
    'Midwest Structural Rolling Mill',
    'USA',
    'ASTM A36',
    '3.1',
    'Hot Rolled Coil',
    '{"thickness_in": 0.250, "width_in": 60.0, "length_in": 0.0, "weight_lbs": 38500.0}'::jsonb,
    '{"C": 0.21, "Mn": 0.95, "P": 0.018, "S": 0.012, "Si": 0.22, "Cu": 0.22, "CEV": 0.380}'::jsonb,
    '{"yield_strength_ksi": 41.2, "tensile_strength_ksi": 66.4, "elongation_pct": 26.0}'::jsonb,
    'As-Rolled Master Coil',
    TRUE,
    'passed',
    '{"status": "PASS", "standards_met": ["ASTM A36"], "ductility": "High elongation 26% well above 20% limit"}'::jsonb
)
ON CONFLICT (id) DO NOTHING;

-- 4. Realistic Synthetic Inventory Listings
INSERT INTO inventory_listings (
    id, seller_id, certificate_id, grade_id, title, product_form, dimensions_display,
    thickness_in, width_in, length_in, pieces_available, total_weight_lbs,
    price_per_cwt, warehouse_city, warehouse_state, warehouse_lat, warehouse_lng,
    min_order_quantity_lbs, status, is_synthetic_demo
)
VALUES
(
    '10101010-1010-4010-8010-101010101010',
    '11111111-1111-4111-8111-111111111111',
    'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
    'astm-a572-50',
    '0.750" A572 Gr 50 Heavy Structural Plate (Heat H-784291)',
    'Plate',
    '0.750" x 96" x 240"',
    0.7500,
    96.00,
    240.00,
    8,
    39168.00,
    49.50,
    'Gary',
    'IN',
    41.5934,
    -87.3464,
    4896.00,
    'active',
    TRUE
),
(
    '20202020-2020-4020-8020-202020202020',
    '22222222-2222-4222-8222-222222222222',
    'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
    'astm-a516-70',
    '1.250" A516 Gr 70 PVQ Normalized Vessel Plate (Charpy -50°F Tested)',
    'Plate',
    '1.250" x 120" x 480"',
    1.2500,
    120.00,
    480.00,
    3,
    61200.00,
    64.00,
    'Houston',
    'TX',
    29.7604,
    -95.3698,
    20400.00,
    'active',
    TRUE
),
(
    '30303030-3030-4030-8030-303030303030',
    '33333333-3333-4333-8333-333333333333',
    'cccccccc-cccc-4ccc-8ccc-cccccccccccc',
    'astm-a514',
    '0.500" A514 T-1 High Yield 100ksi Quenched & Tempered Plate',
    'Plate',
    '0.500" x 96" x 288"',
    0.5000,
    96.00,
    288.00,
    10,
    39168.00,
    88.00,
    'Pittsburgh',
    'PA',
    40.4406,
    -79.9959,
    7833.60,
    'active',
    TRUE
),
(
    '40404040-4040-4040-8040-404040404040',
    '44444444-4444-4444-8444-444444444444',
    'dddddddd-dddd-4ddd-8ddd-dddddddddddd',
    'aisi-316l',
    '0.375" 316L Marine Grade Stainless Mill Plate (NACE Compliant)',
    'Plate',
    '0.375" x 72" x 144"',
    0.3750,
    72.00,
    144.00,
    14,
    15422.40,
    265.00,
    'Chicago',
    'IL',
    41.8781,
    -87.6298,
    2203.20,
    'active',
    TRUE
),
(
    '50505050-5050-4050-8050-505050505050',
    '11111111-1111-4111-8111-111111111111',
    'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee',
    'astm-a36',
    '0.250" A36 Hot Rolled Master Steel Coil (Slit-to-Width Available)',
    'Hot Rolled Coil',
    '0.250" x 60" Coil',
    0.2500,
    60.00,
    0.00,
    1,
    38500.00,
    42.00,
    'Gary',
    'IN',
    41.5934,
    -87.3464,
    38500.00,
    'active',
    TRUE
)
ON CONFLICT (id) DO NOTHING;
