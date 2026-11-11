# Access and navigation

[Documentation index](README.md) · [Features and route map](features.md) · [Authentication](authentication.md)

The current flow is **public landing → verified Google sign-in → Home → statistics or community**. Visible statistics years are 2025 and 2026. The 2027 dataset and parser support remain, but `hiddenYears` and the application guard redirect its statistics routes to Home.

Protected deep links preserve their destination until sign-in. Bare statistics links default to 2026. Legacy `#contributions` redirects to `#procedures/contributions`; `#alumni` redirects to statistics. Company Procedures includes approved reading, private drafts, contributions, bookmarks and in-app notifications. New questions/replies are disabled. `#admin` provides the admin workspace; existing `#admin/procedures` moderation links remain valid.

## Enforce access at every boundary

The Auth provider and dashboard repository require verified Google sessions. Firestore rules independently check provider, email verification and `accountAccess` suspension/revocation policy. Only active snapshot versions are readable. Community writes use the trusted service; draft/revision reads require owner/admin, while unpublished posts require admin. Client guards alone do not protect data.

The HTTP service verifies revoked tokens and current account state. Administrative actions recheck current admin authority. Owner-only role management additionally requires `ADMIN_OWNER_UIDS`. See [authentication details](authentication.md) and [database access](database.md).

## Release acceptance checklist

1. Confirm Google is enabled and actual hostnames are authorized in Firebase Authentication.
2. Deploy compatible rules, indexes, API and frontend using [deployment](deployment.md).
3. Open the landing signed out; confirm no private placement reads.
4. Open a protected 2025/2026 deep link, sign in and confirm return to that destination.
5. Check Home, statistics, company reader, draft save/submit, contributions, bookmarks and inbox at desktop/mobile widths.
6. Confirm sign-out removes protected content and requires sign-in again; confirm a non-admin cannot use admin APIs.
7. Confirm hidden 2027 routes return Home and no unavailable alumni/discussion feature is promised.

Run `npm test`, `npm run build` and, with Java/Chromium, `npm run test:firebase`. Emulator identities do not verify real Google OAuth. Older live account audits and access test counts remain historical context in Git history, not assertions about current deployed rules/accounts.
