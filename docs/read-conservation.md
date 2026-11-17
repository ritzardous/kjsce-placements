# Temporary read-conservation mode

[Documentation](README.md) · [Configuration](configuration.md) · [Directory publication](database.md#compact-company-directory)

Set `VITE_READ_CONSERVATION=true` at build time to enable the temporary mitigation. It is off by default. Enabling or disabling it in Vercel requires a new reviewed deployment; changing the variable alone does not alter an existing build. No production push/deployment is authorized merely by enabling this feature locally.

In this mode:

- Non-admin company directories and pickers use the bundled [company snapshot](../src/data/company-directory-snapshot.json), requiring no Firestore directory read. The snapshot contains reviewed company names, year associations and company profiles only. It is public frontend data, not an offline copy of students, contacts, drafts or experience posts.
- The shared background-sync hook does not schedule timers or focus/online refreshes. Initial page loads, explicit actions, manual retries and existing realtime document listeners remain. Authentication, revocation and ownership checks are never bypassed or cached as authority.
- Notification summaries are not requested at app startup or on cross-tab invalidations. Opening the inbox and explicit notification actions still fetch/update data. The unread badge therefore does not update automatically.
- Contribution impact aggregates load only after selecting **Load contribution impact** (or retrying a failed request).
- The administrator directory remains live. The offline snapshot makes no current hiring assertions, so unknown hiring entries are excluded from reader highlights instead of reusing historical defaults. New community companies absent from the snapshot require a later snapshot to appear in the shared reader catalog; the editor still lets a contributor create and select a company for their own writing.

The snapshot was generated from committed reviewed placement datasets and maintained company profiles, without reading production. Rebuild it explicitly with:

```sh
npx tsx scripts/build-company-directory-snapshot.ts
```

Review the resulting company-only JSON before committing. No build hook contacts Firebase or refreshes it automatically. This is a snapshot, not the current production catalog; it can omit newly created companies and does not establish current hiring status. The normal compact publication remains the authoritative live directory when conservation is off.

This does **not** make the app zero-read. Statistics, experience browsing/reading, authentication-related account checks, drafts, bookmarks, votes and notifications still require Firestore. The app has not been changed to publish protected experience/student data as static files. It cannot replenish a quota that is already exhausted, guarantee how long a remaining allowance lasts, or make each article cost exactly one total read.

Verify the enabled build in isolated emulators: no directory query for a non-admin, no startup notification summary, no timed background sync, company creation/selection still works, and normal authenticated server actions remain protected. With the flag off, live hiring and existing refresh behavior should remain unchanged. Re-enable normal mode once billing/quota capacity is available and review traffic before declaring the incident resolved.
