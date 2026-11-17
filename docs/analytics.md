# Product analytics (GA4)

[Documentation index](README.md) · [Configuration](configuration.md) · [Security](security.md)

The React/Vite application uses one asynchronous Google tag and manual virtual page views. Firebase Authentication, Firestore and the trusted API remain independent. Sources: [tracker](../src/lib/analytics.ts), [event boundary](../src/lib/analytics-events.ts), [React hooks](../src/lib/analytics-hooks.ts), [routing](../src/app/App.tsx).

## Property audit and `(other)` investigation

Read-only checks on 16 November 2026 established:

| Destination | Evidence | Conclusion |
| --- | --- | --- |
| Firebase-linked `placement-stats-kjsce`, **`G-QK3FD7FTJC`** | Firebase CLI web SDK configuration identified this ID. The deployed bundle configured the same ID. An isolated signed-out visit loaded one tag for it and generated one intercepted `page_view` with virtual `/landing` and `Welcome · Placement Stats`. | Verified production destination; retain it |
| Standalone **`G-C9YFLJ7WPC`** | Earlier maintainer-supplied ID, previously in the example configuration and guide. Absent from the audited entry bundle and observed tag/collection requests. | Historical alternative; not observed collecting alongside the primary in this visit |

The audited production asset was `/assets/index-NVFhln9L.js`. Collection was intercepted locally, so the audit did not intentionally send test events to Google. The checkout and production used the same environment-driven loader, with different example/deployed IDs. This is not evidence of two active integrations. Different properties keep separate datasets; their totals should not be added together.

There is no Firebase Analytics initialization or GTM container in supported application source. A dependency string mentioning Firebase Analytics does not prove `getAnalytics()` is running. A Google tag can send to the Firebase-linked stream without adding Firebase Analytics initialization. No existing Firebase functionality was removed.

The GA console could not be safely inspected through browser automation. Connected destinations, historical backup traffic, stream settings, data filters, and the Firebase Analytics-link screen remain unverified. SDK configuration identifies the Firebase-associated ID, not a complete account-level reporting audit. No production setting or property was changed.

**`(other)` is a GA4 reporting aggregation label, not an application route.** Google documents row limits and high-cardinality dimensions as causes, including in Realtime cards. Missing fields commonly appear as `(not set)`, which is a different diagnostic. Hash routing can collapse automatic tracking to `/`; it does not by itself explain `(other)`.

The observed production hit already had a valid full virtual location and fixed title. That rules out malformed location for that hit, not every signed-in event. Concrete instrumentation gaps corrected here are distinct career-explorer tab paths, experience-company query identity deduplication, explicit `page_path`, low-cardinality page context, clearing stale academic-year context, and explicit single-destination event delivery.

To diagnose the actual report:

1. Select the primary property/stream above and record the exact Realtime Pages dimension: title, path or location.
2. Inspect its data-quality indicator for aggregation/cardinality notices. Compare a short date range in Pages and screens with minimal secondary dimensions.
3. Inspect Tag Assistant/DebugView and Network: `tid`, `en`, `dl`, `dt`, `ep.section`. Expect a single view per real navigation and virtual paths below, not raw hash/query URLs.
4. If payloads are correct while reporting aggregates, investigate report limits, high-cardinality custom definitions, old traffic, connected destinations and other clients sharing the stream. Do not rewrite working routes to disguise a report limit.

The exact cause of the reported `(other)` row remains unconfirmed without report access. New code cannot relabel historical hits or guarantee removal of Google's aggregation bucket.

## Production configuration

In **GA4 → Admin → Data collection and modification → Data streams → the production web stream**, verify `G-QK3FD7FTJC`.

1. Turn **Enhanced measurement off**. Also inspect **Configure tag settings → Manage automatic event detection** and disable history page views, outbound clicks, site search, form interactions, downloads and videos. UI labels can vary. Automatic history views can duplicate manual views; automatic link/form/search events can collect sensitive URLs or text.
2. Keep user-provided data collection, Google Signals and advertising personalization disabled. Audit connected destinations and any Firebase/GTM/Vercel injection separately. Do not delete the historical property without checking its Realtime/DebugView.
3. Resolve applicable consent requirements before enabling. No consent banner is implemented; where prior consent is required, integrate a pre-boot denial as described below.
4. Configure these **Production-only** Vercel variables and redeploy the reviewed release:

   | Variable | Value |
   | --- | --- |
   | `VITE_GA_ID` | `G-QK3FD7FTJC` |
   | `VITE_GA_ENABLED` | `true` |

