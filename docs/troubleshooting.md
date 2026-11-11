# Troubleshooting

[Documentation index](README.md) · [Setup](getting-started.md) · [Operations](operations.md)

These remedies follow checked-in guards and error paths. They are not claims that every failure was reproduced on every platform.

| Symptom | Check and remedy |
| --- | --- |
| Missing Firebase config / reference to `4amchanges.md` | That file is absent. Use [configuration](configuration.md); provide project ID, web API key, auth domain and app ID, then restart Vite/rebuild |
| Google popup blocked/cancelled | Allow popups for the site, retry, and inspect Firebase Auth feedback |
| Unauthorized domain | Add the exact deployed/development hostname in Firebase Authentication authorized domains |
| Existing account with another provider | Arrange authenticated account linking with the owner; do not delete/recreate the UID |
| Firestore permission denied | Check Google verification, account policy, target project, active version and deployed rules. Do not loosen rules to make a query pass |
| Missing published batch | Publish/verify the selected year in the intended project; committed JSON alone is insufficient |
| 2027 returns Home | Intended current `hiddenYears` behavior, not a failed data import |
| Missing chunk/hash/schema error | Run trusted `db:verify`; investigate incomplete/conflicting publication. Prepare a corrected immutable version rather than editing active chunks |
| Statistics work but community fails | Check `/api/procedures`, server credentials, compiled module inclusion, proxy port 5002 and index readiness |
| API 503 module loading | Run backend build and confirm `functions/lib/functions/src/http.js` plus its imports are packaged |
| API 503 configuration mismatch | Match server project ID to service account; do not use a demo project in production HTTP configuration |
| API 401/403 after access change | Sign in again, inspect current Auth/admin claim and `accountAccess`; owner setting alone grants no admin role |
| Draft/preference 409 | Reload latest state, preserve unsaved text privately and retry with the current version; do not force overwrite |
| Vote 409 or 429 | Check published state/self-vote restriction and wait for per-action throttle |
| Empty filtered page with `more:true` | Continue with returned cursor; filters use bounded scans and may match later records |
| Asked question/reply fails | Creation is retired; retained legacy branches do not enable it |
| Missing inbox follow update | Check opt-in preferences, target availability and `discoveryError`; discovery is request-driven, not push delivery |
| Running job cannot resume | A step may hold a 60-second lease. Reload after expiry; retry the same supported job, not a conflicting new publication |
| Rollback blocked | A newer publication may be active, or no prior verified version exists. Inspect the current job/version rather than overwriting it |
| Beta port conflict | Stop the existing beta/test terminal; ports 5174/9099/8080/5001/4400 must be available. Do not kill unrelated processes blindly |
| Emulator Java failure | Install Java 21+ and ensure `java -version` works in the test terminal. The beta launcher also recognizes a specific optional Windows Java cache; other test launchers rely on PATH |
| Direct E2E fails connecting to Firebase | `test:e2e` starts only Vite; use `test:firebase` to orchestrate seeded emulators |
| Static preview has no community API | `npm start` is Vite preview, not API hosting. Use beta or the full configured deployment |
| Firebase Hosting returns HTML for API | Current hosting catch-all has no API rewrite; use the documented Vercel topology or deliberately configure an alternative |
| Missing nested TypeScript compiler | Run `npm ci --prefix functions`; root installation alone is not the documented two-package setup |
| Large Vite chunk advisory | Review lazy-loading boundaries; it is a build advisory, not evidence of a failed build |

For a bug report, include the failing command, Node/Java version, sanitized status/code, route, viewport and minimal reproduction. Remove tokens, source student records and service-account content. Use private reporting for security/privacy incidents.
