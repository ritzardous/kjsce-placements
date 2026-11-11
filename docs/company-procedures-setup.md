# Company Procedures activation

[Documentation index](README.md) · [Deployment](deployment.md) · [Operations](operations.md)

The configured production design uses Firebase Authentication/Firestore plus a trusted Node API on Vercel. It does not require production Cloud Functions. Backend source under `functions/src/` is compiled and reused by the HTTP adapter; callables support isolated local tests.

## Local use

- First-time full stack: install both dependency trees and run `npm run dev:beta` on port 5174, as described in [getting started](getting-started.md).
- Original-project authorized maintenance: `npm run dev` starts Vite on 5173 and a CLI-authenticated API on 5002. This server has a hard-coded live project, so changing `.env` does not retarget it.
- Frontend-only: `npm run dev:web` needs cloud browser configuration and an independently configured API for community actions.

## Hosted activation

1. Enable Google sign-in, authorize hostnames and configure browser Firebase values.
2. Deploy reviewed rules and indexes. Wait for indexes to become ready.
3. Seed/reconcile the company directory through explicit-target `procedures:seed`. Existing placement batches do not need blind reimport.
4. Build the backend and deploy `/api/procedures` with matching server-only `FIREBASE_PROJECT_ID` and `FIREBASE_SERVICE_ACCOUNT_JSON`.
5. Assign an administrator through the trusted explicit-target role command, refresh their session, and configure owner UIDs separately if needed.
6. Verify contributor draft/submit, admin decision, approved reading, voting, reports and personal inbox; confirm owner-only/private boundaries.

Detailed commands are centralized in [operations](operations.md). The `procedures:deploy` helper targets the original project and a hard-coded admin; it configures Firebase data/access but does not deploy Vercel. The `procedures:verify` script also expects a specific admin account/catalog entry. Neither is a generic fork setup/health command.

## Notifications and retired discussions

Notifications are entirely in-app. The shared header bell opens a private inbox; moderation work queues are separate from personal unread counts. Preferences support opt-in follows and version conflict checks. Deploy notification rules/indexes before compatible API/frontend changes; no bulk history migration is required by the current compatibility reader.

No email provider, SMTP credentials, push integration or scheduled worker is configured. New questions/replies are disabled even though legacy discussion data, reports and moderation branches remain. See [API reference](api-reference.md) for the actual action surface.