These are public build-time settings. The example remains disabled. Missing ID/enablement or `false` disables collection. Only production builds at exactly `https://kjsce-placements.vercel.app`, with emulators off, load the tag. Localhost, development and preview origins do not collect. A new production hostname requires an allowlist review.

The loader will not replace an existing `window.gtag` or other Google-tag script; conflicting injection stops this loader instead of adding another tracker. Failed/blocked script loads do not affect UI or Firebase. Reload after resolving a blocker to retry. `send_page_view:false` alone does **not** disable Enhanced Measurement history views, so the console step is essential. All manual events use `send_to` for the single configured ID.

## Virtual page views

| Screen | Virtual path |
| --- | --- |
| Public landing / company invitation | `/landing`, `/experiences/invitation` |
| Home / batch picker | `/home`, `/statistics` |
| Batch statistics | `/{year}/overview`, `/{year}/companies`, `/{year}/company`, `/{year}/branches` |
| Career explorer | `/{year}/explore/candidates`, `/{year}/explore/timeline`, `/{year}/explore/insights` |
| Experience directory / company / article | `/experiences`, `/experiences/company`, `/experiences/read` |
| Writing / contributions | `/experiences/contribute`, `/experiences/contributions` |
| Saved / notifications / comparison | `/experiences/saved`, `/experiences/notifications`, `/experiences/compare` |
| Account / about | `/account`, `/about` |
| Administration | `/admin/overview`, `/admin/procedures`, `/admin/users`, `/admin/data`, `/admin/analytics`, `/admin/operations` |
| Unknown destination | `/not-found` |

Years are limited to 2025–2027. Legacy candidates/timeline/insights routes use equivalent explorer paths. These are reporting labels, not new server routes. Loading/redirect placeholders are excluded; signed-out requests measure the screen actually shown. About subsections and notification preferences intentionally share their parent label.

Record identity stays in memory to distinguish company/article/branch navigation. No company/article/draft/student identifier becomes a path or event field. Different records count separate views under a shared generic label. Remounts, query-only filtering/search/pagination and autosave do not add views. Back/Forward and reloads count normally.

Views include sanitized full `page_location`, explicit `page_path`, fixed `page_title` and sanitized `page_referrer`. Every event has `section`, `instrumentation_version=2`, and `academic_year` when viewing a batch. Changing sections clears stale year context. GA's library/cookies own session IDs, first visits, new/returning visitor recognition and engagement; these are not recreated by application code or linked to Firebase UIDs.

## Product events

| Event | Trigger | Additional parameters |
| --- | --- | --- |
| `page_view` | Initial rendered screen and meaningful navigation | Sanitized location/path/title/referrer |
| `scroll` | First 90% scroll of a scrollable document per view | `percent_scrolled=90` |
| `search` | Changed nonempty query settles for 800 ms; cancelled on leaving | `search_surface`, `result_bucket`; **no search term** |
| `filter_apply` | Changed company category/salary/sort, candidate role/campus, timeline metric, or applied experience filter | `filter_name`, `filter_state`; category when known |
| `view_company` | Statistics company or experience company hub successfully loads | `company_group`, `company_category`, `content_type=company` |
| `view_experience` | Published article successfully loads | `company_group`, `content_type=experience` |
| `navigation` | Uncancelled internal link to a different virtual page | Requested `destination` section; no href/label |
| `alumni_contact` | Available candidate LinkedIn link is clicked | `action_type=linkedin`; no URL/name |
| `auth_start` | User starts Google popup sign-in | `method=Google` |
| `login` | Popup completes with a verified Google user | `method=Google`; not token refresh/restored session |
| `auth_result` | Sign-in cancellation, failure or unverified result | `method=Google`, bounded `outcome`; no error message |
| `logout` | Firebase sign-out succeeds | None |
| `writing_start` | First nonempty body edit per editor instance | None; no text/length/title/role |
| `experience_submit` | Submission API succeeds | `outcome=success`; no draft ID |
| `bookmark` | Bookmark API succeeds | `action_type=save/remove` |
| `vote` | Vote API succeeds | `action_type=upvote/downvote/remove` |
| `share` | Native share or clipboard write succeeds | `method=native/clipboard`, `content_type=experience/invitation` |
| `pagination` | Dashboard table page changes | `action_type=next/previous`; no page number |

