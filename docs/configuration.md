# Configuration

[Documentation index](README.md) · [Getting started](getting-started.md) · [Deployment](deployment.md)

Use [the root example](../.env.example) for browser/local CLI settings and [the Functions example](../functions/.env.example) for wrapper-specific server settings. Real `.env` files are ignored. Examples contain no working credentials.

## Browser build variables

Vite embeds `VITE_*` in client output. They are public configuration, never a place for private credentials. Restart Vite after editing local settings; rebuild/redeploy to change production values.

| Variable | Requirement / behavior |
| --- | --- |
| `VITE_FIREBASE_API_KEY` | Required web Firebase API key; identifies the web app, does not authorize Admin SDK access |
| `VITE_FIREBASE_AUTH_DOMAIN` | Required Auth domain, typically `your-project.firebaseapp.com` |
| `VITE_FIREBASE_PROJECT_ID` | Required project ID |
| `VITE_FIREBASE_APP_ID` | Required Firebase web app ID |
| `VITE_FIREBASE_STORAGE_BUCKET` | Optional SDK setting; no storage upload feature |
| `VITE_FIREBASE_MESSAGING_SENDER_ID` | Optional SDK setting; does not enable push messaging |
| `VITE_USE_FIREBASE_EMULATORS` | Only literal `true` enables emulators; requires `demo-` project; rejected in production runtime |
| `VITE_LOCAL_BETA` | Launcher sets `true` for development-only test login buttons; also requires emulator mode |
| `VITE_GA_ID` | Optional Google Analytics property, loaded only in production by dashboard analytics initialization |

Client initialization is in [firebase.ts](../src/lib/firebase.ts). Emulator endpoints are fixed at Auth 9099, Firestore 8080 and Functions 5001 on loopback. The Functions region is `asia-south1`; there is no browser variable for arbitrary API base URLs.

## Server and trusted CLI

| Variable | Scope / behavior |
| --- | --- |
| `FIREBASE_PROJECT_ID` | Vercel API runtime: real target project ID |
| `FIREBASE_SERVICE_ACCOUNT_JSON` | API runtime: full private service-account JSON string; must match project ID; never prefix with `VITE_` |
| `ADMIN_OWNER_UIDS` | Server-only comma-separated existing admin UIDs permitted to assign roles/change admins; empty means those privileged actions unavailable |
| `GOOGLE_APPLICATION_CREDENTIALS` | Local trusted scripts: path to private credential outside Git; not a Vercel API replacement for the JSON variable |
| `FIRESTORE_EMULATOR_HOST`, `FIREBASE_AUTH_EMULATOR_HOST` | Test launcher/SDK routing; trusted live scripts reject these when set |

`--cli-auth` uses the Firebase CLI login through a temporary authorized-user credential and removes that file on close. `npm run dev:api` specifically uses this mode and the original project ID, rather than selecting a target from `.env`. Firebase callable deployment uses its runtime's Admin SDK identity. No notification-provider secrets or SMTP settings exist.

The Vercel API reads `process.env` supplied by hosting; it does not load a local `.env` itself. Adding server values to the example documents the names, not a new production credential loader.

## Workflow and verification controls

| Setting | Consumer |
| --- | --- |
| `FIREBASE_ACTION`, `FIREBASE_BATCH_YEAR`, `FIREBASE_AUTH_UID`, `FIREBASE_AUTH_ROLE` | Manual cloud workflow helper; action/year/role inputs, not browser config |
| `FIREBASE_PROJECT_ID`, `FIREBASE_SERVICE_ACCOUNT_JSON` | `firebase-production` GitHub environment variable/secret for cloud workflow |
| `E2E_PORT` | Playwright server port; default 5173 directly, 5174 through Firebase test launcher |
| `E2E_FIREBASE` | Launcher marks emulator-backed browser tests |
| `E2E_REUSE_SERVER` | Reuse only when both this and `E2E_FIREBASE` equal `true` |
| `E2E_ADMIN_ONLY`, `E2E_LANDING_ONLY` | Focused test selectors set by test scripts |
| `FUNCTIONS_DISCOVERY_TIMEOUT` | Emulator launchers set 60 seconds |
| `PREVIEW_ORIGIN`, `PREVIEW_YEAR` | `scripts/preview.mjs` diagnostic preview input; not production deployment configuration |

## File configuration

| File | Meaning |
| --- | --- |
| [vite.config.ts](../vite.config.ts) | Port 5173, strict port and `/api/procedures` proxy to 5002 |
| [vercel.json](../vercel.json) | Build/output, compiled backend inclusion, share rewrites and cache header |
| [firebase.json](../firebase.json) | Rules/indexes/Storage paths, Functions build hook and static hosting fallback |
| [firebase.test.json](../firebase.test.json) | Isolated emulator configuration |
| [firestore.rules](../firestore.rules), [indexes](../firestore.indexes.json) | Database access and composite query indexes |
| [tsconfig.json](../tsconfig.json), [Functions config](../functions/tsconfig.json) | Strict browser/root checks and NodeNext backend output |
| [playwright.config.ts](../playwright.config.ts) | Desktop Chrome/Pixel 7 projects and emulator-mode frontend |

The production origin is hard-coded in social metadata/build scripts; it is not derived from a `SITE_URL` variable. Forks must review those references. No lint script, container deployment or infrastructure-as-code stack is configured.
