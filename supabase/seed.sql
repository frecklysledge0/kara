-- =====================================================================
-- MillProof: AI-Assisted B2B Steel Marketplace
-- Seed Data: supabase/seed.sql (Idempotent)
-- NOTE: All sellers, listings, and certificates are synthetic demo
--       records. They simulate realistic ASTM/ASME specifications
--       for testing and development.
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. Fictional Sellers (5 US steel market hubs)
-- ---------------------------------------------------------------------
INSERT INTO sellers (id, name, city, state, country, latitude, longitude, mill_route, description, demo_status)
VALUES
(
    '11111111-1111-4111-8111-111111111111',
    'Great Lakes Steel Service (Synthetic Demo)',
    'Gary', 'IN', 'USA',
    41.5934, -87.3464,
    'BOF',
    'Fictional regional service center in Northwest Indiana specializing in heavy structural plate processing and coil leveling.',
    'synthetic_demo'
),
(
    '22222222-2222-4222-8222-222222222222',
    'Gulf Coast Energy Metals (Synthetic Demo)',
    'Houston', 'TX', 'USA',
    29.7604, -95.3698,
    'EAF',
    'Fictional master distributor supplying ASME Section VIII PVQ plate and high-pressure vessel fabricators.',
    'synthetic_demo'
),
(
    '33333333-3333-4333-8333-333333333333',
    'Allegheny Structural Plate (Synthetic Demo)',
    'Pittsburgh', 'PA', 'USA',
    40.4406, -79.9959,
    'EAF',
    'Fictional heavy steel processor serving the Appalachian infrastructure corridor and bridge contractors.',
    'synthetic_demo'
),
(
    '44444444-4444-4444-8444-444444444444',
    'Midwest Stainless & Alloy Co (Synthetic Demo)',
    'Chicago', 'IL', 'USA',
    41.8781, -87.6298,
    'EAF',
    'Fictional specialty distributor of austenitic stainless plate and sanitary piping materials.',
    'synthetic_demo'
),
(
    '55555555-5555-4555-8555-555555555555',
    'Mississippi Delta Mini-Mill Yards (Synthetic Demo)',
    'Blytheville', 'AR', 'USA',
    35.9273, -89.9190,
    'EAF',
    'Fictional EAF mini-mill depot stocking structural wide-flange beams, channels, and angles.',
    'synthetic_demo'
)
ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    city = EXCLUDED.city,
    state = EXCLUDED.state,
    latitude = EXCLUDED.latitude,
    longitude = EXCLUDED.longitude,
    mill_route = EXCLUDED.mill_route,
    description = EXCLUDED.description,
    demo_status = EXCLUDED.demo_status;

