# Input and interaction hardening

[Security architecture](security.md) · [Development](development.md)

Review date: 16 November 2026. This is a bounded code review and regression plan, not a certification or guarantee that every vulnerability has been eliminated. Testing uses synthetic identities and isolated emulators; no live exploitation or production data mutation is part of this work.

## Plan

1. Inventory browser input, route/storage values, rendered content, HTTP/callable requests, Firestore access and privileged administrative actions.
2. Trace each input to its authoritative validator and output renderer. Validate structure, length, identifiers and business rules on the server; browser validation is only a usability aid.
3. Check ownership, current-account checks, revocation, administrator authority, rate limits and optimistic concurrency using the existing denial tests.
4. Review rich text, links and HTML rendering. Preserve contextual escaping, explicit link protocols and safe handling of pasted content.
5. Review request framing and production dependency advisories. Apply compatible security updates, retain both lockfiles and check Google sign-in after transport/header changes.
6. Add focused negative tests, run unit/backend/rules/browser checks, build the production artifact and review the scoped diff before pushing.

## Coverage matrix

| Surface | Controls to verify |
| --- | --- |
| Search, company selection, metadata and free-form writing | Bounded strings, strict payload schemas, hidden-control rejection, safe text output; searches never become executable query expressions |
| Rich editor and experience reader | Safe link protocols, skipped raw HTML, no remote user images, safe external link attributes |
| Record IDs, pagination and follows | Per-character identifier allowlist, bounded numeric cursor values and known target validation |
| Drafts, votes, bookmarks and reports | Ownership/current publication checks, server-owned metadata, throttles and transaction/version guards |
| Account/admin actions | Verified Google identity, current suspension/revocation state, current admin authority, owner/final-admin protections |
| HTTP adapter and dispatcher | POST/JSON framing, byte limits, strict envelopes, generic public errors and no credential-bearing diagnostics |
| Database and infrastructure | Deny-by-default browser writes; inspect configured headers without reintroducing the CSP/COOP settings that previously broke Google sign-in |
| Dependencies | Separate runtime audit of root and Functions packages, compatible updates and reproducible lockfiles |

## Interaction work in this pass

Phone scroll chapters must fit the usable viewport before pinning, preserve all three steps within the pinned interval, and provide manual controls if pinning is unsafe or motion is reduced. Focus styling remains visible for keyboard users while avoiding stacked hard outlines. Search inputs own a single focus treatment. Back controls retain clear labels, consistent spacing and 44px touch targets.

## Changes and dependency status

This pass consolidates strict record identifier validation across community, administrative and notification boundaries, tightens the JSON media-type check in both HTTP adapters, and adds negative regression coverage. Existing verified Google identity, current-account policy, ownership checks, server-owned fields, throttles, transaction versions, Markdown escaping and deny-by-default browser writes are preserved.

Compatible dependency updates are recorded in both lockfiles. On 16 November 2026, `npm audit --omit=dev --json` reported six moderate root runtime advisories and no high or critical advisories; the equivalent Functions runtime audit reported zero advisories. The root remainder is in the Google client dependency chain (`gaxios`, `gcp-metadata`, `google-gax`, `rimraf`, `glob`, `minimatch`). Resolving that chain needs a separately tested compatibility review rather than forced major overrides. Audit counts can change as advisories are published.

## Limits

Provider IAM, deployed rules/indexes, edge-wide abuse controls, credential rotation, backups, incident response and legal publication authority require separate operational verification. A dependency audit is a point-in-time advisory check, not proof that an affected path is reachable or that all unknown issues are absent. Do not claim the whole app is secure solely because input schemas and tests pass.

## Executed verification

| Check | Result |
| --- | --- |
| `npm test` | 84 passed |
| `npm run typecheck`, `npm run build` | Passed; build retains the existing bundle-size warning |
| Firebase rules/backend suite | 38 of 39 passed; the existing bulk notification-read test expects 50-item pages, while the baseline handler processes all eligible records up to its bound. This unrelated contract mismatch remains unresolved |
| Admin emulator suite | Eight passed |
| Focused desktop/mobile browser rerun | Six passed, four intentional project skips; covers keyboard/source navigation, all three pinned rounds at five phone sizes, and complete phone app journeys at 320/390/430px |
| Broader landing/mobile browser run | 52 passed before the final geometry and test corrections; affected failures passed in the focused rerun. The entire browser suite was not rerun after those corrections |
| Changed documentation links | 48 local file targets resolved; external destinations and anchors were not checked |
| Runtime dependency audits | Root: six moderate; Functions: zero; neither has high or critical advisories |

Tests ran with Java 21 and host Node 26; the repository targets Node 22, so this is not a separate validation on the production Node version. Emulator sign-in tests exercise the demo Google flow, not a live Google account or production deployment. No authentication provider, access eligibility or published placement dataset is changed by this work. Production IAM, credentials and deployed controls have not been certified.
