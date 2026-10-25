# MillProof

**Find the right steel. Trust the paperwork.**

MillProof is an AI-assisted B2B platform that connects steel buyers with the mills and service centers that
have what they need, and makes every mill test certificate checkable. We don't sell steel. We help people
find it, understand it, and trust it.

Built in 36 hours at **SBUHacks 2026** (theme: *Steel and Steam*).

---

## The problem

Every steel order ships with a **mill test certificate (MTR)**: the chemistry and strength of that exact
batch. In practice:

- **Buyers can't easily read them.** Grades, ASTM limits, and carbon equivalents are expert knowledge,
  so small fabricators and first-time buyers are effectively gatekept.
- **Certificates can be wrong or faked.** Falsified or altered certificates have let under-spec steel into
  real projects, and verifying one usually means emailing the mill.
- **Finding stock is slow.** Even after you know the grade, you still have to work out who has it, where,
  and what it costs once it's delivered.

## What MillProof does

**For buyers (no account needed)**
- Describe a project in plain English ("handrail for a seaside boardwalk in Miami, 3 tons, $20k total").
- Gemini turns it into a structured spec; deterministic code picks eligible grades and explains why.
- See matching supplier lots on an interactive globe and list, with delivered-cost estimates.
- Compare lots side by side, explore grades in **Know Your Steel**, and request quotes.
- Verify any certificate file against its mill's record on Solana.

**For sellers (account required)**
- Upload a certificate (PDF or photo). Gemini extracts heat number, chemistry, and mechanical results.
- Deterministic QC checks the numbers against published grade limits, recomputes the IIW carbon
  equivalent, flags duplicate heat numbers, and produces a 0-100 review score.
- Optionally register the certificate's SHA-256 fingerprint on Solana as the issuing mill.
- Publish the lot so buyers can find it.

## How it works

```
Buyer prompt ──► Gemini (parse intent) ──► Grade matcher (code) ──► Ranker (code) ──► Globe + list
                                                │                        │
                                       grades.json limits        fit 40% · trust 30% · delivered cost 30%

Certificate ──► file checks ──► Gemini (read the document) ──► normalizer ──► QC engine (code) ──► review score
                                                                                  │
                                                       SHA-256 fingerprint ──► Solana memo, signed by mill wallet
```

**Design principle: AI interprets, code decides.** Gemini reads documents and understands buyer intent.
Every pass/fail decision (chemistry limits, carbon equivalent, strength minimums, ranking, freight) is
deterministic code checked against published standards. If Gemini is unavailable, the app falls back to
rule-based guidance instead of failing.

### What the Solana layer proves (and what it doesn't)

When a mill registers a certificate, its wallet signs a memo containing the file's SHA-256 fingerprint.
Anyone can later recompute the fingerprint and look it up in that mill's public history:

| Check | Result |
|---|---|
| Original file, correct mill | Mill-signed, unchanged |
| One character edited | Not registered (caught) |
| Real file claimed under a different mill | Not registered (caught) |

It proves the **document** is unedited since the mill signed it. It does not prove the steel matches the
paper; that is what the QC checks and physical testing are for.

## Pages

| Route | What it is |
|---|---|
| `/` | Find Your Steel: guided search, grade recommendations, supplier globe |
| `/know-your-steel` | Grade explorer with per-grade 3D specimens and property panels |
| `/compare` | Side-by-side comparison of up to three lots |
| `/listings`, `/listings/[id]` | Marketplace catalog and batch passport pages |
| `/verify` | Check a certificate file against a mill's Solana record |
| `/orders` | Quote requests (buyer and seller views) |
| `/sell`, `/login` | Seller sign-in and certificate upload workspace |

A light/dark toggle in the header switches themes (dark by default).

## Tech stack

| Layer | Tools |
|---|---|
| App | Next.js 16 (App Router, Cache Components), React 19, TypeScript |
| UI | Tailwind CSS v4, custom design system, Recharts, lucide-react |
| AI | Google Gemini via `@google/genai` (server-side only) |
| Data and auth | Supabase (Postgres, Storage, Auth) |
| Proof | Solana devnet via `@solana/web3.js` (Memo program) |
| Validation and tests | Zod, Vitest (240 tests) |

