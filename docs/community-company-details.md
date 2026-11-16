# Community company details

[Database](database.md) · [Logo provenance](company-logos.md)

Community companies may have an optional `profile` in `procedureCompanies/{key}`. This supplies listing and writer context without creating placement announcements, batch years, candidate records or statistical totals. Browser writes remain denied; the normal company-creation request still accepts only a name.

The [profile schema](../shared/company-profile.ts) validates role names, an ordered annual INR CTC range in lakhs, a local logo path, an HTTPS website and `source:maintainer`. Roles may be empty or omitted when unknown; the reader defaults them to an empty array and the interface says **Role not specified**. Invalid profiles are ignored. Equal range endpoints display once: `11` to `11` becomes **₹11 LPA**. Optional `ctcEstimated:true` prefixes the amount with **Estimated**. A profile with known roles does not assign its package to an author's different custom role; with unknown roles, the figure remains company-level context and the writer still has to enter their actual role.

The experience company page displays these details beneath the company name. The writer shows them when there is no matching historical company snapshot and offers the listed roles alongside the custom-role option. Existing official snapshot details retain priority. A company with no visible placement years has no empty statistics dropdown.

## Wissen Technology

The maintainer supplied **Software Engineer**, **₹11–11 lakh per year**, on 14 November 2026. The reviewed input is [wissen-technology.json](../data/company-profiles/wissen-technology.json). The bundled logo is the square mark linked by [Wissen's official website](https://www.wissen.com), with asset provenance recorded in the logo manifest. These details do not establish a KJSCE placement, a graduation batch, a current vacancy or a guaranteed future package.

`npx tsx scripts/configure-wissen-company.ts --project YOUR_PROJECT_ID --allow-production` previews an update to the existing `wissen-technology` record. Add `--cli-auth` to use local Firebase CLI credentials. After inspecting the plan, an authorized apply adds `--apply --expected-hash HASH_FROM_CURRENT_PREVIEW`. It backs up the previous profile, checks the document's update time in a transaction, updates only `profile`, and verifies read-back. The company name, years and other metadata remain intact. `--emulator` uses a demo project for tests.

Deploy the app support and bundled image before the live update. To recover, inspect the timestamped backup under ignored `artifacts/` and restore only the previous profile (or its prior absence), with a current update-time guard; do not overwrite the rest of the company document.

## Additional community listings: 16 November 2026

The maintainer-requested inputs are preserved in [community-additions-2026-11-16.json](../data/company-profiles/community-additions-2026-11-16.json):

| Company | Listing context |
| --- | --- |
| Gracenote (Nielsen) | ₹16 LPA, maintainer-supplied; role unspecified |
| InTrade Systems | Estimated ₹12–14 LPA, explicitly uncertain; role unspecified |
| Marico Limited | No salary or role supplied |
| Morgan Stanley | ₹25 LPA, maintainer-supplied; role unspecified |
| Magellan | ₹6–8 LPA; Full Stack Engineer |

These are community catalog entries, not new placement announcements. New entries have `years:[]` and `source:community`; known years on existing records are preserved. Neither the amounts nor the entries contribute to any batch statistics. Logos come from the separate bundled brand manifest. Writers can find all five in the company picker and must supply their own recruitment route and graduation year; a listed role is company-level context, not a claim about a particular placement.

Preview only the five fixed entries with:

```sh
npx tsx scripts/configure-community-companies.ts --project YOUR_PROJECT_ID --allow-production
```

Use `--cli-auth` for existing Firebase CLI credentials, or `--emulator` with a `demo-` project for isolated testing. After reviewing the preview, an authorized apply adds `--apply --expected-hash HASH_FROM_CURRENT_PREVIEW`. The hash includes the project, reviewed inputs, prior data and update times. One transaction refuses changed or mismatched identities, creates missing entries or updates only supplied profiles, preserves existing years/metadata and verifies read-back. It never renames or merges companies. A timestamped backup is saved under ignored `artifacts/`; recovery must check for later changes and references before removing a newly created company.

Deploy the compatible profile reader and logo assets before applying these profiles live. Existing Wissen profiles need no migration; the new optional estimate flag and empty-role support are additive. No browser write permission, public creation payload, index or security rule changes are required.

### Release verification

On 16 November 2026, the compatible frontend was deployed through the existing Vercel integration before the guarded apply created all four listings in `placement-stats-kjsce`. Their names, empty year lists, community source and supplied profiles were verified by read-back. Marico and Morgan Stanley initially had no salary profile; the maintainer subsequently supplied Morgan Stanley's ₹25 LPA company-level figure, with its role remaining unspecified. Marico still has no salary profile. All six new logo assets were fetched from the production origin and matched their committed file hashes. Catalog salary context does not change any placement statistics.

Local verification passed 87 unit tests, two guarded catalog-update emulator tests and six desktop/mobile browser checks covering existing Wissen compatibility, new listing search, estimate/unknown-role labels, every 2027 logo, native optional-details expansion and layout from 320px upward. The production build passed with its existing bundle-size advisory. Live Google sign-in was not exercised, and these focused checks do not establish a clean full-suite result.

### Magellan follow-up — 16 November 2026

The compatible frontend was pushed as commit `aea0988` and observed on `kjsce-placements.vercel.app` before the guarded update created `procedureCompanies/magellan` in `placement-stats-kjsce`. The transaction read-back verified the supplied Full Stack Engineer role and ₹6–8 LPA company-level context, `years:[]`, and `source:community`. The bundled Magellan logo is served from production and matches the committed asset. This listing is not a placement announcement and contributes no placement statistics.

`npm test` passed all 87 unit tests, `npm run typecheck` passed, and `npm run build` passed with its existing bundle-size advisory. `npm run test:firebase` could not start because Java is unavailable; the emulator and browser suites were not run for this follow-up.