A share is API completion, not proof of delivery. Autosaves, background refresh, keystrokes, focus, private reports and routine clicks are not tracked. Failed mutations do not emit successful events. Content-view events distinguish loaded content from a route request that fails.

Search surfaces are companies, candidates, experiences and company picker. Result buckets are `none`, `1_5`, `6_20`, `21_50`, `51_plus`. Server-paged experience counts describe the loaded window, not a global total. Restored initial text is not a new search. Rapid identical bucket events can coalesce.

Identical product events within one second are coalesced; product events are capped at 60 per minute per document. Views and one-per-view scroll are outside that cap. Loaded-content events deduplicate per record/view, including background snapshots and StrictMode. Totals measure usage, not an accounting ledger.

Company categories are `it`, `bfsi`, `core`, `consultancy`, `fmcg`, `ecommerce`, `other`, `unknown`. Company groups are the 16 reviewed identity groups in [company-identity.ts](../shared/company-identity.ts); all other/user-created names become `other_company`. No free-form company name or author/article dimension is sent.

## Acquisition and privacy

Initial external referrers retain only their origin. Same-origin and Google/Firebase auth redirects are excluded. Subsequent views reference the previous virtual page. Acquisition settings apply once, retaining normal GA session/cookie and returning-visitor behavior.

Only these exact reviewed labels are accepted from the initial URL query or hash query:

| Parameter | Allowed values |
| --- | --- |
| `utm_source` | `google`, `linkedin`, `instagram`, `whatsapp`, `telegram`, `github`, `college` |
| `utm_medium` | `organic`, `social`, `referral`, `email`, `cpc`, `paid_social`, `qr` |
| `utm_campaign` | `public_launch`, `alumni_invite`, `campus_launch`, `community_share` |

Example: `https://kjsce-placements.vercel.app/?utm_source=linkedin&utm_medium=social&utm_campaign=public_launch#landing`. These are supported labels, not evidence that campaigns have run. They map to `campaign_source`, `campaign_medium`, `campaign_name`. Arbitrary values, ad click IDs, `utm_term`, `utm_content` and raw URL queries are dropped. Referral/organic reporting remains available; untagged private-message links can legitimately be Direct. Detailed paid-click attribution and arbitrary campaign names are intentionally unsupported.

No application event sends email, Firebase UID, student/roll identity, profile URL, search text, private/editor content, draft/post ID, dynamic DOM title or sensitive query string. Advertising storage/user data/personalization are denied and Google Signals disabled. Google still receives network traffic and standard pseudonymous identifiers; this is not anonymous/cookie-free analytics or legal certification.

## Consent integration

Deployment enablement retains the existing optional-analytics model. DNT, Global Privacy Control, Google's `ga-disable-{measurementId}` flag and explicit denial suppress tracking. Signing in is not consent.

Where prior consent is required, set `window.placementStatsAnalyticsConsent = 'denied'` **before app boot** through a consent manager. This prevents loading the tag. Deliver changes with:

```js
window.dispatchEvent(new CustomEvent('placementstats:analytics-consent', {
  detail: 'granted', // or 'denied'
}));
```

Grant measures the current page without replaying earlier browsing; repeated grants do not duplicate it. Denial updates consent mode and the disable flag. Withdrawal does not erase existing cookies/events. Preference persistence, withdrawal UI and required cookie removal belong to the consent manager. Without pre-boot denial, an enabled deployment collects by default unless a privacy signal opts out. This revision adds no visible consent UI or privacy policy; maintainers must resolve consent requirements before launch.