## Getting started

Requires Node.js 20.9 or newer.

```bash
git clone https://github.com/frecklysledge0/kara.git
cd kara
npm install
cp .env.example .env.local   # then fill in the values below
npm run dev                  # http://localhost:3000
```

The app runs without any keys, using built-in demo data and rule-based fallbacks. Add keys to enable the
live features.

### Environment variables

| Variable | Needed for | Notes |
|---|---|---|
| `GEMINI_API_KEY` | AI search and certificate reading | Server-only. Free key at aistudio.google.com |
| `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Database reads, seller auth | Public, protected by row-level security |
| `SUPABASE_SERVICE_ROLE_KEY` | Server-side database and storage | Server-only. Never expose to the client |
| `SUPABASE_MTR_BUCKET` | Certificate storage | Private bucket, default `mtr-documents` |
| `SOLANA_RPC_URL`, `SOLANA_PAYER_SECRET`, `SOLANA_MILL_1..3_SECRET` | Solana proof | Devnet only. Generate with the script below |
| `ELEVENLABS_API_KEY` | Voice narration (optional) | |
| `FRED_API_KEY` | Live steel price index (optional) | Falls back to bundled data |

Never commit `.env.local`. It is git-ignored.

### Solana (devnet) setup

```bash
npx tsx scripts/solana-setup.ts   # creates 1 fee-payer + 3 demo mill wallets in .env.local
# fund the printed fee-payer address at https://faucet.solana.com (Devnet)
npx tsx scripts/solana-demo.ts    # signs a demo certificate, verifies the original, catches an edit
```

### Database

1. In the Supabase SQL Editor, run the migrations in `supabase/migrations/` in order.
2. Run `supabase/seed.sql` for the base demo data.
3. Run `supabase/seed-demo-expansion.sql` for 17 more demo sellers across North America, 44 certificates,
   and 74 listings covering all 10 reference grades. It is idempotent and adapts to older schemas.
4. Check the connection with `npm run db:verify`.

More detail: [`SETUP_DATABASE.md`](SETUP_DATABASE.md).

## Scripts

```bash
npm run dev              # development server
npm run build            # production build
npm test                 # Vitest suite
npm run lint             # ESLint
npm run db:verify        # Supabase connectivity and schema check
npm run grades:validate  # validate data/grades.json
```

## Project structure

```
src/
  app/                 routes and API handlers (assistant, extract-mtr, listings, quotes, solana, ...)
  components/          customer UI, seller workspace, auth, layout, charts
  lib/
    ai/                Gemini client: model routing, timeouts, fallbacks
    engine/            deterministic logic: grade matching, ranking, QC, freight, emissions, normalizer
    solana/            fingerprinting, signing, verification
    supabase/          database, storage, and auth clients
data/grades.json       reference grade library (chemistry and mechanical limits, uses, equivalents)
supabase/              migrations and seed data
test/                  Vitest suites
```

## Honest limitations

- **Demo data.** All sellers, lots, and seeded certificates are synthetic and labeled as such. Seller
  locations use real industrial cities; prices are illustrative.
- **Freight** is an estimate (distance, legal flatbed payload, assumed rates), not a carrier quote.
- **Solana** runs on devnet with three demo mill wallets. Real adoption requires mills to sign their own
  certificates.
- **Publishing** currently writes new lots through a local fallback cache when the database insert fails;
  persisting them to the canonical `listings` table is the next fix.
- **Reference values** come from public grade summaries. MillProof is a screening tool, not a substitute
  for a qualified engineer or lab testing.

## Roadmap

- Mills signing certificates at the source, with heat-number tonnage tracking to catch certificate reuse
- Real freight quotes and carrier integrations
- Voice-guided sourcing with ElevenLabs
- Durable seller publishing to the canonical database, with verified business contacts

## Team

Built at SBUHacks 2026, Stony Brook University.
