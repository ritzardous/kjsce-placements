# Company Procedures setup

The live app uses Firebase Authentication and Firestore on Spark, with a trusted Node API hosted alongside the frontend on Vercel. It does not require Firebase Cloud Functions or a Blaze upgrade. See [the current setup and remaining external steps](../4amchanges.md).

- `npm run dev`: normal app and API on localhost:5173, using real Google accounts and live Firestore.
- `npm run dev:beta`: isolated test backend and accounts on localhost:5174.
- `npm run procedures:deploy`: publish live rules/indexes/catalog and assign the chosen admin; no billing change.
- `npm run procedures:verify -- --project placement-stats-kjsce --allow-production --cli-auth`: read-only live setup verification.

The Node API reuses the tested transaction services in `functions/src/service.ts`. The Firebase Functions wrapper remains for isolated emulator testing. Production API credentials are server-only `FIREBASE_PROJECT_ID` and `FIREBASE_SERVICE_ACCOUNT_JSON`; Google tokens and current account status are verified before any mutation. Private submissions, revisions, limits, votes and notifications remain protected by the same rules.

Notifications are entirely in-app. Admins see the pending review badge/inbox and moderation overview; contributors and readers see updates in Company Procedures → Notifications. No email provider, sender domain, notification secrets or scheduled worker is needed.