## Custom dimensions and reports

In the **primary property**, open **Admin → Data display → Custom definitions → Create custom dimension**. Set **Scope: Event**, then use these exact parameters:

| Display name | Event parameter |
| --- | --- |
| Product section | `section` |
| Academic year | `academic_year` |
| Search surface | `search_surface` |
| Result bucket | `result_bucket` |
| Filter name | `filter_name` |
| Filter state | `filter_state` |
| Company category | `company_category` |
| Company group | `company_group` |
| Action type | `action_type` |
| Destination section | `destination` |
| Action outcome | `outcome` |
| Content type | `content_type` |
| Interaction method | `method` |

Optionally register `instrumentation_version` for rollout comparisons. Use built-in page/source/medium/campaign/session/engagement dimensions; do not register user IDs, timestamps, raw URLs or duplicate page dimensions. Custom definitions are not retroactive and generally take 24–48 hours for reporting; DebugView exposes event parameters sooner.

Suggested Explorations:

- Feature popularity: section × academic year, views, active users and engagement; filter `page_view` for view counts.
- Reading journey: `search` → `view_company` → `view_experience`, segmented by section/company group. Alumni contact is an alternative useful outcome.
- Contribution funnel: invitation/writer page → `auth_start` → `login` → `writing_start` → `experience_submit`. Use open funnels for already-signed-in alumni. Cross-session writing means this is not a deterministic submission ledger.
- Search quality: search surface × result bucket. Topics/queries cannot be inferred.
- Acquisition: built-in Session source/medium and Session campaign with engagement; inspect First user acquisition separately.

Optionally mark `experience_submit` as a key event in **Admin → Data display → Events** once verified. Do not mark every view/search/login as a key event by default.

## Verification and rollout

1. Complete stream settings, custom definitions and consent review. Confirm Vercel's primary ID and redeploy reviewed code. A local build does not deploy it.
2. In **DevTools → Network**, expect one `gtag/js` loader and collection with `tid=G-QK3FD7FTJC`, one initial `en=page_view`, sanitized `dl`/`dt` and `ep.instrumentation_version=2`. Requests can batch.
3. Open **GA4 → Reports → Realtime overview / Realtime pages**. Visit landing → sign in → 2027 Overview → Companies → company → Back → Branches → all explorer tabs. Check meaningful virtual paths. Search/pagination must not add views; opening another company hub must.
4. Enable debug mode with Tag Assistant, then open **Admin → Data display → DebugView**. Inspect debounced search, applied filters, loaded-content, alumni and authentication events. Confirm no query text, names, profile URLs, IDs or private text in parameters.
5. Exercise writing/submission/bookmark/vote/share success and failure in an isolated environment. Success events must follow successful APIs, not optimistic UI. Remounts/background snapshots must not duplicate listeners/content views.
6. Confirm no tag on localhost/previews and no events after denial. Grant should measure only the current page. Inspect both properties before retiring any account-level integration; the single inspected production visit is not a historical audit.
7. Check approved campaign links and acquisition reports after processing. Compare Realtime with Pages and screens and its data-quality indicator before treating `(other)` as a code error. Historical events will not change.

Verification for this revision: `npm test` passed 100 unit tests; `E2E_PORT=5187 npx playwright test tests/e2e/analytics.spec.ts --workers=2` passed 26 desktop/mobile runtime checks; `npm run build` passed TypeScript, backend compilation and frontend/social generation with the existing large-chunk warning. A separate production-mode build with synthetic Firebase configuration and the real Google tag generated one intercepted sanitized page view in each approved/unapproved campaign case; approved LinkedIn/social/public_launch attribution arrived as expected and synthetic private query values were absent. JSX structure/text/presentation attributes were unchanged in all eight modified UI files. Node 26.13 was used locally; CI targets Node 22. Firebase emulator regressions were not run because Java 21 was unavailable.

Unit and browser runtime checks cover route privacy/identity, event allowlists, campaign/referrer sanitization, current context, deduplication, consent and noise guards. Browser tests intercept Google traffic. Console setup, actual ingestion, signed-in production journeys and a production release require separate verification. Blockers, opt-outs and rate limits reduce counts.

