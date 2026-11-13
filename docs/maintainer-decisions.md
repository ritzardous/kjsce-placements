# Maintainer decisions and verification limits

[Documentation index](README.md)

## Decisions requiring ownership

| Decision | Current evidence / suggested next step |
| --- | --- |
| Project license — resolved | The maintainer authorized a basic project license on 12 November 2026. Original project code and documentation now use the [MIT License](../LICENSE); package metadata, the README and contribution guidance match. Third-party assets, source data and personal records retain their separate rights. |
| Copyright and data rights | Confirm code ownership, contributor terms, student/source publication consent, profile-link policy and third-party asset permissions before declaring the whole repository freely reusable. |
| Security and conduct contacts | No dedicated contacts were established. Publish private reporting routes and responsible maintainers; do not substitute a personal address found in a setup script. |
| Support policy | Confirm supported revisions/releases, triage ownership and realistic response commitments. No SLA/support matrix was invented. |
| Project portability | Live API startup/deployment helpers target the original project; deployment and verification helpers also reference a hard-coded administrator. Confirm whether to parameterize these in a separate code change. |
| Production operations | Confirm actual Vercel install behavior for the nested Functions package, IAM, authorized domains, deployed rules/indexes, GitHub environment protection, backup retention and monitoring ownership. |
| Hidden/retired functionality | Routing hides 2027; new questions/replies are disabled. Re-enabling requires an explicit reviewed application change, not a documentation edit. |
| Privacy and retention | Define eligibility, erasure, audit/notification retention and repository visibility. Verified Google access currently has no college-domain restriction. |

The adopted [MIT license text](../LICENSE) follows the [Open Source Initiative template](https://opensource.org/license/mit). Existing [Lora OFL](../public/fonts/lora/OFL.txt) and third-party notices remain intact.

## Documentation audit: 12 November 2026

Repository inspection covered tracked source/configuration, frontend routes and providers, shared schemas/statistics, backend dispatch/services, Firestore/Storage rules, indexes, scripts, workflows, tests and existing engineering records. No repository `AGENTS.md` or checked parent instruction file was found at audit time. A binding [`AGENTS.md`](../AGENTS.md) now exists; this audit predates it. Private environment files were not copied into documentation.

Executed checks:

- `npm test`: **55 passed**, no failures/skips.
- `npm run typecheck`: passed.
- `npm run build`: passed, including LinkedIn generation, backend compilation, TypeScript, Vite and share-page generation. Vite emitted its existing large-chunk advisory. LinkedIn generation reported 24 entries needing review; this is source uncertainty, not a new documentation feature.
- Relative Markdown file links and case-sensitive path spellings: **177 links across 34 Markdown files**, no missing targets or case mismatches.
- `npm run db:seed -- --year 2026 --dry-run`: passed source/schema/statistics/publication generation; four chunks, with no database connection or writes.
- All three README badge image URLs and the configured app origin returned HTTP 200. This verifies URL reachability, not successful CI or authenticated production behavior. MIT/Apache license reference pages were also checked.

The available host ran Node **26.13.0**, while the project/CI specifies **22**. Passing local checks are not a replacement for the Node 22 CI run. Java was not available on PATH, so the full emulator/browser suite and an interactive beta launch were not run in this pass. No dependency installation, production deployment, account change or live data mutation was needed for documentation.

## Unverified external and historical evidence

Authenticated deployment behavior, actual CI status behind the badge, private vulnerability-reporting availability, external asset/source links and provider settings were not live-audited. Original PDF source documents are referenced through manifests/transcriptions but are not supplied in this checkout. Historical test counts, live catalog audits and screenshot statements in preserved design/audit documents retain their original dates and have not been rerun here. Mermaid source is included; rendering depends on the Markdown viewer and was not visually verified in this pass.

Application/runtime source, dependency manifests, lockfiles, rules and workflows are unchanged by the documentation work. Environment examples contain only safe placeholders/comments. Generated output from validation is not a deployment.

The final diff was restricted to Markdown documentation and the two environment examples; `git diff --check HEAD` found no whitespace errors. The existing root `readme.md` was renamed to `README.md` so case-sensitive documentation links resolve consistently.
