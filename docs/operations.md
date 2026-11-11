# Firebase operations

[Documentation index](README.md) · [Deployment](deployment.md) · [Admin workspace](admin-workspace-implementation.md)

## Select a trusted target

Most CLI maintenance uses `scripts/firebase-admin.ts`. Emulator calls require a `demo-` project. Live calls require both an explicit real `--project` and `--allow-production`; they reject emulator routing variables. `--allow-production` is a script guard, not a substitute for maintainer authorization.

Keep private service-account JSON outside Git and reference its path with `GOOGLE_APPLICATION_CREDENTIALS`. Alternatively, authorized maintainers can log in with `npx firebase login --reauth` and add `--cli-auth`; this uses temporary CLI credentials. Project mismatch is checked where supported. IAM must permit the selected operation; database/rules/Auth administration have different permissions. Never grant Admin SDK credentials through a browser environment variable.

## Placement publication

Validate source and publication generation without any database connection first:

```sh
npm run db:seed -- --year 2026 --dry-run
```

For an already-running isolated emulator:

```sh
npm run db:seed -- --year 2026 --emulator
npm run db:verify -- --year 2026 --emulator
```

For an authorized live target, replace the placeholder project:

```sh
npm run db:verify -- --year 2026 --project YOUR_PROJECT_ID --allow-production
npm run db:seed -- --year 2026 --project YOUR_PROJECT_ID --allow-production
```

Default year is 2026; supported explicit years are 2025, 2026 and 2027. Add `--cli-auth` for CLI-login credentials. Seed is a write operation: it validates source, stages immutable documents, reconciles and activates. A different active publication is refused unless the operator reviews it and supplies `--expected-version` with its exact SHA-256 ID. Re-run verification after activation.

2025/2027 datasets are rebuilt from committed transcriptions through `npm run data:build-2025` and `npm run data:build-2027`. Review diffs and source audits before publication. The data builders do not download or ingest current email. Keep compensation uncertainty, source discrepancy notes and year-specific metric policies intact. The retained 2027 publication is not currently exposed in the UI.

In-app admin imports support upload → validation/preview → bounded staging → explicit publish → guarded rollback. This is distinct from the CLI seed path and includes reasoned audit events. See [admin workspace](admin-workspace-implementation.md). Rollback verifies the previous version and stops if a newer version is active. Keep prior snapshots and source material; there is no configured scheduled backup service.

## Rules, indexes and catalog

```sh
npm run db:rules -- --project YOUR_PROJECT_ID --allow-production
npx firebase deploy --project YOUR_PROJECT_ID --only firestore:indexes
npm run procedures:seed -- --project YOUR_PROJECT_ID --allow-production
npm run procedures:verify -- --project YOUR_PROJECT_ID --allow-production
```

Rules deployment backs up prior rules under ignored artifacts and verifies release activation. Preserve backups outside an ephemeral runner. Index deployment uses Firebase CLI authorization; wait until index builds finish before validating query workflows. Catalog seed derives recruiters from the committed batches. Identity repair is separate and evidence-based; use [the quality guide](data-quality-and-ingestion.md) and [admin repair workflow](admin-workspace-implementation.md), not fuzzy merges.

## Initial administrator

Have the intended user sign in with Google once, then use their real Firebase UID:

```sh
npm run auth:set-role -- --project YOUR_PROJECT_ID --allow-production --uid FIREBASE_AUTH_UID --role admin
```

The CLI also accepts exactly one `--email` instead of `--uid`, and roles contributor/moderator/admin/none. Only admin grants moderation authority. This trusted script bypasses in-app owner/final-admin workflows, so protect its credentials and review targets carefully. Sign out/in after changing claims. Configure `ADMIN_OWNER_UIDS` separately for existing admins who may manage roles/other admins.

## Project-specific helpers

`npm run procedures:deploy` is **not portable**: it targets the original project and a hard-coded administrator email. It publishes rules/indexes, seeds the catalog, assigns that role and verifies. It does not deploy the Vercel API. Review its source before any authorized use; never invoke it as a fork's generic deployment command.

`npm run dev:api` likewise targets the original project through CLI login. `procedures:verify` accepts an explicit project but still checks a hard-coded administrator account and expected catalog entry, so it is not a generic fork health check. `cloud:firebase` is intentionally restricted to GitHub Actions; use its manual workflow rather than calling it locally. See [configuration](configuration.md).

## Operational checks

Monitor Firebase reads/errors, Auth failures and hosting costs through actual provider tools. App Operations shows jobs and sampled API failures; it is not an infrastructure-health dashboard. Confirm anonymous Firestore denial, Google deep-link return, current account suspension/revocation, draft ownership and admin-only actions after releases. `auth:verify` and `procedures:verify` are diagnostics with explicit target guards; real OAuth still needs a manual account check.
