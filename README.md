# MillProof ⚡
### AI-Assisted Industrial Steel Marketplace with Certified Metallurgical Proof

**MillProof** is an industrial B2B procurement platform bridging structural fabricators, OEMs, and EPC engineering procurement teams with verified steel mill inventory. It translates natural language engineering requirements into suitable ASTM/EN steel grades, itemizes delivered flatbed logistics costs against legal highway payload constraints, and deterministically audits Material Test Reports (MTR / EN 10204 3.1) with mathematical precision.

---

## 🏗️ Product Purpose & Core Architecture

```
  ┌────────────────────────────────────────────────────────┐
  │                 Industrial Buyer                       │
  └──────────────────────────┬─────────────────────────────┘
                             │ Natural language application criteria
                             ▼
  ┌────────────────────────────────────────────────────────┐
  │    Gemini Requirement Parser (Server-Side Route)       │
  │    /api/assistant & /api/translate-requirements        │
  └──────────────────────────┬─────────────────────────────┘
                             │ Validated BuyerSpecification & ASTM Gating
                             ▼
  ┌────────────────────────────────────────────────────────┐
  │   DETERMINISTIC SUITABILITY & MULTI-CRITERIA RANKER    │
  │   - 40% Material Fit (ASTM min yield, tensile, PREN)   │
  │   - 30% Data Quality (MTR completeness, heat flags)    │
  │   - 30% Delivered Cost (Flatbed freight itemization)   │
  └──────────────────────────┬─────────────────────────────┘
                             │ Ranked Active Lots & Landed $/ton
                             ▼
  ┌────────────────────────────────────────────────────────┐
  │    Batch Passport & 48-Hour RFQ Hold Lifecycle         │
  └────────────────────────────────────────────────────────┘

  ┌────────────────────────────────────────────────────────┐
  │         Steel Seller / Service Center                  │
  └──────────────────────────┬─────────────────────────────┘
                             │ Uploads MTR Certificate (PDF / Image)
                             ▼
  ┌────────────────────────────────────────────────────────┐
  │    Magic Byte Anti-Spoofing & Private Storage Vault    │
  │    Supabase Storage (public: false, 1-hr signed URLs)  │
  └──────────────────────────┬─────────────────────────────┘
                             │ Sanitized fileBuffer
                             ▼
  ┌────────────────────────────────────────────────────────┐
  │        Gemini Vision / OCR Extraction API              │
  │        /api/extract-mtr (Strict Schema Server-Side)    │
  └──────────────────────────┬─────────────────────────────┘
                             │ Extracted ladle chemistry & tensile tests
                             ▼
  ┌────────────────────────────────────────────────────────┐
  │       DETERMINISTIC COMPLIANCE ENGINE (PURE CODE)      │
  │  - ASTM chemical tolerances (C, Mn, P, S, Si, etc.)    │
  │  - IIW Carbon Equivalent (CEV) tolerance checks        │
  │  - Yield strength, tensile strength, & elongation %    │
  │  - 0-100 review risk score computation                 │
  │  *** ZERO CRYPTO / NO FAKE AUTHENTICITY LABELS ***    │
  └──────────────────────────┬─────────────────────────────┘
                             │ Deterministic Flags (PASS / WARN / FAIL)
                             ▼
  ┌────────────────────────────────────────────────────────┐
  │    Human-in-the-Loop Seller Review & Catalog Publish   │
  └────────────────────────────────────────────────────────┘
```

### Strict Non-Negotiables & Guardrails
1. **Separation of Extraction vs. Verification**: Gemini is used exclusively for optical character recognition (OCR) and initial natural-language parsing. All pass/fail compliance decisions, IIW Carbon Equivalents, and freight costs are computed **strictly by deterministic software rules** against published ASTM standards.
2. **Transparent Data Provenance**: Every demo seller, listing, and test certificate is explicitly tagged with a `DEMO LOT` or `SYNTHETIC BENCHMARK` badge.
3. **No Crypto / Blockchain Claims**: Zero Solana, blockchain, wallets, or on-chain signatures. A document is never labeled "cryptographically verified" merely because its text parsed cleanly.
4. **Deterministic Freight Constraints**: Incorporates legal standard 45,000 lb flatbed trailer payload limits and transparent fuel surcharge indexes.

