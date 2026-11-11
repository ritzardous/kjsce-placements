# Deployment

[Documentation index](README.md) · [Configuration](configuration.md) · [Operations](operations.md)

## Build artifact

Use Node 22 and install both packages:

```sh
npm ci
npm ci --prefix functions
npm test
npm run build
```

The build regenerates LinkedIn mapping, compiles the backend into `functions/lib/`, typechecks, emits Vite output to `dist/` and generates share-page HTML plus a hash-named preview image. Vercel's entry point imports `functions/lib/functions/src/http.js`. A frontend-only build without compiled server files cannot serve community actions.

`npm start` previews static output on loopback; it does not launch the production API. Do not use it as a complete production service.

## Vercel production topology

[vercel.json](../vercel.json) selects Vite, `npm run build`, output `dist`, and includes `functions/lib/**` with `api/procedures.mjs`. Configure the installation environment to install both lockfile trees; the checked-in build command itself does not run `npm ci --prefix functions`. CI explicitly installs both. Confirm the host's actual install behavior rather than assuming the nested compiler exists.

Set required browser `VITE_FIREBASE_*` values at build time; set `FIREBASE_PROJECT_ID`, private `FIREBASE_SERVICE_ACCOUNT_JSON` and optional `ADMIN_OWNER_UIDS` in server hosting. The API rejects a demo project or a service account whose project ID differs. Google authorized domains must include the actual deployment hostname.

`/share` and `/share/` resolve to generated `share/index.html`. A catch-all serves the SPA while excluding API/assets/social paths; share responses use revalidation cache headers. Social metadata uses the original production origin in `index.html` and `scripts/build-social-pages.mjs`. Forks need to review those hard-coded URLs before release.

## Backend/database release ordering

1. Review schemas, rules, indexes and required server settings. Confirm the target Firebase project and credential authority.
2. Deploy reviewed rules and composite indexes to that project. Wait for index readiness; rules changes can affect old clients, so coordinate compatibility.
3. Seed or reconcile the recruiter catalog and required placement publications using explicit-target operations. Existing data need not be blindly reimported.
4. Deploy compiled API and frontend with matching configuration. Configure owner UIDs only for existing authorized admins.
5. Test signed-out landing/no private reads, Google popup login/deep-link return, both visible batches, draft save/submit, review, voting and inbox. Verify ordinary users cannot access private/admin state.
6. Sign out/in after claim changes. Inspect failed jobs and private hosting logs without copying credentials or student data into public reports.

No live deployment or account change is performed by writing these docs. Existing dated cloud observations need a fresh audit.

## Firebase alternatives

`firebase.json` contains static hosting and Functions configuration, but its hosting rewrites send **all** paths to `/index.html`; there is no `/api/procedures` backend rewrite. A plain Firebase Hosting deployment is therefore not equivalent to the Vercel production topology. The production browser selects HTTP `/api/procedures`, not callables. A complete alternative needs an explicitly configured backend route/transport and host review.

The callable wrapper is actively used by isolated emulators. Deploying it as a production service can have separate billing/IAM requirements; this repository does not establish that a live Functions deployment is configured. Storage rules deny all operations.

## CI and manual cloud workflow

[Verification CI](../.github/workflows/ci.yml) runs on pushes/PRs with Node 22, Java 21, both dependency installations, unit tests, build, Chromium installation and full emulator checks.

[Cloud maintenance](../.github/workflows/firebase-cloud.yml) is manually dispatched against the `firebase-production` environment. It accepts verify/rules/publish/set-role, batch 2025/2026/2027 and optional UID/role. Configure the environment project variable and service-account JSON secret, and any desired required reviewers in GitHub settings. The file alone does not establish environment protection. Production maintenance is serialized with no cancellation. The helper writes a temporary credential and removes it after execution.

## Recovery and limits

Use a prior frontend/API deployment for code rollback, keeping database contract compatibility in mind. Restore placement data with the admin import job's guarded rollback, or a reviewed explicit expected-version publication; do not overwrite immutable chunks. Rules tooling saves prior rules in ignored artifacts. Retain backups outside ephemeral runners and verify restoration before relying on them.

No container images, automatic production deploy workflow, database backup schedule, edge rate limiter or availability monitor is configured in the repository. See [security](security.md) and [maintainer decisions](maintainer-decisions.md).