-- ---------------------------------------------------------------------
-- 2. Certified Material Test Certificates (MTRs)
-- Document SHA-256 hashes are simulated file-integrity checksums.
-- ---------------------------------------------------------------------
INSERT INTO certificates (
    id, seller_id, file_path, original_filename, document_sha256,
    heat_number, mill_name, grade, melt_pour_country,
    chemistry, mechanical, extraction_status, review_status, risk_score, flags, extraction_metadata
)
VALUES
(
    'c0010000-0000-4000-8000-000000000001',
    '11111111-1111-4111-8111-111111111111',
    'mtr-documents/cert-a572-01.pdf',
    'MTR_H784291_A572_Gr50.pdf',
    'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
    'H-784291',
    'Burns Harbor Plate Works (Simulated Mill)',
    'ASTM A572 Grade 50',
    'USA',
    '{"C": 0.16, "Mn": 1.25, "P": 0.015, "S": 0.008, "Si": 0.28, "V": 0.045, "Nb": 0.022, "CEV": 0.38}'::jsonb,
    '{"yield_strength_ksi": 54.2, "tensile_strength_ksi": 72.8, "elongation_pct": 22.5, "charpy_temp_f": 0, "charpy_avg_ft_lbs": 38}'::jsonb,
    'completed', 'approved', 4.5,
    '[]'::jsonb,
    '{"extracted_at": "2026-10-20T10:00:00Z", "model": "gemini-3.5-flash", "confidence": 0.98}'::jsonb
),
(
    'c0020000-0000-4000-8000-000000000002',
    '22222222-2222-4222-8222-222222222222',
    'mtr-documents/cert-a516-01.pdf',
    'MTR_H918204_A516_Gr70_Normalized.pdf',
    'ca978112ca1bbdcafac231b39a23dc4da786eff8147c4e72b9807785afee48bb',
    'H-918204',
    'Mobile Tubular & Plate Mill (Simulated Mill)',
    'ASTM A516 Grade 70',
    'USA',
    '{"C": 0.22, "Mn": 1.15, "P": 0.012, "S": 0.005, "Si": 0.32, "Cu": 0.18, "Ni": 0.12, "CEV": 0.42}'::jsonb,
    '{"yield_strength_ksi": 46.5, "tensile_strength_ksi": 76.2, "elongation_pct": 24.0, "charpy_temp_f": -50, "charpy_avg_ft_lbs": 28}'::jsonb,
    'completed', 'approved', 2.0,
    '[]'::jsonb,
    '{"extracted_at": "2026-10-21T11:30:00Z", "model": "gemini-3.5-flash", "confidence": 0.99}'::jsonb
),
(
    'c0030000-0000-4000-8000-000000000003',
    '33333333-3333-4333-8333-333333333333',
    'mtr-documents/cert-a992-01.pdf',
    'MTR_H441092_A992_W14x90.pdf',
    '4b227777d4dd1fc61c6f884f48641d02b4d121d3fd328cb08b5531fcacdabf8a',
    'H-441092',
    'Steel Dynamics Structural Div (Simulated Mill)',
    'ASTM A992',
    'USA',
    '{"C": 0.11, "Mn": 1.05, "P": 0.014, "S": 0.018, "Si": 0.22, "Cu": 0.25, "V": 0.02, "CEV": 0.33}'::jsonb,
    '{"yield_strength_ksi": 53.0, "tensile_strength_ksi": 69.5, "elongation_pct": 21.0}'::jsonb,
    'completed', 'approved', 5.0,
    '[]'::jsonb,
    '{"extracted_at": "2026-10-19T08:15:00Z", "model": "gemini-3.5-flash", "confidence": 0.97}'::jsonb
),
(
    'c0040000-0000-4000-8000-000000000004',
    '44444444-4444-4444-8444-444444444444',
    'mtr-documents/cert-316l-01.pdf',
    'MTR_H316882_A240_316L.pdf',
    'ef2d127de37b942baad06145e54b0c619a1f22327b2ebbcfbec78f5564afe39d',
    'H-316882',
    'North American Stainless (Simulated Mill)',
    'ASTM A240 Type 316L',
    'USA',
    '{"C": 0.022, "Mn": 1.45, "P": 0.028, "S": 0.002, "Si": 0.45, "Cr": 17.20, "Ni": 10.40, "Mo": 2.15, "N": 0.045}'::jsonb,
    '{"yield_strength_ksi": 42.0, "tensile_strength_ksi": 86.5, "elongation_pct": 48.0, "hardness_hbw": 155}'::jsonb,
    'completed', 'approved', 3.0,
    '[]'::jsonb,
    '{"extracted_at": "2026-10-18T14:20:00Z", "model": "gemini-3.5-flash", "confidence": 0.99}'::jsonb
),
(
    'c0050000-0000-4000-8000-000000000005',
    '33333333-3333-4333-8333-333333333333',
    'mtr-documents/cert-a514-01.pdf',
    'MTR_H514102_A514_GradeB.pdf',
    '5e884898da28047151d0e56f8dc6292773603d0d6aabbdd62a11ef721d1542d8',
    'H-514102',
    'Coatesville Plate Center (Simulated Mill)',
    'ASTM A514 Grade B',
    'USA',
    '{"C": 0.17, "Mn": 0.85, "P": 0.010, "S": 0.003, "Si": 0.25, "Cr": 0.55, "Mo": 0.22, "V": 0.05, "B": 0.0025, "CEV": 0.52}'::jsonb,
    '{"yield_strength_ksi": 108.5, "tensile_strength_ksi": 122.0, "elongation_pct": 18.5, "hardness_hbw": 265, "charpy_temp_f": -50, "charpy_avg_ft_lbs": 32}'::jsonb,
    'completed', 'approved', 6.0,
    '[]'::jsonb,
    '{"extracted_at": "2026-10-15T09:00:00Z", "model": "gemini-3.5-flash", "confidence": 0.98}'::jsonb
),
(
    'c0060000-0000-4000-8000-000000000006',
    '11111111-1111-4111-8111-111111111111',
    'mtr-documents/cert-a36-01.pdf',
    'MTR_H360981_A36_Plate.pdf',
    '8756040e1e695d8525b64c0fc891f7a0be875e542ef99ba31c9dd4f8303e9112',
    'H-360981',
    'Burns Harbor Plate Works (Simulated Mill)',
    'ASTM A36',
    'USA',
    '{"C": 0.21, "Mn": 0.92, "P": 0.018, "S": 0.012, "Si": 0.20, "Cu": 0.22, "CEV": 0.38}'::jsonb,
    '{"yield_strength_ksi": 41.2, "tensile_strength_ksi": 64.5, "elongation_pct": 23.0}'::jsonb,
    'completed', 'approved', 1.0,
    '[]'::jsonb,
    '{"extracted_at": "2026-10-12T16:40:00Z", "model": "gemini-3.5-flash", "confidence": 0.97}'::jsonb
)
ON CONFLICT (id) DO UPDATE SET
    heat_number = EXCLUDED.heat_number,
    grade = EXCLUDED.grade,
    chemistry = EXCLUDED.chemistry,
    mechanical = EXCLUDED.mechanical,
    review_status = EXCLUDED.review_status,
    risk_score = EXCLUDED.risk_score;

