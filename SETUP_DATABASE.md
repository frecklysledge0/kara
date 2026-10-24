# MillProof Supabase Database Setup & Architecture Guide

This document details the database schema, security rules, and setup procedures for the MillProof AI-Assisted B2B Steel Marketplace.

---

## 1. Architecture & Canonical Tables

The database schema is organized around four canonical entities with strict numeric types, foreign key constraints, and positive value checks:

### 1. `sellers`
- **Purpose**: Represents certified steel service centers, distributors, and mini-mill facilities.
- **Columns**:
  - `id`: `UUID PRIMARY KEY DEFAULT gen_random_uuid()`
  - `name`: `TEXT NOT NULL`
  - `city`: `TEXT NOT NULL`
  - `state`: `TEXT NOT NULL`
  - `country`: `TEXT NOT NULL DEFAULT 'USA'`
  - `latitude`, `longitude`: `NUMERIC(10, 6)` nullable
  - `mill_route`: `TEXT CHECK (mill_route IS NULL OR mill_route IN ('EAF', 'BOF'))`
  - `description`: `TEXT`
  - `demo_status`: `TEXT NOT NULL DEFAULT 'synthetic_demo'`
  - `created_at`: `TIMESTAMPTZ NOT NULL DEFAULT now()`

### 2. `certificates`
- **Purpose**: Certified EN 10204 3.1 Material Test Reports (MTRs) with extracted ladle chemistry and tensile tests.
- **Columns**:
  - `id`: `UUID PRIMARY KEY DEFAULT gen_random_uuid()`
  - `seller_id`: `UUID REFERENCES sellers(id) ON DELETE SET NULL`
  - `file_path`: `TEXT NOT NULL` (points to private object in `mtr-documents` storage bucket)
  - `original_filename`: `TEXT NOT NULL`
  - `document_sha256`: `TEXT NOT NULL` (*for file integrity tracking only, never for cryptographic authenticity claims*)
  - `heat_number`: `TEXT NOT NULL`
  - `mill_name`: `TEXT NOT NULL`
  - `grade`: `TEXT NOT NULL`
  - `melt_pour_country`: `TEXT NOT NULL DEFAULT 'USA'`
  - `chemistry`: `JSONB NOT NULL DEFAULT '{}'` (heat chemistry: C, Mn, P, S, Si, Cr, Ni, Mo, Cu, V, Nb, CEV)
  - `mechanical`: `JSONB NOT NULL DEFAULT '{}'` (yield strength ksi, tensile strength ksi, elongation %, charpy tests)
  - `extraction_status`: `TEXT NOT NULL CHECK (extraction_status IN ('pending', 'processing', 'completed', 'failed'))`
  - `review_status`: `TEXT NOT NULL CHECK (review_status IN ('unreviewed', 'flagged', 'approved', 'rejected'))`
  - `risk_score`: `NUMERIC(5, 2) CHECK (risk_score IS NULL OR (risk_score >= 0 AND risk_score <= 100))`
  - `flags`: `JSONB NOT NULL DEFAULT '[]'`
  - `extraction_metadata`: `JSONB NOT NULL DEFAULT '{}'`
  - `created_at`: `TIMESTAMPTZ NOT NULL DEFAULT now()`

### 3. `listings`
- **Purpose**: Physical steel inventory lots available for purchase or hold.
- **Columns**:
  - `id`: `UUID PRIMARY KEY DEFAULT gen_random_uuid()`
  - `seller_id`: `UUID NOT NULL REFERENCES sellers(id) ON DELETE CASCADE`
  - `grade`: `TEXT NOT NULL` (e.g. `ASTM A572 Grade 50`, `ASTM A516 Grade 70`, `ASTM A992`)
  - `form`: `TEXT NOT NULL` (`Plate`, `Wide Flange Beam`, `Hot Rolled Coil`, `Structural Tubing`, `Round Bar`)
  - `thickness_in`: `NUMERIC(8, 4) NOT NULL CHECK (thickness_in > 0)`
  - `quantity_tons`: `NUMERIC(10, 2) NOT NULL CHECK (quantity_tons > 0)`
  - `price_per_ton`: `NUMERIC(10, 2) NOT NULL CHECK (price_per_ton > 0)`
  - `certificate_id`: `UUID REFERENCES certificates(id) ON DELETE SET NULL`
  - `status`: `TEXT NOT NULL CHECK (status IN ('draft', 'active', 'reserved', 'closed'))`
  - `created_at`, `updated_at`: `TIMESTAMPTZ NOT NULL DEFAULT now()`

