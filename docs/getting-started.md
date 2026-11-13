# Getting started

[Documentation index](README.md) · [Configuration](configuration.md) · [Troubleshooting](troubleshooting.md)

## Prerequisites

- Node.js **22.x**, matching `.nvmrc`, package engines and CI.
- npm and committed lockfiles; install root and `functions/` dependencies separately.
- Java **21+** for Firestore emulation, unnecessary for normal cloud runtime.
- For browser tests: `npx playwright install chromium` (CI uses `--with-deps`).

Before changing code, data, rules, or documentation, read [`AGENTS.md`](../AGENTS.md). It is mandatory for all human and AI contributors, and every pull request must state whether it was followed.

## Local beta: first run

```sh
npm ci
npm ci --prefix functions
npm run dev:beta
```

Open `http://localhost:5174`. Test buttons provide contributor, reader and admin accounts. These are Google-shaped emulator sessions, gated by development mode, emulator mode and `VITE_LOCAL_BETA`, not real OAuth accounts.

The launcher builds backend code, starts Auth/Firestore/Functions for `demo-placementstats`, seeds all three batches and the recruiter directory, imports test accounts and starts Vite. It supplies demo configuration; no live `.env` is needed. Only 2025/2026 are visible because routing hides 2027. Stop with Ctrl+C; fixtures are not exported for persistence.

| Service | Address/port |
| --- | --- |
| Beta frontend | `http://localhost:5174` |
| Firestore | `127.0.0.1:8080` |
| Authentication | `127.0.0.1:9099` |
| Callable Functions | `127.0.0.1:5001` |
| Emulator hub | `127.0.0.1:4400` |

The launcher checks occupied ports and recognizes a fully running beta. Stop that terminal before integration tests. It does not stop unrelated services.

## Frontend against your Firebase project

Create a Firebase project with Firestore and Google Authentication. Authorize the actual development hostname in Firebase Authentication. Copy the example and supply the web API key, auth domain, project ID and app ID; leave emulator mode false.

```powershell
Copy-Item .env.example .env
```

After configuring rules and publishing data with [operations](operations.md):

```sh
npm run dev:web
```

Open `http://localhost:5173`. This runs Vite, generates LinkedIn mappings through its pre-hook and proxies `/api/procedures` to port 5002. It does not start the API. Statistics can use Firebase alone; community actions need a trusted server.

**Portability limitation:** `npm run dev` and `npm run dev:api` use `scripts/dev-api.ts`, explicitly targeting the original `placement-stats-kjsce` project through Firebase CLI login. Changing `.env` does not retarget this server. Authorized maintainers can run `npx firebase login --reauth`, then `npm run dev`; its pre-hook builds backend code and its launcher starts ports 5002 and 5173. Fork maintainers should use beta for full local development until deliberately configuring their own trusted server. Original-project deployment scripts are not generic setup commands.

## Verify

```sh
npm test
npm run build
```

The build generates LinkedIn mappings, compiles backend code, typechecks, builds Vite and creates share HTML. Check `git diff` for generated changes afterward. For rules/backend/browser coverage install Java and Chromium, then run `npm run test:firebase`. See [development](development.md).

Source JSON in Git does not mean your Firestore is populated. Historical deployment notes do not establish current live state. Continue with [architecture](architecture.md) and [deployment](deployment.md).
