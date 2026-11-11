# Class of 2027 / AY 2026–27 — ongoing season

> Current visibility: the dataset is retained, but `hiddenYears` and `App.tsx` hide/redirect its statistics routes. The LIVE UI and browser checks below describe the original addition, not current availability. See [features](features.md) and [operations](operations.md).

- Source: owner-supplied `27batchemailthread.pdf`, 16 image-based pages, exported 8 October 2026 at 17:03 IST. Its SHA-256 is stored in `data/sources-2027/source-manifest.json`.
- All 22 result announcements were OCR-extracted and checked visually, including merged role cells and page continuations. Reviewed transcriptions are committed in `data/sources-2027/reviewed-announcements.json`; the PDF and intermediate OCR files are not bundled into the frontend.
- 121 candidate selections, 121 distinct roll numbers, 19 normalized companies. Every announcement's running TPO counter reconciles to the cumulative source rows; final counter: 121.
- Declared results span 22 July to 6 October 2026. The latest included email was sent 8 October 2026 at 14:42 IST; email receipt, result date, and export time are distinct.
- StoneX/Stonex share a company key. Tata Consultancy Services/TCS share a company key. Source display names and separate announcements remain preserved.
- Printed branch labels are retained, including AI & DS, CCE, EXCP and RAI. No branch is inferred from a roll-number prefix.
- Registration denominator is missing. Placement rate and unplaced count remain unknown; the 2026 denominator is not reused.
- Three announcements have mixed CTC: TCS Prime/Digital (9.00/7.09 LPA), KPMG DSSI/CRC-CST (6/5 LPA), and Deloitte A&A/Other (6.71/7.6 LPA). Preserve package text, exclude these announcements from single-value numerical aggregates, and do not infer individual package assignments. This excludes 52 selections from numerical CTC views.
- The merged KPMG CRC/CST cell retains both role labels together for rows 1–9; rows 10–13 explicitly say Tech Transformation - DSSI. Deloitte's Analyst role spans all 32 rows across pages.
- Transbnk `10:00 LPA` Think 360 `09:50 LPA`, and LogiNext `11:00 LPA` are transcribed as 10.00, 9.50, and 11.00; the printed strings and interpretation notes remain attached to their records.
- The overview retains announcement-weighted averages, as in the 2026 email dashboard; branch averages remain selection-weighted. Highest known single-value announcement CTC: 31.79 LPA. These calculations are not official college averages.
- The 100+ milestone poster adds no separate selections or announcement.

## Meaning of LIVE

- LIVE identifies the ongoing season, not automatic ingestion of college email.
- A persistent banner shows ongoing/provisional status, latest included email, latest declared result, and a refresh action on every 2027 section.
- Refresh loads the latest reviewed publication from cloud Firestore. New emails still need a reviewed import; no fabricated updates are generated.

## Updating and testing

1. Review new source announcements, preserve file/page references, and append or correct the transcription. Deduplicate messages/corrections; never append the same result twice. Update source manifest dates and metadata notes to the actual new coverage.
2. Run `npm run data:build-2027`, `npm test`, and `npm run build`. Counter discrepancies intentionally stop the build for review; document legitimate discrepancies before changing the reconciliation policy.
3. Run `npm run db:seed -- --year 2027 --dry-run`.
4. With Admin credentials configured outside Git, publish using `npm run db:seed -- --year 2027 --project placement-stats-kjsce --allow-production`, for the first publication. For later updates, review the active version ID in Firestore `batches/2027`, then append `--expected-version CURRENT_ACTIVE_VERSION_ID` to the seed command. Activation refuses to overwrite an unexpected version; the previous immutable version remains available for a controlled rollback. Then verify using `npm run db:verify -- --year 2027 --project placement-stats-kjsce --allow-production`.
5. Verify the dataset through unit/publication checks. Current `/#2027/overview` redirects Home because this year is hidden. If maintainers deliberately re-enable it in a separate application change, check the live banner, source dates, counts, companies, branches, candidate search, timeline, year switching and mobile layout. `PREVIEW_YEAR=2027` is accepted by `scripts/preview.mjs` but does not bypass route guards; the Firebase runner still seeds the fixture.
6. Deploy frontend changes through the existing Vercel workflow. Publishing Firestore data does not deploy the React year selector. Future data-only updates do not require a frontend rebuild unless schemas or UI change.

Keep the ongoing label until the owner supplies evidence that the season has ended; do not infer completion from inactivity.

## Verification for this addition

- All 19 unit/publication/statistics checks passed, including 2025/2026 regression checks and new 2027 reconciliation checks.
- TypeScript and production build passed. The existing bundle-size warning remains.
- Reviewed 2027 data was staged, activated, and fully reconciled in the live Firebase project using the existing immutable publication pipeline.
- All seven dashboard routes rendered against real cloud Firestore at desktop and mobile widths without browser exceptions or horizontal overflow.
- Additional cloud browser checks passed for live status/source date, exact selection totals, company links, reload, refresh, switching all three years, and absence of live labels on historical batches.
- The isolated emulator browser suite has a new 2027 workflow check and fixture seed for future CI runs; that full suite was not run for this addition. No Firestore or Storage security rules were changed.
- Frontend deployment remains through the owner's existing Vercel workflow; publishing data alone does not deploy the new React UI.
