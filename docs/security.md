# Security architecture

[Documentation index](README.md) · [Reporting policy](../SECURITY.md) · [Authentication](authentication.md)

## Trust boundaries

The browser, its environment variables, route state, Markdown and all submitted JSON are untrusted. Firestore rules protect direct SDK access. The API verifies identity and current account policy, then uses Admin SDK privileges that bypass rules. Trusted scripts and hosting credentials can also bypass browser rules; their IAM/configuration are critical boundaries.

| Boundary | Implemented controls | Limits |
| --- | --- | --- |
| Public → protected UI | Verified Google route/repository checks | UI is not an authorization authority |
| Browser → Firestore | Verified provider/email, account policy, active-version and ownership checks; default deny | Rules deployment and IAM must be verified live |
| Browser → API | Revocation-aware ID-token verification, current account/admin checks, strict envelope/body bounds | No configured App Check or edge-wide rate limiter |
| Writing → published content | Strict schemas, immutable submission revisions, admin review, safe Markdown rendering | Review does not prove factual accuracy |
| Concurrent mutations | Transactions, expected versions/revisions, rate-limit records and request IDs where supported | Not every operation is idempotent |
| Publication → dashboard | Reconciliation, immutable chunks, bounded reads, SHA-256 and schema validation | Hashes do not certify source authenticity |
| Admin → account changes | Owner-only privileged actions, self-change/final-admin guards, audit and version checks | Trusted CLI bypasses these application workflows |

## Content handling

Experience Markdown uses react-markdown with `skipHtml`, GFM support, external links with `noopener noreferrer` and text placeholders for images. The form has no user file-upload endpoint. Schemas reject forged fields, oversized writing, unsafe company path characters, duplicate rounds and hidden control characters. Submitted custom attribution is included publicly only when selected; ownership UIDs remain stored.

Reports and outcomes are private. Legacy questions are read through server filtering to remove pending answers; normal browser direct access is denied. New question/reply creation is disabled. Notification destinations are constructed from known entity types rather than executing stored legacy links.

## Credentials and privacy

`VITE_*` values ship to the browser. Never put a service account, private key, CLI refresh token or owner administration credential there. Server credentials belong in hosting secrets; local credential files stay outside Git. Do not publish private `.env`, Firestore exports, browser traces or student identifiers in issue reports.

The repository itself contains student names/rolls, source transcriptions and linked-profile mapping. Signed-in access does not restrict eligibility to a college domain. A verified Google account can read approved/statistical content under current rules. Maintainers must confirm publication consent, retention, repository visibility and data rights separately; this code does not establish those policies.

Optional production analytics is enabled only by `VITE_GA_ID`; absence of that setting does not erase hosting/provider logs. Anonymous contribution display is not anonymous storage. Author deletion is not a complete erasure policy for audits, notifications, source records or external backups.

## Operational defenses and gaps

Application rate limits are per-user/action Firestore transactions; they do not stop all distributed abuse. Admin jobs use bounded requests, leases and checkpoints. Repairs back up changed fields and recovery refuses conflicting later edits. Production indexes, authorized domains, IAM, secret rotation, database backups, edge controls and log retention require operational management.

No repository configuration establishes complete CSP/security-header policy, scheduled backups, notification delivery monitoring, independent penetration testing or guaranteed incident response. These are verification/ownership gaps, not silently implemented controls. Configure HTTPS through the actual host and confirm it before use.

For suspected vulnerabilities use [SECURITY.md](../SECURITY.md); do not disclose exploit details or personal data in public issues. See [maintainer decisions](maintainer-decisions.md) for the missing private reporting channel and support commitments.
