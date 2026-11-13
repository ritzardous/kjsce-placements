# AGENTS.md

**Binding instructions for every AI coding agent working in this repository.**

This file applies to any agent, assistant, or automated contributor — Codex, Claude, Copilot, Cursor, Gemini, or any other tool. It is not advisory. If you cannot follow it, stop and say so before changing files.

---

## 1. Read order and authority

Read these before editing anything:

1. `AGENTS.md` (this file)
2. `README.md`
3. `docs/README.md`
4. The specific guide for the area you are changing, usually `docs/architecture.md`, `docs/development.md`, `docs/security.md`, `docs/database.md`, or `docs/api-reference.md`

Rules of precedence:

- This file overrides general agent defaults, personal habits, and generated suggestions.
- Repository documentation overrides assumptions you bring from other projects.
- If this file and another document disagree, stop and ask the maintainer; do not silently choose one.
- Inspect the affected source, tests, rules, and configuration before proposing a change. Do not edit from memory or from the README alone.

Agents must not treat ignored directories (`dist/`, `functions/lib/`, `artifacts/`, `test-results/`, `node_modules/`) as supported source. They are generated or local state.

---

## 2. What this project is

Placement Stats KJSCE is a source-backed placement statistics and reviewed-experience application for KJSCE students.

| Area | Implementation |
| --- | --- |
| Interface | React 19, TypeScript, Vite 8, CSS, hash-based routing |
| Identity | Firebase Authentication, Google-only, verified accounts |
| Data store | Cloud Firestore on the Spark plan |
| Community mutations | Trusted Node HTTP handler at `/api/procedures`, hosted on Vercel |
| Local backend | Firebase Auth/Firestore/Functions emulators with demo accounts |
| Statistics delivery | Immutable Firestore publications verified with SHA-256 |
| Hosting | Vercel for the built frontend and API; `firebase.json` also contains a static Hosting configuration |
| Verification | Node test runner through `tsx`, Firebase rules/backend tests, Playwright desktop and mobile |

Non-negotiable architectural facts:

- Statistics reads go directly from the browser to the active Firestore publication. They do **not** call the community API.
- Community writes go through the trusted Node API in production. Browser Firestore writes are denied except for the owner's constrained `users/{uid}.displayName` profile field.
- `functions/src/index.ts` callable wrappers exist for isolated emulator testing. Production does **not** require Cloud Functions or a Blaze upgrade.
- Placement data is published as immutable `batches/{year}/versions/{sha256}` documents with `views/chunk-####` payloads. The original source records live under private `imports/` paths.
- The 2027 dataset and routes are retained but hidden by current routing. Do not "fix" that without an explicit product decision.

If a task appears to require changing one of these facts, treat it as an architecture decision and ask first.

---

## 3. Hard stops

Do not do any of the following unless the human explicitly authorizes it for the exact target and you have verified the target:

- Commit or print credentials, tokens, private keys, service-account JSON, `.env` values, student records, or private exports.
- Run production mutations: `npm run db:seed`, `npm run db:verify` against live data, `npm run db:rules`, `npm run procedures:deploy`, `npm run procedures:seed`, `npm run auth:set-role`, `npm run auth:verify`, or `npm run cloud:firebase`.
- Point emulator tooling at a non-`demo-` project, or point production tooling at a demo project.
- Change dependencies, lockfiles, build configuration, CI workflows, security rules, indexes, or shared schemas as an incidental part of another task.
- Edit generated datasets (`data/placements-2025.json`, `data/placements-2026.json`, `data/placements-2027.json`), the preserved legacy dashboard (`legacy/index.html`), or published Firestore payloads by hand.
- Weaken or bypass authentication, authorization, ownership checks, transaction version guards, rate limits, Zod validation, or Firestore rules.
- Merge company identities, rewrite source history, or infer missing placement facts without reviewed evidence.
- Invent features, commands, endpoints, environment variables, screenshots, benchmarks, test results, integrations, deployment status, or future plans.
- Reformat, rename, or "clean up" unrelated files. Keep diffs reviewable.
- Delete or overwrite work you did not create without inspecting it and confirming intent.
- Claim that a live deployment, data publication, account change, or external integration happened when it did not.

When in doubt, stop and ask. A blocked task is better than a silent production or data change.

---

## 4. Repository map

```text
api/                  Vercel HTTP entry point for /api/procedures
data/                 Placement JSON, source manifests, reviewed transcriptions
docs/                 Guides, audits, and historical engineering records
functions/src/        Trusted services, access checks, callable/HTTP adapters
legacy/               Preserved original dashboard baseline
public/               Logos, fonts, social artwork, patterns
scripts/              Development, source builders, and trusted maintenance
shared/               Schemas, statistics, search, identity, notification contracts
src/
  app/                Providers, routing, portal shell, navigation
  dashboard/          Publication repository and statistics views
  procedures/         Experience reader, editor, company picker, moderation UI
  community/          Paged community state and contributions
  notifications/      Inbox, preferences, shared state
  admin/              Administrator workspace
  landing/            Public scenes, archive examples, fallbacks
  lib/ ui/ styles/    Firebase/auth, reusable controls, presentation
tests/unit/           Pure domain and startup tests
tests/firebase/       Rules, transactions, publication, admin integration
tests/e2e/            Desktop and mobile browser journeys
.github/workflows/    Verification and manually dispatched cloud maintenance
```