### 4. `orders`
- **Purpose**: Procurement RFQs, binding quotes, and purchase orders.
- **Columns**:
  - `id`: `UUID PRIMARY KEY DEFAULT gen_random_uuid()`
  - `listing_id`: `UUID NOT NULL REFERENCES listings(id) ON DELETE RESTRICT`
  - `buyer_name`: `TEXT NOT NULL`
  - `buyer_city`: `TEXT NOT NULL`
  - `quantity_tons`: `NUMERIC(10, 2) NOT NULL CHECK (quantity_tons > 0)`
  - `estimated_delivered_cost`: `NUMERIC(12, 2) NOT NULL CHECK (estimated_delivered_cost > 0)`
  - `status`: `TEXT NOT NULL CHECK (status IN ('submitted', 'under_review', 'quoted', 'accepted', 'fulfilled', 'cancelled'))`
  - `created_at`: `TIMESTAMPTZ NOT NULL DEFAULT now()`

---

## 2. Security Architecture

1. **Private Storage Bucket (`mtr-documents`)**:
   - MTR certificates are stored strictly in a private bucket with `public: false`.
   - Never allow public unauthenticated access to certificate PDF files.
2. **Service Role Safeguards**:
   - Client code (`src/lib/supabase/client.ts`) strictly uses `NEXT_PUBLIC_SUPABASE_ANON_KEY`.
   - Service role keys are restricted to server-side API routes (`src/lib/supabase/server.ts`).
3. **Untrusted Client Protection**:
   - `seller_id` and review statuses cannot be overwritten or set arbitrarily by untrusted client requests; mutations are validated on the server.
4. **Demo Access Strategy vs Production Authorization**:
   - While full user authentication is simplified for demo benchmarking, RLS policies are applied across all tables (`ALTER TABLE ... ENABLE ROW LEVEL SECURITY`).
   - Certificates are only queryable when linked to active listings or by authenticated owners/service roles.

---

## 3. Applying Migrations & Seed Data

Since direct connection credentials (database password) are held securely by the Supabase project administrator, apply migrations via the Supabase Dashboard:

### Step 1: Run the Migration Script
1. Log in to your [Supabase Dashboard](https://supabase.com/dashboard/project/murlxwcqlrhozjtlxsxt).
2. In the left navigation, click **SQL Editor** -> **New Query**.
3. Copy the entire contents of [`supabase/migrations/20261024000001_millproof_tables.sql`](file:///Users/rohityarabati/Desktop/steel/supabase/migrations/20261024000001_millproof_tables.sql).
4. Paste into the editor and click **Run**.
   *This creates tables `sellers`, `certificates`, `listings`, `orders`, compatibility views, triggers, indexes, and RLS policies.*

### Step 2: Run the Idempotent Seed Script
1. In the **SQL Editor**, open a new query.
2. Copy the entire contents of [`supabase/seed.sql`](file:///Users/rohityarabati/Desktop/steel/supabase/seed.sql).
3. Paste into the editor and click **Run**.
   *This seeds 5 fictional sellers, 20 synthetic listings across diverse grades and forms, 6 certified MTRs, and 4 sample orders.*

### Step 3: Verify the Setup
Run the diagnostic script in the terminal:
```bash
npm run db:verify
```
When successful, it verifies the private bucket and prints representative query results from live PostgreSQL.

---

## 4. Deterministic Local Development & Demo Mode

- **Typed Fixtures**: Located in [`src/lib/data/fixtures.ts`](file:///Users/rohityarabati/Desktop/steel/src/lib/data/fixtures.ts).
- **Explicit Fallback Policy**: If Supabase credentials are absent, the application deterministically uses local fixtures with an explicit demo indicator (`isDemoEnvironment: true`).
- **Failure Integrity Rule**: **The application will NEVER silently switch to demo fixtures after a live database failure.** If a live query fails, an explicit typed error is thrown and reported.

---

## 5. Verification Commands

```bash
# Run unit tests (35 passing tests)
npm test

# Run linter
npm run lint -- --quiet

# Run strict TypeScript check
npx tsc --noEmit

# Run Next.js production build
npm run build

# Run database diagnostics
npm run db:verify
```
