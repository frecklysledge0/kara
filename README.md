# MillProof ⚡
### AI-Assisted B2B Steel Marketplace & Deterministic MTR Verification

**MillProof** is an industrial B2B marketplace platform that bridges structural fabricators, OEMs, and EPC engineering procurement teams with verified mill inventory. It translates natural language engineering requirements into suitable ASTM/EN steel grades, itemizes delivered flatbed logistics costs, and deterministically validates Material Test Reports (MTR / EN 10204 3.1) with mathematical precision.

---

## 🏗️ Core Architecture & Design Principles

```
  ┌────────────────────────────────────────────────────────┐
  │                 Industrial Buyer                       │
  └──────────────────────────┬─────────────────────────────┘
                             │ Natural language application criteria
                             ▼
  ┌────────────────────────────────────────────────────────┐
  │    Gemini Requirement Translator (Server-Side Route)   │
  │    /api/translate-requirements                         │
  └──────────────────────────┬─────────────────────────────┘
                             │ Candidate ASTM grades & mechanical targets
                             ▼
  ┌────────────────────────────────────────────────────────┐
  │    Delivered Landed Cost & Flatbed Logistics Engine    │
  │    - 45,000 lbs legal payload constraints              │
  │    - Great-circle Haversine with 1.15x highway factor  │
  │    - Fuel surcharge & oversize permit allowances       │
  └──────────────────────────┬─────────────────────────────┘
                             │ Filtered inventory lots & landed $/cwt
                             ▼
  ┌────────────────────────────────────────────────────────┐
  │    Multi-Lot Comparison Matrix & RFQ Hold Workflow     │
  └────────────────────────────────────────────────────────┘

  ┌────────────────────────────────────────────────────────┐
  │         Steel Seller / Service Center                  │
  └──────────────────────────┬─────────────────────────────┘
                             │ Uploads Mill Test Certificate (PDF / Image)
                             ▼
  ┌────────────────────────────────────────────────────────┐
  │        Gemini Vision / OCR Extraction API              │
  │        /api/extract-mtr (Server-Side Only)             │
  └──────────────────────────┬─────────────────────────────┘
                             │ Raw ladle chemistry & tensile test numbers
                             ▼
  ┌────────────────────────────────────────────────────────┐
  │       DETERMINISTIC COMPLIANCE ENGINE (PURE CODE)      │
  │  - ASTM chemical tolerances (C, Mn, P, S, Si, etc.)    │
  │  - IIW Carbon Equivalent (CEV) & Pcm calculation       │
  │  - Yield, tensile, elongation, & Charpy toughness      │
  │  - AWS D1.1 weldability & preheat advisory             │
  │  *** ZERO CRYPTO / NO FAKE AUTHENTICITY LABELS ***    │
  └──────────────────────────┬─────────────────────────────┘
                             │ Pass / Marginal / Fail flags
                             ▼
  ┌────────────────────────────────────────────────────────┐
  │     Interactive Seller QC Workbench & Publishing       │
  └────────────────────────────────────────────────────────┘
```

### Strict Non-Negotiables & Guardrails
1. **Separation of Extraction vs. Verification**: Gemini is used exclusively for text/OCR extraction and natural-language interpretation. All pass/fail compliance decisions, carbon equivalents, and freight costs are computed **strictly by deterministic software rules** against published ASTM standards.
2. **Transparent Data Provenance**: Every demo seller, listing, and test certificate is explicitly tagged with a `DEMO RECORD` or `SYNTHETIC BENCHMARK` badge.
3. **No Crypto / Blockchain Claims**: Zero Solana, blockchain, wallets, or on-chain signatures. A document is never labeled "cryptographically verified" merely because its text parsed cleanly.
4. **Deterministic Freight Constraints**: Incorporates legal standard 45,000 lb flatbed trailer payload limits and transparent fuel surcharge indexes.

---

## 🛠️ Tech Stack

