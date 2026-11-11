# Development

[Documentation index](README.md) · [Contributing](../CONTRIBUTING.md) · [Getting started](getting-started.md)

## Repository map

```text
api/                  Vercel HTTP entry point
data/                 Placement JSON, source manifests and reviewed transcriptions
docs/                 Guides, audits and historical engineering records
functions/src/        Trusted services, access checks, callable/HTTP adapters
legacy/               Preserved original dashboard baseline
public/               Logos, fonts, social art and patterns
scripts/              Development, source builders and trusted maintenance
shared/               Schemas, statistics, search, identity and notification contracts
src/
  app/                Providers, routing, portal and navigation
  dashboard/          Publication repository and statistical views
  procedures/         Experience reader/editor/company/moderation interfaces
  community/          Paged community state and contributions
  notifications/      Inbox, preferences and shared state
  admin/              Administrator workspace
  landing/            Public scenes, archive examples and fallbacks
  lib/ ui/ styles/    Firebase/auth, reusable controls and presentation
tests/unit/           Pure domain and startup tests
tests/firebase/       Rules, transactions, publication and admin integration
tests/e2e/            Desktop/mobile browser journeys
.github/workflows/    Verification and manually dispatched cloud maintenance
```

`dist/`, `functions/lib/`, `artifacts/`, test reports and local credentials are generated/ignored. Do not infer a supported backend from ignored scratch directories.

## Commands

All named scripts below exist in [package.json](../package.json). Run from the root unless stated.

| Command | Purpose / side effects |
| --- | --- |
| `npm ci` / `npm ci --prefix functions` | Reproducible installation for both packages |
| `npm run dev:beta` | Full isolated demo stack on 5174 |
| `npm run dev` | Original-project live API + frontend; pre-hook generates LinkedIn and backend output |
| `npm run dev:web` | Vite only on 5173; pre-hook generates LinkedIn mapping |
| `npm run dev:api` | Watch trusted local HTTP server on 5002; original project/CLI auth |
| `npm run typecheck` | Root strict TypeScript validation, no emitted output |
| `npm run build:functions` | Compile server/shared imports under `functions/lib/` |
| `npm run build` | LinkedIn generation → backend compilation → typecheck → Vite → share HTML |
| `npm start` | Vite static preview; does not start a production API |
| `npm test` | `tsx --test tests/unit/*.test.ts` |
| `npm run test:firebase` | Build, isolated emulators, seed/verify all batches, backend/rules and browser suites |
| `npm run test:admin` | Same backend verification plus focused admin/workspace browser files |
| `npm run test:landing` | Seed emulators and focused landing browser suite; skips backend test commands |
| `npm run test:e2e` | Direct Playwright; does not itself start/seed Firebase emulators |
| `npm run data:build-2025`, `npm run data:build-2027` | Regenerate datasets from committed reviewed transcriptions |
| `npm run data:linkedin` | Regenerate candidate mapping and report unresolved source entries |
| `npm run db:seed`, `db:verify`, `db:rules` | Explicit-target trusted maintenance; see operations |
| `npm run auth:set-role`, `auth:verify` | Trusted role assignment / live access diagnostics |
| `npm run procedures:seed`, `procedures:verify` | Recruiter catalog seed / backend setup checks |
| `npm run procedures:deploy` | Original-project live maintenance, including a hard-coded admin target; review first |
| `npm run cloud:firebase` | GitHub Actions-only maintenance helper |

There is no configured `lint`, `format`, `test:coverage` or standalone `deploy` npm script. Maintenance helpers such as logo fetching, identity repair and social-art generation are direct scripts, not equivalent to a release pipeline.

Browser icons are committed static assets. Regenerate their 16/32/48px ICO entries, 16/32px PNGs and 180px Apple touch icon with `node scripts/generate-browser-icons.mjs` after changing the brand mark. This uses the existing Playwright Chromium installation and bundled Lora italic font; serving the app does not require Chromium.

## Test strategy

Unit tests cover source reconciliation, metric edge cases, deterministic hashes/chunking, schemas, search, routing, identity mapping, LinkedIn matching, formatting and server module loading. Firebase tests cover denial boundaries, optimistic concurrency, current account policy, voting, moderation, publication and admin repair/recovery. Playwright covers genuine emulator-backed flows plus responsive, keyboard, loading, theme and navigation behavior on desktop and Pixel 7 profiles.

```sh
npm test
npm run build
npx playwright install chromium
npm run test:firebase
```

The full emulator wrapper needs Java 21+ and free ports 8080, 9099, 5001, 4400 and the browser port. CI installs Node 22, Java 21 and Chromium, then runs unit/build/emulator checks. Direct E2E starts a demo-configured Vite server, not its Firebase backend. Reuse requires both `E2E_REUSE_SERVER=true` and `E2E_FIREBASE=true`.

Test artifacts are ignored; do not commit private browser traces. Existing guides' historical pass counts are not current acceptance criteria. This documentation pass's actual results and limitations are in [maintainer decisions](maintainer-decisions.md).

## Extending the system

For a community action, define a strict payload schema in the service layer, enforce ownership/current authority, use a transaction for coupled state changes, add the transport dispatch/client call, and test both unauthorized and successful paths. A client button or route guard never grants authority.

For a statistics change, update shared types/calculations and source-backed tests before preparing a new immutable publication. Preserve batch weighting differences and null semantics. Never repair a published payload directly to make a test pass.

For company identities, use reviewed mappings and evidence; shared logos or parent brands are insufficient. For UI work, preserve focus, keyboard access, small-screen containment, reduced-motion and failed-network recovery. Update the relevant guide when behavior changes.