-- ---------------------------------------------------------------------
-- 3. Realistic Synthetic Listings (20 listings across multiple grades/forms)
-- ---------------------------------------------------------------------
INSERT INTO listings (
    id, seller_id, grade, form, thickness_in, quantity_tons, price_per_ton, certificate_id, status
)
VALUES
-- Batch 1: Great Lakes Steel Service (Gary, IN)
(
    '10101010-1010-4010-8010-101010101010',
    '11111111-1111-4111-8111-111111111111',
    'ASTM A572 Grade 50', 'Plate', 0.7500, 24.50, 1080.00,
    'c0010000-0000-4000-8000-000000000001', 'active'
),
(
    '10101010-1010-4010-8010-101010101011',
    '11111111-1111-4111-8111-111111111111',
    'ASTM A36', 'Plate', 0.5000, 32.00, 960.00,
    'c0060000-0000-4000-8000-000000000006', 'active'
),
(
    '10101010-1010-4010-8010-101010101012',
    '11111111-1111-4111-8111-111111111111',
    'ASTM A572 Grade 50', 'Plate', 1.0000, 18.25, 1120.00,
    'c0010000-0000-4000-8000-000000000001', 'active'
),
(
    '10101010-1010-4010-8010-101010101013',
    '11111111-1111-4111-8111-111111111111',
    'ASTM A36', 'Plate', 1.5000, 40.00, 990.00,
    'c0060000-0000-4000-8000-000000000006', 'active'
),

-- Batch 2: Gulf Coast Energy Metals (Houston, TX)
(
    '20202020-2020-4020-8020-202020202020',
    '22222222-2222-4222-8222-222222222222',
    'ASTM A516 Grade 70', 'Plate', 1.2500, 30.62, 1360.00,
    'c0020000-0000-4000-8000-000000000002', 'active'
),
(
    '20202020-2020-4020-8020-202020202021',
    '22222222-2222-4222-8222-222222222222',
    'ASTM A516 Grade 70', 'Plate', 2.0000, 26.50, 1420.00,
    'c0020000-0000-4000-8000-000000000002', 'active'
),
(
    '20202020-2020-4020-8020-202020202022',
    '22222222-2222-4222-8222-222222222222',
    'ASTM A516 Grade 70', 'Plate', 0.8750, 44.00, 1340.00,
    'c0020000-0000-4000-8000-000000000002', 'active'
),
(
    '20202020-2020-4020-8020-202020202023',
    '22222222-2222-4222-8222-222222222222',
    'ASTM A516 Grade 70', 'Hot Rolled Coil', 0.3750, 52.00, 1280.00,
    'c0020000-0000-4000-8000-000000000002', 'active'
),

-- Batch 3: Allegheny Structural Plate (Pittsburgh, PA)
(
    '30303030-3030-4030-8030-303030303030',
    '33333333-3333-4333-8333-333333333333',
    'ASTM A992', 'Wide Flange Beam', 0.8750, 18.00, 1140.00,
    'c0030000-0000-4000-8000-000000000003', 'active'
),
(
    '30303030-3030-4030-8030-303030303031',
    '33333333-3333-4333-8333-333333333333',
    'ASTM A514', 'Plate', 1.0000, 14.50, 2250.00,
    'c0050000-0000-4000-8000-000000000005', 'active'
),
(
    '30303030-3030-4030-8030-303030303032',
    '33333333-3333-4333-8333-333333333333',
    'ASTM A514', 'Plate', 0.5000, 12.00, 2180.00,
    'c0050000-0000-4000-8000-000000000005', 'active'
),
(
    '30303030-3030-4030-8030-303030303033',
    '33333333-3333-4333-8333-333333333333',
    'ASTM A588 Grade A', 'Plate', 0.7500, 20.00, 1480.00,
    'c0010000-0000-4000-8000-000000000001', 'active'
),