## Vercel Web Analytics

The independent [Vercel adapter](../src/lib/vercel-analytics.ts) uses the official `@vercel/analytics` browser SDK from React's navigation effect. It deliberately uses `inject` and `pageview` rather than the automatic React component: this hash router needs explicit virtual views and deduplication across route-boundary remounts. No Next.js integration is used. Existing GA4 configuration, IDs and custom events are unchanged.

Automatic tracking is disabled. The adapter reuses the GA4 route mapper and in-memory navigation identity: loading/redirect screens are skipped, query-only changes and repeated effects do not create views, while visiting a different company or article does. Only the fixed virtual path is transmitted, never the company/article ID, draft ID, search query, document title, student identity or private content. No Vercel custom events are added.

The SDK's first internal manual view is cancelled before transport, then the real view is sent. This consumes its initial-referrer flag without transmitting `document.referrer`, which could contain sensitive external URL parameters. Thus Vercel external-referrer attribution is intentionally unavailable; existing GA4 acquisition reporting remains independent. The SDK still performs its standard privacy-preserving request processing; this adapter does not identify users or enable cookies.

Collection runs only in production builds at `https://kjsce-placements.vercel.app`, outside Firebase emulators. Localhost, previews, DNT, GPC and the existing `placementStatsAnalyticsConsent = 'denied'` decision suppress it. The shared `placementstats:analytics-consent` event grants/revokes collection without changing GA4's implementation. The `beforeSend` gate also checks consent when queued views are processed. No new consent UI or policy is introduced. Google-specific disable flags and GA environment variables do not control Vercel.

**Deployment:** no additional environment variables, Measurement ID, token, rules or backend changes are needed. Keep Web Analytics enabled for the existing Vercel project and deploy this release. The SDK uses the standard `/_vercel/insights/script.js` endpoint without proxies or blocker workarounds. A blocked script is not retried.

**Production verification:**

1. Use the canonical production site in a browser that permits analytics and has not denied consent. Open DevTools Network and filter `insights`.
2. Confirm one JavaScript response for `/_vercel/insights/script.js`, with `data-disable-auto-track="1"` on its script element. A response containing HTML instead means the Analytics endpoint is not active for that deployment; verify project enablement and redeploy.
3. Navigate through landing, Home, `#2027/overview`, companies, branches, career explorer and experiences. Inspect view requests: expect virtual paths such as `/2027/overview` and `/experiences/read`, without hash/query parameters or record IDs. The cancelled internal view produces no request.
4. Repeated rendering and changing only search/draft parameters must not add views. A distinct company/article navigation does add a view, grouped under the same safe route.
5. Check the project's **Analytics** dashboard after processing. Verify GA4 separately using the existing instructions above. Dashboard ingestion cannot be established by local tests.
6. With DNT/GPC or pre-boot denial, expect no Vercel script. After runtime denial, expect no further views. Blockers and opt-outs legitimately reduce counts.

Browser tests in [vercel-analytics.spec.ts](../tests/e2e/vercel-analytics.spec.ts) run the installed SDK with an intercepted transport; they send no live analytics. They verify manual tracking, privacy, deduplication, consent and blocked/development cases.

See [Vercel's official SDK options](https://vercel.com/docs/analytics/package) and [privacy documentation](https://vercel.com/docs/analytics/privacy-policy).

## GA4 references

- [Google: `(other)` aggregation](https://support.google.com/analytics/answer/13331684)
- [Google: Realtime limits](https://support.google.com/analytics/answer/9271392)
- [Google: manual views and Enhanced Measurement warning](https://developers.google.com/analytics/devguides/collection/ga4/views)
- [Google: SPA measurement](https://developers.google.com/analytics/devguides/collection/ga4/single-page-applications)
- [Google: configuration](https://developers.google.com/analytics/devguides/collection/ga4/reference/config)
- [Google: recommended events](https://developers.google.com/analytics/devguides/collection/ga4/reference/recommended-events)
- [Google: custom dimensions](https://support.google.com/analytics/answer/14240153)
- [Google: consent](https://developers.google.com/tag-platform/security/guides/consent)
