# Community company details

[Database](database.md) · [Logo provenance](company-logos.md)

Community companies may have an optional `profile` in `procedureCompanies/{key}`. This supplies listing and writer context without creating placement announcements, batch years, candidate records or statistical totals. Browser writes remain denied; the normal company-creation request still accepts only a name.

The [profile schema](../shared/company-profile.ts) validates role names, an ordered annual INR CTC range in lakhs, a local logo path, an HTTPS website and `source:maintainer`. Invalid or incomplete profiles are ignored by the interface. Equal range endpoints display once: `11` to `11` becomes **₹11 LPA**. The package applies to the listed roles, not an author's custom role.

The experience company page displays these details beneath the company name. The writer shows them when there is no matching historical company snapshot and offers the listed roles alongside the custom-role option. Existing official snapshot details retain priority. A company with no visible placement years has no empty statistics dropdown.

## Wissen Technology

The maintainer supplied **Software Engineer**, **₹11–11 lakh per year**, on 14 November 2026. The reviewed input is [wissen-technology.json](../data/company-profiles/wissen-technology.json). The bundled logo is the square mark linked by [Wissen's official website](https://www.wissen.com), with asset provenance recorded in the logo manifest. These details do not establish a KJSCE placement, a graduation batch, a current vacancy or a guaranteed future package.

`npx tsx scripts/configure-wissen-company.ts --project YOUR_PROJECT_ID --allow-production` previews an update to the existing `wissen-technology` record. Add `--cli-auth` to use local Firebase CLI credentials. After inspecting the plan, an authorized apply adds `--apply --expected-hash HASH_FROM_CURRENT_PREVIEW`. It backs up the previous profile, checks the document's update time in a transaction, updates only `profile`, and verifies read-back. The company name, years and other metadata remain intact. `--emulator` uses a demo project for tests.

Deploy the app support and bundled image before the live update. To recover, inspect the timestamped backup under ignored `artifacts/` and restore only the previous profile (or its prior absence), with a current update-time guard; do not overwrite the rest of the company document.