Where changes belong:

- Shared contracts and calculations → `shared/`
- Server-only logic and authority checks → `functions/src/`
- Browser state and views → the matching `src/<domain>/` folder
- Data generation and trusted operations → `scripts/`
- Tests → the matching `tests/` layer, not beside production code unless the existing pattern says otherwise
- User-facing documentation → `docs/`, with cross-links updated

Do not put Admin SDK imports, service credentials, or server-only logic into `src/`.

---

## 5. Standard commands

Run from the repository root. All named scripts below exist in `package.json`.

| Command | Use |
| --- | --- |
| `npm ci` | Install root dependencies reproducibly |
| `npm ci --prefix functions` | Install the nested Functions package |
| `npm run dev:beta` | Full isolated demo stack on `http://localhost:5174`; the default for outside contributors |
| `npm run dev` | Original-project live API plus frontend on 5173; only when authorized for that project |
| `npm run dev:web` | Vite only on 5173 |
| `npm run dev:api` | Trusted local HTTP API on 5002 with original-project CLI auth |
| `npm run typecheck` | Strict TypeScript validation |
| `npm test` | Unit suite via `tsx --test tests/unit/*.test.ts` |
| `npm run build` | LinkedIn generation → Functions build → typecheck → Vite build → share pages |
| `npm run test:firebase` | Isolated emulators, seed/verify all batches, backend/rules and browser suites |
| `npm run test:admin` | Backend/rules checks plus focused admin browser files |
| `npm run test:landing` | Seed emulators and run the focused landing browser suite |
| `npm run test:e2e` | Direct Playwright; does not start or seed Firebase by itself |
| `npm run data:build-2025`, `npm run data:build-2027` | Regenerate datasets from committed reviewed transcriptions |
| `npm run data:linkedin` | Regenerate the candidate LinkedIn mapping |
| `npm run build:functions` | Compile `functions/src` and shared imports to `functions/lib` |
| `npm start` | Static Vite preview; does not start a production API |

There is no configured `lint`, `format`, `test:coverage`, or standalone `deploy` script. Do not pretend otherwise.

The emulator suites require Java 21+ and Playwright Chromium. If Java is unavailable, say which checks could not run; do not claim they passed.

For documentation-only changes, verify commands against source and check local links. Do not run live mutations to validate prose.

---

## 6. Coding standards

Match the surrounding code. These are the project's established expectations:

### TypeScript and modules

- Keep strict TypeScript. Do not introduce `any` to silence a real type problem.
- The repository is ESM (`"type": "module"`). Shared and server imports use explicit `.js` specifiers where the existing code does; follow the local file.
- Prefer narrow, explicit types and Zod-validated boundaries over casts.
- Keep shared contracts in `shared/`; do not duplicate schemas in the browser and server.

### React and UI

- Use function components and hooks, consistent with `src/`.
- Keep domain code in its existing folder; do not create a parallel structure.
- Preserve keyboard access, focus return, skip links, small-screen containment, reduced motion, and failed-request recovery.
- Use existing CSS tokens, classes, and theme behavior. Do not introduce a second design system or unrelated visual churn.
- Loading, empty, error, and retry states are part of the feature, not optional polish.

### Server and data

- Validate untrusted input with strict Zod schemas at the service boundary.
- Enforce ownership and current authority server-side; a route guard or hidden button is not authorization.
- Use Firestore transactions for coupled state changes and preserve version/lease guards.
- Return safe `HttpsError` codes and messages; do not leak credentials, stack traces, or private records.
- Keep server-owned fields server-owned. Never accept a role, owner UID, vote count, or publication version from a client payload.

### Documentation

- Update the relevant guide when behavior, commands, routes, configuration, or limits change.
- Use relative links and verify they resolve with the repository's case-sensitive spelling.
- Distinguish implemented behavior from planned, hidden, or experimental behavior.
- Do not add marketing claims, invented metrics, or unverified operational statements.

---

## 7. Data and publication rules

- `data/placements-*.json` files are generated artifacts of the reviewed source builders. Change the reviewed source transcription or the builder, then regenerate; do not hand-edit the output.
- The placement schema lives in `shared/dataset.ts`. Publication schemas and chunking live in `shared/publication.ts` and `scripts/publication.ts`.
- A publication is staged, verified, and activated. Never edit an active payload or chunk directly to make a check pass.
- When replacing an existing active version, pass the exact `--expected-version` after reviewing the current active version. Never guess or omit it in a live replacement.
- Preserve nulls, source notes, and batch-specific weighting. 2025 overall CTC is selection-weighted; 2026 and 2027 overview CTC are announcement-weighted, with branch CTC selection-weighted. Do not normalize them into a single policy.
- Missing registration denominators, dates, compensation, roles, and source counters stay missing. Do not infer them.
- A data correction requires evidence and a reviewed new publication. It is not a UI or test fix.
- Company identity changes require reviewed evidence in `shared/company-identity.ts`. Similar names, shared logos, or parent brands are insufficient.

