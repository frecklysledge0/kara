# Customer search — first slice

Implemented on `feat/uiux`, October 24, 2026. Local work only; no push or deployment.

## Review boundaries

1. `/` now renders a minimal Find Your Steel experience using the existing Button, Input, Badge, Card, and EmptyState components. The client calls `/api/assistant` and uses `AssistantResponse`; it never imports Gemini or Supabase server modules. Existing assistant, seller, quote, and inventory routes remain available. Buyer navigation points to the new homepage and no longer promotes quote management.
2. Recommendations show reasons, limitations, assumptions, and clarification questions. Supplier cards show stored lots, base prices, partial quantity notices, and contact availability. Location filtering is independent of the material brief and does not call Gemini again. Empty, loading, timeout, and retry states retain the user's input. Synthetic contacts are not actionable.
3. An assistant-only inventory adapter combines the existing canonical `listings` repository with the publishing `inventory_listings` / local-cache repository. IDs are deduplicated; canonical records take precedence, including closed/reserved status. Only active, positive-quantity lots are ranked. The fallback cache is refreshed on reads so separate route bundles see publications. This is a bridge, not a database migration.
4. The optional `budget_total` field extends the existing specification contract without breaking older callers. Explicit per-ton budgets remain `budget_per_ton`. The fallback parser asks about unqualified dollar amounts; Gemini receives the same instruction. Budgets are recorded targets, not hard price filters. The UI states that prices exclude freight and taxes.

## Baseline and checks

- Existing uncommitted `package-lock.json` changes were preserved.
- `npm ci --no-audit --no-fund` failed: the lockfile has inconsistent `@emnapi/wasi-threads` versions and a missing `@emnapi/core@1.10.0` entry. A clean install remains blocked; checks used the existing node_modules. No package manifest changes or dependency additions.
- Baseline: 186 tests passed, TypeScript passed, lint had zero errors and seven existing unused-variable warnings in tests.
- Added regression coverage for publication-to-ranking (including a fresh module load), canonical status precedence, duplicate IDs, live/demo labeling, total/per-ton budgets, and ambiguous amounts.
- Production build passed with network access for the existing Google Fonts. The sandbox-only build could not download them. The build still logs existing `/api/grades/translate` prerender-interruption diagnostics but exits successfully.
- Dev server returned HTTP 200 for `/`; the rendered page includes the new customer heading. Local HTTP assistant smoke check returned 10 eligible grades and 15 ranked lots, preserving `$25,000` as a total with no per-ton value.
- No browser automation/preview tool is available in this session: responsive layout, keyboard interactions, and rendered result states still need a visual browser review.
- No `.env.local` exists in this checkout. Live Gemini/Supabase behavior was not verified; the HTTP checks used deterministic/demo behavior. Credentials were not printed.

## Data gaps before the globe and real supplier launch

| Area | Observed gap | Required follow-up |
| --- | --- | --- |
| Coordinates | Canonical sellers allow nullable latitude/longitude. The seller form sends city/state but no coordinates. Publishing defaults missing coordinates to Gary, IN, even for another city; the SQL compatibility view also substitutes Gary. | Capture/validate actual warehouse coordinates and retain missing values. Do not map these defaults as confirmed supplier positions. |
| Local records | `/api/listings` returned seven local lots, all with coordinates populated; all seven lacked a usable real business email. Populated coordinates do not establish that the location was supplied by the seller. | Audit real records when credentials are configured. |
| Contacts | Legacy `Seller` has optional `contact_email`, but canonical seller types/migrations lack email, phone, and website. Current demo emails end in `.internal`. | Add explicitly public business-contact fields to seller onboarding, storage, and the assistant result contract. Do not use private login email as public contact. |
| Publication | POST `/api/listings` assigns the first synthetic seller, marks lots as demo, and uses timestamp IDs. Failed writes fall back to local storage. | Team-owned seller identity and durable publication work is still needed for real suppliers. |
| Overlapping stores | Legacy and canonical records can represent the same physical lot under different IDs. The adapter can only deduplicate identical IDs. Local JSON persistence is not concurrency-safe or suitable for multiple deployed instances. | Consolidate publishing and reading on a canonical store with stable IDs. |
| Freight | Existing ranker falls back to Chicago for unknown destinations and defaults absent warehouse coordinates. Form and thickness are soft ranking criteria. | Keep estimates explicitly qualified; add strict filters if required. This initial page displays base prices and records budget targets only. |

## Next slices

- Rotatable Earth with synchronized supplier cards, using confirmed coordinates only, and an explicit unmapped-inventory state.
- Know Your Steel: one floating metallic specimen, four grades from existing reference data, clickable property labels, and inventory links.
- Structured budget/location editing, real published business contacts, and live integration/browser verification after the underlying data gaps are resolved.