- **Framework**: [Next.js 16+ (App Router)](https://nextjs.org/) with Turbopack & React 19
- **Language**: TypeScript with `strict: true`
- **Styling**: Tailwind CSS with industrial forge design system
- **Database & Storage**: Supabase Postgres & Storage (Row Level Security enabled)
- **AI Integration**: Google Gen AI SDK (`@google/genai`), called strictly server-side
- **Data Visualizations**: Recharts for chemistry radar/bar charts and landed freight breakdowns
- **Testing**: Vitest for deterministic calculation unit test coverage
- **Deployment**: Vercel

---

## 🚀 Getting Started

### 1. Prerequisites
- Node.js >= 20 (tested on Node v23.11.0)
- npm >= 10

### 2. Clone and Install Dependencies
```bash
git clone <repo-url>
cd steel
npm install
```

### 3. Environment Variables Setup
Copy `.env.example` to `.env.local`:
```bash
cp .env.example .env.local
```

Configure your credentials in `.env.local`:
```env
# Gemini API Key (Server-side routes only)
GEMINI_API_KEY="your-gemini-api-key"

# Supabase Credentials
NEXT_PUBLIC_SUPABASE_URL="https://your-project.supabase.co"
NEXT_PUBLIC_SUPABASE_ANON_KEY="your-anon-key"
SUPABASE_URL="https://your-project.supabase.co"
SUPABASE_SERVICE_ROLE_KEY="your-service-role-key"
```

> **Note**: If Supabase credentials are not provided or the remote instance is unmigrated, MillProof gracefully loads the pre-validated realistic synthetic benchmark dataset so you can run, test, and demonstrate all flows offline without errors.

---

## 🗄️ Supabase Migrations & Database Setup

The database schema and realistic synthetic seed scripts are located in `supabase/`:

1. **Schema Migration**:
   ```sql
   -- Executes in Supabase SQL Editor
   -- File: supabase/migrations/20261024000000_init_millproof.sql
   ```
   Defines:
   - `grade_standards` (ASTM A36, A572 Gr 50, A514 T-1, A516 Gr 70 PVQ, AISI 304L, AISI 316L, AISI 4140)
   - `sellers` (Verified synthetic service centers)
   - `material_test_certificates` (Heat numbers, ladle chemistry, tensile test results, and QC summaries)
   - `inventory_listings` (Lot dimensions, weights, FOB warehouse locations, and pricing)
   - `rfqs` (Buyer quotation requests and landed freight estimates)

2. **Seed Data**:
   ```sql
   -- File: supabase/seed.sql
   ```
   Populates realistic synthetic demo records for service centers, EN 10204 3.1 certificates, and structural plate lots.

---

## 🧪 Testing Suite

MillProof includes a comprehensive Vitest test suite covering metallurgical formulas, ASTM tolerance checks, and flatbed freight calculations:

```bash
# Run all unit tests
npm test

# Run tests in watch mode
npx vitest

# Run production build validation
npm run build
```

### Test Coverage Highlights
- **Metallurgy Engine** (`test/metallurgy.test.ts`):
  - IIW Carbon Equivalent formula verification:
    $$CEV = C + \frac{Mn}{6} + \frac{Cr + Mo + V}{5} + \frac{Ni + Cu}{15}$$
  - Ito-Bessyo Crack Parameter ($P_{cm}$) calculation
  - PREN (Pitting Resistance Equivalent Number) for marine stainless steel
  - Missing element transparent estimation detection
- **Compliance Engine** (`test/compliance.test.ts`):
  - ASTM A572-50 ladle chemistry and yield strength pass tests
  - Out-of-spec chemical limits deterministic failure flags (e.g. Carbon > 0.23%)
  - Marginal chemical boundary warnings (within 5% of upper threshold)
  - PVQ Charpy V-Notch impact test pass/fail checks at -50°F
- **Freight & Logistics Engine** (`test/freight.test.ts`):
  - Haversine highway route distance calculations
  - Multi-truckload partitioning based on 45,000 lb legal flatbed payload bounds
  - Oversize width surcharge application (> 102 inches)

---

## 🌐 Application Workflows

1. **Buyer Procurement Workspace** (`/procure`):
   - Input engineering application descriptions in natural language.
   - Server-side Gemini maps criteria to ASTM/EN grades with match confidence scores.
   - Filter available inventory lots and view live delivered landed cost itemization.
   - Click **"Audit MTR Batch"** to inspect certified chemistry and tensile test charts.
2. **Seller MTR Ingestion & QC Workbench** (`/seller`):
   - Upload any MTR document or choose from pre-loaded benchmark samples.
   - View extracted ladle chemistry and tensile tests audited against published ASTM criteria.
   - Inspect out-of-spec flags and Carbon Equivalent weldability advisories.
   - Confirm human-in-the-loop review and publish directly to the active catalog.
3. **Multi-Lot Comparison Matrix** (`/compare`):
   - Compare up to 4 inventory lots side-by-side across dimensions, FOB mill prices, delivered costs to destination ZIP, mechanical properties, and manufacturing origins.
   - Simulate an RFQ quotation request and lock freight estimates.
4. **ASTM Standards Reference Library** (`/standards`):
   - Inspect published chemical tolerances, mechanical limits, and weldability rules.
   - Includes an **Interactive Carbon Equivalent ($CEV$) Sandbox** to simulate custom ladle chemistries in real-time.

---

## 📦 Vercel Deployment

1. Push your repository to GitHub.
2. Import the project into [Vercel](https://vercel.com).
3. Add the environment variables:
   - `GEMINI_API_KEY`
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`
4. Deploy! Next.js App Router will automatically build and optimize the application.
