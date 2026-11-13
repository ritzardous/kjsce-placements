# Data quality, ingestion and layout repair

3 November 2026.

## Identity audit and repair

The live catalog audit found 175 entries representing 163 canonical identities. Twelve legacy IDs map to eleven reviewed identity groups in `shared/company-identity.ts`. The repair combines catalog years, uses consistent names and retains old documents as aliases. It does not delete user writing, change post IDs, rewrite immutable revisions or alter source placement statistics. The live submissions/posts audit found no invalid draft schemas or unknown company references at audit time.

The company picker, client catalog, draft validation, statistics preview lookup, company discovery and server company matching share the same identity mapping. Searching an abbreviation still finds the canonical company. Typing a replacement search clears the old selection, preventing submission to an accidentally retained company.

Do not infer identity from logos, fuzzy similarity or common parent brands. Oracle/Oracle Financial Services, ICICI AMC/life insurance, Godrej subsidiaries and hiring programmes such as TCS Ninja remain distinct unless explicitly reviewed. A later maintainer review on 14 November 2026 confirmed the Aptia, ImpactGuru, ION, Pravaayu and TransBnk pairs listed in the [catalog audit](company-catalog-audit.md). Those explicit mappings are now implemented. Colgate/Colgate Palmolive and the other unlinked identities remain separate. This is a bounded audit, not a claim that all historical facts are verified.

Reproduce the catalog audit using `npx tsx scripts/repair-company-directory.ts --project placement-stats-kjsce --allow-production --cli-auth`. Add `--apply` for the idempotent additive repair. Audit and pre-run catalog backup files are written under ignored `artifacts/`; copy a backup before another run if retaining multiple versions. No private user content is written to the report.

## Ingestion defenses

- Drafts and submissions share strict schemas: reject forged fields, invalid company path characters, oversized writing, hidden control characters and duplicate round selections. Empty company selection remains allowed for unfinished drafts.
- Trusted draft saves now verify selected company existence, and canonicalize known aliases before persistence. Submission retains catalog verification and revision checks.
- API envelope validation rejects unexpected top-level fields; HTTP and community payload size limits bound request processing. Invalid JSON, unknown actions and role/ownership failures remain server errors with useful status codes; preference conflicts return HTTP 409.
- Read filters reject unexpected fields; preferences, account sync and impact requests now explicitly validate their empty payloads.
- Existing server ownership checks, current admin verification, transaction/version checks, rate limits, server-owned fields, Firestore write restrictions and safe Markdown rendering remain in force. There is no user file-upload endpoint in the current experience form; writing is Markdown and remote images are not rendered.

No validation can guarantee that users cannot misuse an application. Remaining operational concerns include distributed rate limiting at the hosting edge and a periodic source-data review; these are not silently represented as implemented security controls.

## Pending states and alignment

Contribution updates and submission/cancel operations use a reusable contained progress panel with spinner, indeterminate progress rail, accessible status and reduced-motion treatment. Contribution cards use equal-width grid tracks, stretched row heights, bottom-aligned primary actions and consistent management rows. Mobile falls back to one column. Company options scroll within a bounded overlay, and form/preview children respect container widths.

The frontend/API changes need the normal application deployment. Catalog repair is separate from deployment; old identifiers remain readable for compatibility.

## Verification

The live repair completed successfully. Read-back verified 175 retained documents, 12 alias redirects and 163 visible canonical companies. JPMorgan has one canonical entry with years 2025, 2026 and 2027. Source statistics and user content were preserved.

Production build and 52 unit tests pass. Isolated emulator checks pass: 33 backend/rules tests and 27 desktop/mobile browser tests, with one desktop-only preview case skipped on phones. Browser checks include one JPMorgan picker result for both JP and JPMC, replacement-search selection clearing, contribution submission/review/unpublishing, company discovery and notifications. Logs and catalog backups are under ignored `artifacts/`.

## 14 November 2026 confirmed-identity follow-up

The maintainer confirmed five additional pairs: Aptia, ImpactGuru, ION, Pravaayu and TransBnk. Their mappings were deployed before the focused, hash-guarded catalog repair. Production read-back verified 175 retained documents, 17 alias redirects and 158 canonical identities; unrelated catalog names, years and aliases matched the pre-repair audit. No experience body, immutable revision or historical placement publication was rewritten. Colgate, ICICI, Oracle and Tata variants were left separate as instructed. See the [catalog audit and repair record](company-catalog-audit.md).
