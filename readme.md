# Placement Stats KJSCE

React + TypeScript with cloud Firebase Authentication and Cloud Firestore. Public landing → Google-only login → Home with three placement years and separate community destinations. No Express server is required.

Preserves overview, company/branch views, candidate search, timeline, insights, source notes, styling, and hash navigation. Baseline: 100 announcements, 311 selections, 299 unique students, 82 companies. Source counters remain separate from calculated totals.

Follow [4amchanges.md](4amchanges.md) for cloud permissions, import, React startup, and testing. Use `npm install`, configure `.env` from `.env.example`, publish rules, seed/verify, then `npm run dev`.

Follow [access setup and testing](docs/access-structure.md) for Google-only access. Company Procedures now includes private Markdown drafts, submission/revision review, approved experiences, votes, an admin dashboard and in-app notifications. Follow [the beta setup guide](docs/company-procedures-setup.md) to deploy the app API, rules and indexes, seed the recruiter catalog and assign admins. Existing placement datasets do not need reimporting. Consented alumni contacts remain upcoming.

```powershell
npm test
npm run build
npm audit
```

`npm run test:firebase` uses isolated test-only emulators, Java 21, and Chromium. These are not required for normal cloud runtime. Private service-account files stay outside Git and the frontend.

AY 2024–25 (class of 2025) is also available through the year selector: 360 report selections, 323 students, with on/off-campus status and matched email dates/roles. Read [the source audit and missing-data checklist](docs/2025-data-audit.md). `npm run data:build-2025` reproduces the dataset from committed source transcriptions; import/verify commands accept `--year 2025` (default remains 2026).

AY 2026–27 (class of 2027) is available at `/#2027/overview`, explicitly marked **LIVE · Placements ongoing**: 22 announcements, 121 selections/distinct roll numbers, 19 companies. Latest supplied email: 8 October 2026. This is a reviewed cloud snapshot, not automatic email ingestion; registration total and mixed numerical CTC remain unavailable. See [the 2027 source audit and update steps](docs/2027-data-audit.md). Rebuild with `npm run data:build-2027`; seed/verify commands accept `--year 2027`.

Follow [the deployment guide](<deployment guide.md>) for Vercel setup. The owner reported the previous app deployed; this structural frontend update still needs redeployment. All three years' data are already published in cloud Firestore. See [architecture](docs/architecture.md), [operations](docs/operations.md), [migration report](docs/migration-report.md), and [future plan](plan.md).

## Local community beta

Run `npm ci --prefix functions` once, then `npm run dev:beta`. Open http://localhost:5174 and use the Contributor, Admin and Reader test buttons. This runs the full Firebase backend locally; no live account or billing setup is required. Test data resets on shutdown. Normal cloud development stays on port 5173. See [4amchanges.md](4amchanges.md) for the remaining live credentials, deployment and admin steps.
