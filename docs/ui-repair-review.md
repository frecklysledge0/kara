# Buyer and seller interaction repairs

## What changed

- Restored `/compare` as an actual supplier-lot comparison. Buyers select up to three lots from search, the marketplace, or the comparison catalog. Selections survive navigation/reload in the tab. Empty selections stay empty, and unavailable lots are identified rather than replaced with demo lots.
- Added a smoky amber homepage, sourcing steps, edit/start-over actions, and consistent navigation across buyer and seller routes.
- `/sell` now presents the actual sign-in/create-account form when signed out. `/login` shares that form. The upload workspace still requires a signed-in seller.
- Fixed the seller hydration mismatch: a streamed route's initial auth snapshot now matches its server render even if the provider has already resolved the session. Session checks and network calls have bounded waits and visible recovery messages.
- The material explorer exposes Composition immediately, retains all four property controls, offers every curated grade, and supports side-by-side reference comparisons. Specimens change shape/finish by grade and use a single animation loop with pause, manual rotation, visibility handling, and reduced-motion support.
- Fixed globe dragging reading a cleared drag reference from a queued state update. Regression coverage exercises release, cancellation, capture loss, and multiple pointer IDs.
- Buyer grade guidance survives supplier database outages with an explicit inventory warning. No replacement supplier data is invented. Network requests respect cancellation.
- Kept upstream main fixes, its lenient buyer schema, and the total-budget field. Preserved the pre-existing local lockfile changes separately from the commit.

## Local startup repair

The existing generated Turbopack development cache contained unexpected duplicate filenames (`LOG 3`, `CURRENT 2`). Next refused to restart with that cache. It was moved intact to `/private/tmp/millproof-turbopack-cache-backup-20261024`, and Next generated a fresh cache. Application source and environment secrets were not removed.

The final TypeScript check also found duplicate generated declarations such as `.next/types/routes.d 2.ts`. Those duplicate generated files were moved to the backup's `duplicate-generated-types` directory; the normal generated declarations were retained. If a file-sync tool is managing this Desktop folder, exclude generated `.next` contents from syncing or keep the checkout outside its synced folders to avoid recurrence.

Use `http://localhost:3000`. Browser checks found that the original localhost server hydrated there while the alternate loopback address did not. The dev configuration now explicitly permits both loopback origins; the running server must also bind the address being used.

## Verification

- `npx tsc --noEmit`: passed.
- `npm test`: 237 tests passed, including network deadlines, inventory-outage guidance, budget parsing, quote lifecycle, MTR/QC pipeline, and drag regressions.
- `npm run build`: passed; the grade-translation prerender diagnostic was also corrected.
- `npm run lint`: no errors; seven pre-existing unused-variable warnings in tests.
- Browser regression suite against the production build: passed at 1440px and 375px. Checks include real buyer search, globe drag/release, property panels, grade changes, motion/pause, comparison persistence/removal, seller signup confirmation and sign-in errors/success/signout, protected upload access, reduced motion, and keyboard operation. No runtime or hydration errors.
- Authentication responses were intercepted in the browser tests. No real accounts or quotes were created and no Solana transactions were submitted. Live email confirmation, real seller credentials, certificate extraction against live Gemini, and Solana signing were not end-to-end verified in this repair.

## Browser review

1. Open `/`. Choose “Warehouse shelving”, then “Find steel”. Check recommendations and drag/release the globe several times.
2. Add supplier lots using “Compare lot”; open Compare. Reload, remove lots, and verify clearing the selection stays empty.
3. Open Know Your Steel. Change grade, use each property button, pause/resume rotation, and choose a second grade under “Compare with”.
4. Click For Sellers. Sign-in and Create account should be available immediately. Use your own seller account to verify live access and sign-out.
5. At phone width, check that the navigation, forms, property controls, and comparison table remain usable. Comparison tables can scroll within their own container.

## Optional repeatable browser suite

The app has no new runtime or development dependencies. Playwright was installed in a temporary directory for verification. To repeat on macOS with Chrome installed:

```sh
npm install --prefix /private/tmp/millproof-browser playwright --no-audit --no-fund
npm run build
npm run start -- --hostname localhost --port 3100
# In another terminal, from kara:
NODE_PATH=/private/tmp/millproof-browser/node_modules MILLPROOF_TEST_URL=http://localhost:3100 node scripts/browser-smoke.cjs
```

`MILLPROOF_CHROME_PATH` can select another installed Chromium executable. The suite intercepts Supabase Auth requests with test responses; it does not create real accounts.
