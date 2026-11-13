# Company catalog name audit

[Documentation index](README.md) · [Company identities](../shared/company-identity.ts) · [Operations](operations.md)

Read-only inspection of `placement-stats-kjsce`, performed on **14 November 2026 (Asia/Calcutta)**. The query read only `name`, `years` and `aliasOf` from `procedureCompanies`. It did not read student records, drafts, accounts, placement imports or published payloads. **No database records were changed.**

## Results

- 175 catalog documents inspected; none had a missing/non-string name.
- 12 documents already redirect through `aliasOf`, covering 11 reviewed company identities.
- Name comparison surfaced 27 pairs: 13 already-linked pairs and 14 unlinked comparisons. Pairs overlap, especially among Godrej and ICICI variants; they are not counts of duplicate companies.
- The unlinked comparisons are grouped below. Similarity is a review signal, not evidence sufficient for merging.

## Maintainer review, 14 November 2026

| Names in the database | Assessment |
| --- | --- |
| Aptia / Aptia India | Confirmed same identity by the maintainer; canonical key `aptia`. |
| Colgate / Colgate Palmolive | Maintainer confirmed these are different. Keep separate. |
| ImpactGuru / Impact Guru Technology Venture | Confirmed same identity by the maintainer; canonical key `impactguru`. |
| ION / ION Group | Confirmed same identity by the maintainer; canonical key `ion`. |
| Pravaayu / Pravaayu Healthcare | Confirmed same identity by the maintainer; canonical key `pravaayu`. |
| TransBnk Solutions / Transbnk Solutions Pvt. Ltd. (TBX) | Confirmed same identity by the maintainer; canonical key `transbnk-solutions`. |
| ICICI Prudential / ICICI Prudential AMC / ICICI Prudential Life Insurance | Maintainer confirmed the remaining ICICI identities are different; keep separate. The existing AMC Ltd. alias generates additional pair matches. |
| Oracle / Oracle Financial Software Services Ltd. | Maintainer confirmed these are different. Keep separate. |
| Tata Consultancy Services / TCS Ninja / Tata Motors Insurance Broking And Advisory Services Limited | Maintainer confirmed the remaining Tata-related identities should stay separate, including TCS Ninja. No new mapping is added for them. |

## Existing aliases, already linked

These physical documents are retained for compatibility; their presence is not evidence of duplicate active directory entries.

| Canonical key | Alias document keys |
| --- | --- |
| `browserstack` | `browserstack-software-pvt-ltd` |
| `edra-labs` | `edra-labs-llp` |
| `godrej-and-boyce` | `godrej-boyce`, `godrej-and-boyce-ppo` |
| `greylabs-ai` | `greylabs-ai-ahg-technologies-private-limited` |
| `icici-prudential-amc` | `icici-prudential-amc-ltd` |
| `interactive-brokers` | `interactive-broker` |
| `jpmc` | `jp-morgan-chase-co` |
| `loylty-rewardz` | `loylty-rewardz-mngt-pvt-ltd` |
| `ncsi-technologies-india` | `ncsi-technologies-india-private-limited` |
| `nouryon-chemicals` | `nouryon-chemicals-india-private-limited` |
| `synergetics-it-services-india` | `synergetics-information-technology-services-india-pvt-ltd` |

## Scope and reproducibility

The read-only [audit command](../scripts/audit-company-names.ts) checks reviewed canonical keys, existing alias links, normalized names, legal suffixes, close spelling, shared prefixes/tokens and acronym/programme variants. It refuses catalogs above 5,000 documents and does not support `--apply`. The full machine-readable result is written locally to ignored `artifacts/company-name-audit.json`.

This is a catalog-name audit, not an audit of every employer name embedded in immutable historical placement payloads. Acronyms, unrelated trading names and ownership changes can evade name matching. A repair requires reviewed source evidence, an explicit identity mapping and separately authorized mutation; this audit supplies none of those automatically. Live state can change after this inspection.

## Approved five-identity repair

The five confirmed mappings are recorded in `shared/company-identity.ts`. Existing experience IDs, draft bodies, immutable revisions and historical publications stay untouched. Writer context combines recorded roles and announcements across those aliases without rewriting the verified dashboard.

Deploy the updated frontend and API before applying catalog aliases, so existing saved alias keys remain accepted. The focused `scripts/repair-reviewed-company-aliases.ts` command previews exactly these ten documents and combines their catalog years. Applying requires the exact current preview hash, creates a field-level backup, checks document update times transactionally, and verifies the result. It changes only canonical name/years/alias metadata; legacy documents remain as redirects. A live dry run has been inspected; no live repair has been applied yet.