---

## 🛠️ Technology Stack

- **Framework**: Next.js 16.4.3 (App Router, Turbopack, Cache Components, Partial Prerendering)
- **Runtime**: Node.js >= 20 (tested on v23.11.0) with React 19
- **Language**: TypeScript 5 (`strict: true`)
- **Styling**: Vanilla Tailwind CSS v4 with industrial forge design system
- **Database & Storage**: Supabase Postgres & Storage (Row Level Security enabled, private bucket)
- **AI Integration**: Google Gen AI SDK (`@google/genai`), called strictly server-side
- **Data Visualizations**: Recharts for ladle chemistry bar charts and tensile pull curves
- **Testing**: Vitest 3.2.7 (16 test suites, 172 tests, 100% passing)
- **Deployment**: Vercel

---

## 💻 Local Setup

### 1. Clone & Install Dependencies
```bash
git clone <repo-url>
cd steel
npm install
```

### 2. Configure Environment Variables
Copy `.env.example` to `.env.local`:
```bash
cp .env.example .env.local
```

### 3. Run Development Server
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000).

---

## 🔐 Environment Variables & Security Rules

| Variable | Scope | Purpose | Security Rule |
| :--- | :--- | :--- | :--- |
| `GEMINI_API_KEY` | **Server-Only** | Google AI Studio key for requirements translation and MTR OCR | **NEVER** expose with `NEXT_PUBLIC_`. Kept exclusively on backend route handlers. |
| `SUPABASE_SERVICE_ROLE_KEY` | **Server-Only** | Admin database operations and private storage access | **CRITICAL**: Never commit to git or expose to client. |
| `NEXT_PUBLIC_SUPABASE_URL` | Client & Server | Project URL for Supabase instance | Public URL for API gateway. |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Client & Server | Anonymous client key for public read requests | Subject to PostgreSQL Row Level Security (RLS). |
| `SUPABASE_MTR_BUCKET` | Server-Only | Name of private storage bucket (`mtr-documents`) | Private bucket (`public: false`), accessed via signed URLs. |
| `NODE_ENV` | Build/Runtime | Execution environment (`development`, `production`) | Configures logging and optimizations. |

> **Graceful Degradation**: If `GEMINI_API_KEY` or Supabase credentials are not provided, MillProof automatically activates high-fidelity deterministic parsers and synthetic demo fixtures, ensuring complete offline demo reliability without crashes.

---

## 🗄️ Database Migrations & Seed Commands

### Schema Architecture
The database schema is organized around four canonical entities:
1. `sellers`: Certified steel service centers and processors (`demo_status`, `mill_route`).
2. `certificates`: MTRs with ladle chemistry, mechanical pull tests, and QC risk scores.
3. `listings`: Physical inventory lots (`grade`, `form`, `thickness_in`, `quantity_tons`, `price_per_ton`).
4. `orders`: Procurement RFQs and quotes with 48-hour SLA lifecycle states.

