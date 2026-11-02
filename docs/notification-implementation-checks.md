# Notification implementation checks

Date: 3 November 2026. Scope: local implementation and isolated demo Firebase emulators. No production deployment or production data migration.

## Checks

- `npm test`: 50 unit tests pass, including legacy event handling, safe destinations, retired-discussion behavior and bounded opt-in preferences.
- `npm run build`: functions compilation, application type-checking and production bundling pass. Vite retains its large-chunk advisory.
- Emulator backend/rules coverage: 33 tests pass, covering recipient privacy, current admin authorization, deterministic submission/review retries, equal-timestamp pagination beyond 100 records, archive restoration, late arrivals during read-all batches, private report outcomes, following/muting, preference conflicts and retention boundaries.
- Focused Playwright coverage: 25 tests pass on desktop and Pixel 7 layouts across notifications, automatic synchronization, company directory and contribution lifecycle. It covers preview/Escape/focus (including a read item opened from an unread-only view), navigating from statistics, account switching, offline mutation recovery, cross-tab reconciliation, stale responses and bounded foreground polling. One desktop-only preview test is intentionally skipped on phones.
- Screenshots inspected locally: `artifacts/notification-inbox-desktop.png` and `artifacts/notification-inbox-mobile.png`. Both fit their viewport and retain the existing design system.

The whole browser suite was also attempted. It was not green: tests included assertions against the older dark palette, hidden 2027 views and previous chart/navigation labels. That run also exposed a minimal rules fixture leaking into discovery, a preview-control accessible-name collision, and short integration timeouts; those were corrected, and the affected company-directory, editor-preview and notification journeys pass in the focused rerun. The broad suite is not reported as passing.

The test machine initially lacked Java and the current Playwright browser binaries. A portable Java 21 runtime under the system temporary directory and Playwright's normal browser cache were used for local verification; no runtime dependencies were added to the repository.

## Reproduction

Use the existing `npm run test:firebase` command with Java on PATH and Playwright Chromium installed. It builds functions, seeds isolated demo data, runs backend/rules tests, then runs the browser suite. Never run stateful fixtures against a production project.

For a focused browser pass while the demo emulators and test frontend are running, use:

```powershell
$env:E2E_FIREBASE = 'true'
$env:E2E_PORT = '5174'
$env:E2E_REUSE_SERVER = 'true'
npx playwright test tests/e2e/notifications.spec.ts tests/e2e/procedures.spec.ts tests/e2e/company-directory.spec.ts tests/e2e/automatic-sync.spec.ts --workers=2
```

Local run logs are in the ignored `artifacts` directory. Deploy the new Firestore indexes before enabling the updated API in production; emulators do not establish production index readiness.

## Follow-up: automatic reading and theme transitions

- Opened inbox cards and preview items save read status after 500 ms of foreground visibility. Batches contain at most 50 IDs and duplicate in-flight writes are coalesced. Offscreen/unloaded items stay unread. Related links save status without delaying navigation.
- Read cards remain in their current position, including in an Unread view. Explicit Mark unread overrides automatic tracking for the current visit. Failures retain unread state and expose retry; successful reads refresh the shared badge and other tabs.
- Theme switching uses a circular view-transition reveal from the pointer or keyboard-focused toggle centre. A separate snapshot of the button gets the springy press/overshoot effect without moving its layout position. System preference, manual persistence, cross-tab synchronization, rapid toggles, reduced motion and a native-API fallback are supported.
- Follow-up verification: 33 backend/rules tests and 26 focused desktop/mobile browser tests pass; two desktop-only preview cases are skipped on phones. Browser coverage is `automatic-read-theme.spec.ts`, `notifications.spec.ts` and `automatic-sync.spec.ts`.
- Mid-transition screenshots inspected: `artifacts/theme-ripple-desktop.png` and `artifacts/theme-ripple-mobile.png`. Follow-up logs: `artifacts/opened-theme-final-checks.log` and `artifacts/opened-theme-build.log`.