-- Batch 4: Midwest Stainless & Alloy Co (Chicago, IL)
(
    '40404040-4040-4040-8040-404040404040',
    '44444444-4444-4444-8444-444444444444',
    'ASTM A240 Type 316L', 'Plate', 0.5000, 12.26, 3800.00,
    'c0040000-0000-4000-8000-000000000004', 'active'
),
(
    '40404040-4040-4040-8040-404040404041',
    '44444444-4444-4444-8444-444444444444',
    'ASTM A240 Type 304', 'Plate', 0.2500, 15.00, 2900.00,
    'c0040000-0000-4000-8000-000000000004', 'active'
),
(
    '40404040-4040-4040-8040-404040404042',
    '44444444-4444-4444-8444-444444444444',
    'ASTM A240 Type 316L', 'Round Bar', 2.0000, 8.50, 4100.00,
    'c0040000-0000-4000-8000-000000000004', 'active'
),
(
    '40404040-4040-4040-8040-404040404043',
    '44444444-4444-4444-8444-444444444444',
    'ASTM A240 Type 304', 'Hot Rolled Coil', 0.1875, 28.00, 2750.00,
    'c0040000-0000-4000-8000-000000000004', 'active'
),

-- Batch 5: Mississippi Delta Mini-Mill Yards (Blytheville, AR)
(
    '50505050-5050-4050-8050-505050505050',
    '55555555-5555-4555-8555-555555555555',
    'ASTM A992', 'Wide Flange Beam', 0.5000, 36.00, 1100.00,
    'c0030000-0000-4000-8000-000000000003', 'active'
),
(
    '50505050-5050-4050-8050-505050505051',
    '55555555-5555-4555-8555-555555555555',
    'ASTM A500 Grade B', 'Structural Tubing', 0.3750, 24.00, 1180.00,
    'c0030000-0000-4000-8000-000000000003', 'active'
),
(
    '50505050-5050-4050-8050-505050505052',
    '55555555-5555-4555-8555-555555555555',
    'ASTM A36', 'Round Bar', 1.2500, 16.50, 980.00,
    'c0060000-0000-4000-8000-000000000006', 'active'
),
(
    '50505050-5050-4050-8050-505050505053',
    '55555555-5555-4555-8555-555555555555',
    'ASTM A572 Grade 50', 'Wide Flange Beam', 0.6250, 48.00, 1150.00,
    'c0010000-0000-4000-8000-000000000001', 'reserved'
)
ON CONFLICT (id) DO UPDATE SET
    grade = EXCLUDED.grade,
    form = EXCLUDED.form,
    thickness_in = EXCLUDED.thickness_in,
    quantity_tons = EXCLUDED.quantity_tons,
    price_per_ton = EXCLUDED.price_per_ton,
    certificate_id = EXCLUDED.certificate_id,
    status = EXCLUDED.status;

-- ---------------------------------------------------------------------
-- 4. Sample Procurement Orders
-- ---------------------------------------------------------------------
INSERT INTO orders (
    id, listing_id, buyer_name, buyer_city, quantity_tons, estimated_delivered_cost, status
)
VALUES
(
    '90909090-9090-4090-8090-909090909001',
    '10101010-1010-4010-8010-101010101010',
    'Midwest Heavy Infrastructure LLC',
    'Chicago, IL',
    24.50,
    28588.58,
    'fulfilled'
),
(
    '90909090-9090-4090-8090-909090909002',
    '20202020-2020-4020-8020-202020202020',
    'Apex Pressure Vessel Fabricators',
    'Corpus Christi, TX',
    30.62,
    44433.00,
    'accepted'
),
(
    '90909090-9090-4090-8090-909090909003',
    '30303030-3030-4030-8030-303030303030',
    'Keystone Commercial Constructors',
    'Cleveland, OH',
    18.00,
    22187.50,
    'quoted'
),
(
    '90909090-9090-4090-8090-909090909004',
    '40404040-4040-4040-8040-404040404040',
    'Great Lakes Bio-Refining Ltd',
    'Indianapolis, IN',
    12.26,
    48106.00,
    'under_review'
)
ON CONFLICT (id) DO UPDATE SET
    quantity_tons = EXCLUDED.quantity_tons,
    estimated_delivered_cost = EXCLUDED.estimated_delivered_cost,
    status = EXCLUDED.status;