### Applying Migrations via Supabase Dashboard
1. Open the [Supabase Dashboard](https://supabase.com/dashboard).
2. Go to **SQL Editor** &rarr; **New Query**.
3. Run [`supabase/migrations/20261024000001_millproof_tables.sql`](file:///Users/rohityarabati/Desktop/steel/supabase/migrations/20261024000001_millproof_tables.sql) to provision tables, constraints, triggers, and Row Level Security.
4. Run [`supabase/seed.sql`](file:///Users/rohityarabati/Desktop/steel/supabase/seed.sql) to populate baseline demo sellers, certificates, and inventory lots.

### Resetting the Demo Environment Safely
To reset test quotes or restore initial demo inventory without dropping core schemas:
```sql
-- Safe Demo Reset Script
DELETE FROM orders WHERE id NOT IN ('90909090-9090-4090-8090-909090909001', '90909090-9090-4090-8090-909090909002');
UPDATE listings SET status = 'active' WHERE status = 'reserved';
```

---

## 🧪 Testing & Production Build

```bash
# Run all 16 Vitest test suites (172 unit & integration tests)
npm test

# Run TypeScript compilation check
npx tsc --noEmit

# Run ESLint validation
npm run lint

# Compile production bundle
npm run build

# Start production server locally
npm run start
```

### Test Suite Highlights
- **Metallurgy & Compliance** (`test/metallurgy.test.ts`, `test/compliance.test.ts`):
  - IIW Carbon Equivalent formula verification: $CEV = C + \frac{Mn}{6} + \frac{Cr+Mo+V}{5} + \frac{Ni+Cu}{15}$
  - Out-of-spec chemical limits deterministic failure flags (e.g. Carbon > 0.23% for A572-50)
  - PREN (Pitting Resistance Equivalent Number) for marine stainless steel: $PREN = Cr + 3.3 Mo + 16 N$
- **Freight & Logistics Engine** (`test/freight.test.ts`):
  - Great-circle Haversine with 1.15x highway circuity factor
  - Multi-truckload partitioning based on 45,000 lb legal flatbed payload limits
- **Quote Lifecycle & Authorization** (`test/quote-lifecycle.test.ts`):
  - Validates full quote lifecycle (`submitted` &rarr; `under_review` &rarr; `quoted` &rarr; `accepted` &rarr; `closed`)
  - Multi-tenant isolation: blocks buyers from reading foreign quotes, blocks sellers from viewing competitor RFQs
- **Failure Modes & Security** (`test/failure-modes.test.ts`):
  - Anti-spoofing magic byte verification (%PDF, PNG, JPEG)
  - Filename sanitization against directory traversal (`../../../etc/passwd` &rarr; `passwd`)
  - In-memory rate limiting and graceful AI fallback

---

## 🚀 Deployment

### Vercel Production Deployment
1. Import the repository into your [Vercel](https://vercel.com) team account.
2. In **Project Settings &rarr; Environment Variables**, add:
   - `GEMINI_API_KEY`
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `SUPABASE_MTR_BUCKET` (`mtr-documents`)
3. Trigger a production deployment.
4. **Claiming CLI Deployments**: If deployed via the CLI temporary workflow, claim the deployment via the secure URL token provided in the release report.

---

## 🎭 Demo-Mode Behavior & Synthetic Data Disclosures

- **Synthetic Sellers & Lots**: All initial inventory records represent realistic synthetic demonstration lots modeled after real Midwest service centers (e.g., Gary, IN; Houston, TX; Pittsburgh, PA).
- **MTR Benchmark Suite**: Curated test certificates simulate real EN 10204 3.1 documents with intentional testing variations:
  - Clean Pass: ASTM A572-50 HSLA plate
  - Missing Fields: Omitted heat number and tension test
  - Out-of-Spec Chemistry: Elevated Carbon and Phosphorus exceeding ASTM limits
  - Low Mechanical Properties: Yield strength below 50 ksi threshold
- **Transparent Labelling**: Demo lots display `DEMO LOT` badges, and estimated freight costs are explicitly marked as preliminary flatbed estimates pending dispatcher confirmation.

---

## ⚠️ Known Limitations

1. **Third-Party Live API Optionality**:
   - Voice audio narration requires an active `ELEVENLABS_API_KEY`. When unconfigured, an informational banner appears while all visual text reasoning remains active.
   - Real-time Producer Price Index (PPI) requires `FRED_API_KEY`. When unconfigured, verified synthetic historical benchmarks are displayed.
2. **Dense Metallurgy Tables on Mobile**:
   - Comparison tables retain horizontal scrolling (`overflow-x-auto`) to preserve dense metallurgical column alignment (C, Mn, P, S, Yield, Tensile).

---

