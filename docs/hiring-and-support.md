# Hiring focus and voluntary support

[Documentation index](README.md) · [Features](features.md) · [API reference](api-reference.md)

## Recruitment focus for the Class of 2027

The Company Procedures directory (`#procedures`) begins with a curated section of ongoing/upcoming companies. The section uses a flat, numbered two-column shortlist without a gradient or colored top border. Each entry opens that company's existing experience hub. The directory below still shows all published experience groups; featuring a company does not invent an experience or imply that one has been published. Home's Company Procedures card previews up to four featured companies and links to the directory.

This is team-curated recruitment context, not a live college feed, application deadline, eligibility determination or placement announcement. Placement publications and all statistical calculations are unchanged. Students should use official college announcements for dates and eligibility.

The initial selection, explicitly supplied by the maintainer, is:

| Catalog key | Company | Default status |
| --- | --- | --- |
| `magellan` | Magellan | Ongoing |
| `godrej-capital` | Godrej Capital | Ongoing |
| `sharekhan-limited` | Sharekhan | Ongoing |
| `wissen-technology` | Wissen Technology | Ongoing |

Defaults apply only to existing directory records without a `hiring` field. No new company identity is created or merged, and no production data migration is required. An explicit saved `none` removes even an initial company from the section. Malformed metadata is not featured; the API requires maintainer review before overwriting it. Ongoing companies appear before upcoming ones, then alphabetically. If there are no featured companies, the section/preview is omitted.

### Administrator workflow

1. Open **Administration → Hiring** (`#admin/hiring`).
2. Choose a company, or select a currently featured company to edit it.
3. Choose **Ongoing**, **Upcoming**, or **Not featured**, then save.

Home and the directory listen to the verified-user company directory in Firestore and update without a page reload. Listeners are cleaned up on navigation/account changes. Errors offer retry; a stale admin form must reload the status before saving. Catalog seeding now merges directory fields so it preserves administrative hiring metadata and existing profile context.

### Data and API

The optional `procedureCompanies/{key}.hiring` object is separate from `years` (historical placement coverage):

```json
{
  "status": "ongoing",
  "year": 2027,
  "version": 1,
  "updatedAt": 1794787200000
}
```

The timestamp is illustrative. The server owns version increments/timestamps. Old company records remain compatible. [company-hiring.ts](../shared/company-hiring.ts) contains the strict shared schemas and initial selection.

The existing authenticated `/api/procedures` endpoint accepts:

```json
{
  "name": "adminWorkspace",
  "data": {
    "action": "setCompanyHiring",
    "payload": {
      "companyKey": "magellan",
      "status": "upcoming",
      "year": 2027,
      "expectedVersion": 0
    }
  }
}
```

`expectedVersion=0` applies to an untouched initial/default record, not an arbitrary current version. The result is `{hiring, auditId}`; an unchanged status at the current version returns `auditId:null`. The HTTP adapter wraps it in `{data:...}`. The emulator uses the existing callable adapter.

The API checks current administrator authority through the existing account/access gate, validates the exact record key and strict payload, and transactionally compares the version, updates only `hiring`, writes a private audit record and enforces at most 30 changed statuses per administrator/minute. Missing companies return `not-found`; stale versions return `failed-precondition`; non-admin/revoked access returns `permission-denied`. Clients cannot write `hiring` directly or supply it through company creation. No Firestore rules, indexes, dependencies or authentication boundaries changed.

The browser shares the existing reviewed identity merge, preferring the canonical record's hiring metadata. This feature does not introduce identity aliases. Roll out the matching trusted API and frontend together using the existing Vercel build. Old clients ignore the optional field; rollback does not require deleting it or changing placement publications.

## Support page

`#support` is public, separate from About, and linked quietly as **Support us** in the shared footer. About's personal/contact section links to it as a donation page, before the legal notes. The page explains the work behind the project and makes contributions explicitly optional. Both “Something bigger in mind?” and “Talk to us” open an email addressed to riteshjha.exe@gmail.com and sakshamvarshney0701@gmail.com, with subject “Let's talk about sponsoring Placement Stats”.

The maintainer-supplied UPI QR is stored unchanged at [public/support/upi-qr.jpg](../public/support/upi-qr.jpg), shown without cropping, and downloadable for use in a UPI app. It is an intentionally public payment image, not a generated replacement. Verify the recipient in the payment app before confirming a transaction.

There is no payment gateway, preset amount, payment/subscription API, transaction storage, donor tracking, payment verification, receipt issuance or paid access gate. The page makes no tax-deduction/charity claim and does not promise sponsor placement or preferential moderation. Sponsorship terms are not established by a mailto link. No transfer was performed to verify the QR.

Analytics records only the ordinary bounded `/support` page context; it does not inspect the QR, record a donation amount or track a payer. Existing browser privacy/consent controls remain in effect.

## Verification

Unit tests cover initial selection, explicit removal/upcoming overrides, malformed metadata, strict update validation, forged company-creation fields and the public support route. The isolated Firebase test covers current admin authority, revocation, field preservation, concurrency, stale versions, audit records and separation from placement records. Desktop/mobile browser tests cover live cross-session changes, reader rejection, company-hub navigation, QR delivery, footer/About navigation, themes and viewport containment.

Use `npm test`, `npm run build`, and the emulator workflow in [Development](development.md). Focused browser coverage is in [hiring-support.spec.ts](../tests/e2e/hiring-support.spec.ts); it requires the same seeded demo emulators as other authenticated journeys. Production publication/deployment and real UPI recipient/payment verification are separate operations, not implied by local tests.