---

## 8. Security and authorization boundaries

- Access is Google-only, verified-email only. Do not add another sign-in provider as an incidental change.
- The `admin` custom claim and server-side current-account checks are required for administrative actions. `ADMIN_OWNER_UIDS` is server-only and never uses a `VITE_` prefix.
- Firestore rules deny browser writes for community content, imports, jobs, audit records, notifications, and preferences. Keep it that way.
- The trusted API verifies the bearer token and the current account state before every mutation.
- Suspension and revocation must remain effective for existing sessions; do not remove the `accountAccess` checks.
- Never expose service-account JSON, `FIREBASE_SERVICE_ACCOUNT_JSON`, `GOOGLE_APPLICATION_CREDENTIALS`, or private exports to the browser.
- Security findings belong in the private process in `SECURITY.md`, not in a public issue or PR.

If a change requires altering a trust boundary, treat it as a security review item and ask the maintainer first.

---

## 9. Git, branches, commits, and pull requests

### Branches

Use a short, descriptive branch name. `codex/` is used for Codex-created branches in this workspace; there is no enforced universal prefix. Do not rewrite shared history or force-push a branch you do not own.

### Commits

- Keep commits focused and explain the observable reason for the change.
- Do not mix refactors, formatting, dependency updates, and behavior changes in one commit unless they are inseparable.
- Do not commit generated output, ignored artifacts, local credentials, or test traces.
- Inspect `git diff` after builds because source-generation hooks can update tracked mappings.

### Pull requests

Every PR must contain an explicit **AGENTS.md compliance** statement. This is mandatory. A PR that omits it is incomplete and may be returned without review.

Use the repository PR template. At minimum, include:

```md
## AGENTS.md compliance

- [ ] I read and followed AGENTS.md.
- AGENTS.md followed: Yes / No / Not applicable (explain)
- Exceptions or deviations:
- Checks not run and why:
```

Rules:

- If the answer is **No**, explain exactly what was not followed and why. Do not mark the PR ready for review until the maintainer accepts the deviation.
- If the work is documentation-only, still state **Yes** and list the link/command checks performed.
- Do not claim tests, builds, deployments, or live verification you did not perform.
- Describe rules/index/deployment ordering and rollback implications when they apply.
- Keep student records, account details, credentials, and private exports out of the PR body, screenshots, and logs.

---

## 10. Agent workflow

Follow this sequence for every task:

1. **Inspect.** Read this file, the README, the relevant guide, and the affected source/tests/rules. Search before assuming a file or feature is absent.
2. **Plan.** State the smallest change that satisfies the request. Identify data, security, and compatibility risks.
3. **Confirm ambiguity.** Ask when the request conflicts with this file, the architecture, or the data policy. Do not guess.
4. **Change narrowly.** Touch only the files needed. Preserve existing behavior outside the requested scope.
5. **Verify.** Run the smallest meaningful checks, then the broader suite when the change warrants it. Record exact results and limitations.
6. **Document.** Update the relevant guide and cross-links when behavior or commands change.
7. **Report.** List files changed, commands run, results, unverified items, and any maintainer decision still needed.

If a task requires production access, a dependency upgrade, a schema/rules change, a data correction, an identity merge, or a policy decision, stop and escalate instead of improvising.

---

## 11. Definition of done

A change is complete only when all applicable items are true:

- The requested behavior is implemented, or the requested documentation is accurate and linked.
- No unrelated files, formatting, dependencies, or generated artifacts changed.
- Authorization, ownership, validation, and transaction guards remain intact.
- Relevant unit, build, emulator, or browser checks were run, or the limitation is stated.
- Documentation and relative links match the resulting behavior.
- No credentials, private exports, student records, or sensitive values were added.
- The PR contains the required AGENTS.md compliance statement.
- Remaining risks, unverified claims, and maintainer decisions are explicit.

---

## 12. Enforcement

- Maintainers may request changes or close a PR that does not follow this file or omits the compliance statement.
- Agents must not approve, merge, deploy, or mutate production data on their own authority.
- If this file is updated, re-read it before continuing work; the latest committed version governs.
- Pointer files such as `CLAUDE.md` and `.github/copilot-instructions.md` exist only to route agents here. This file is the source of truth.

---

## 13. Questions this file does not answer

Ask the maintainer. Do not invent policy for:

- Licensing, copyright, data rights, or contributor terms
- Security or conduct contacts
- Supported releases, SLAs, or response commitments
- Production deployment authorization, IAM, billing, or provider settings
- Re-enabling hidden functionality or retired discussion features
- Privacy, retention, erasure, or repository visibility

Current known gaps are tracked in `docs/maintainer-decisions.md`.
