# Google Analytics 4

[Documentation index](README.md) · [Configuration](configuration.md) · [Security](security.md)

The app is React/Vite with hash routing, not Next.js. It uses one asynchronous Google tag, managed in [analytics.ts](../src/lib/analytics.ts) and called by [App.tsx](../src/app/App.tsx). Firebase Authentication, Firestore and the trusted community API are independent of this integration. There is no Firebase Analytics initialization or Google Tag Manager container in the supported application source.

## Production setup

Before enabling collection, open Google Analytics **Admin → Data collection and modification → Data streams → the web stream for `https://kjsce-placements.vercel.app`**. Confirm measurement ID `G-C9YFLJ7WPC`.

1. Turn **Enhanced measurement off** for this stream. Also inspect **Configure tag settings → Manage automatic event detection** and disable history page views, outbound clicks, site search, form interactions, downloads and video detection. Labels can differ across Google interfaces. This implementation sends its own page views and 90% scroll events. Automatic link/form tracking could expose profile URLs or user-entered text; automatic history tracking could duplicate views.
2. Leave user-provided data collection, Google Signals and advertising personalization disabled. Do not add a second tag through Firebase Analytics, GTM, Vercel injection or another script. Audit any connected tag destinations separately.
3. Confirm the applicable analytics notice and consent requirements before enabling. There is no consent banner in this repository; this change adds no visible UI or new privacy policy. If prior consent is required, integrate a consent manager before enabling, as described below.
4. In **Vercel → Project → Settings → Environment Variables**, set these for **Production only**, then redeploy:

   | Variable | Value |
   | --- | --- |
   | `VITE_GA_ID` | `G-C9YFLJ7WPC` |
   | `VITE_GA_ENABLED` | `true` |

Both values are public build-time settings, not credentials. An existing `VITE_GA_ID` alone no longer enables collection. Set `VITE_GA_ENABLED=false` and redeploy to disable it. No server secret, Firebase measurement setting, Next.js package or dependency is needed.

The tag loads only in production builds at exactly `https://kjsce-placements.vercel.app`, with emulator mode off. Localhost, development, preview deployment URLs and other origins do not collect, even if the ID is present. A future production domain change requires updating the origin allowlist. Google stream settings cannot be inspected or changed using a measurement ID alone; a property administrator must complete the steps above.

## Events and data boundaries

| Event | Behavior |
| --- | --- |
| `page_view` | Initial rendered page and subsequent hash navigation; duplicate renders/remounts and query-only filter changes do not add views; Back/Forward between distinct page labels does |
| `scroll` | Once per measured page, after reaching 90% of a scrollable document |
| GA4 automatic events | The Google library manages users, sessions, first visits and engagement; these are not recreated by application code |

`send_page_view:false` disables the configuration page view. **It does not disable Enhanced Measurement history events**, which is why the property setup above is required. Page context is updated before each manual view, so subsequent engagement has the same sanitized location/title.

Analytics uses virtual page paths such as `/landing`, `/home`, `/2027/overview`, `/2027/company`, `/experiences`, `/experiences/contribute`, `/experiences/read`, `/account` and `/about`. These are reporting labels, not new application routes. Company IDs, experience IDs, author names, account identifiers, draft IDs, search/filter strings, editor contents and actual document titles are never included by application tracking. Individual companies and experiences intentionally share a page label, but navigating between distinct records still counts a view. Record identity is used only in memory for deduplication and is never sent to GA. About subsections share `/about`. The signed-out landing screen is measured as landing, rather than as the protected destination requested by its URL. Loading/redirect placeholders are excluded.

Initial external referrers retain only their origin; authentication callbacks and same-origin referrers are excluded. Subsequent views reference the preceding virtual page. Raw landing URL queries, UTM fields and advertising click IDs are not forwarded by this implementation. Referral/organic attribution can still use referrer origins, but granular campaign/paid-click attribution is limited intentionally. Do not put personal information into campaign tags or hostnames. Google receives network requests and uses its standard analytics identifiers; this is not anonymous, cookie-free analytics or a guarantee of legal compliance.

There are no user IDs, user properties, form-value events, profile click events or successful-write events. A page view does not prove a database read, published experience or successful authentication. Blockers, privacy choices and network failures reduce counts. Optional analytics failures never alter the app UI or Firebase workflow.

## Consent integration

The existing optional-analytics model is retained behind explicit deployment enablement; consent is not inferred from signing in. The loader honors `navigator.doNotTrack`, Global Privacy Control, Google's `ga-disable-G-C9YFLJ7WPC` flag and an explicit consent denial. Advertising storage, advertising user data and advertising personalization are denied; Google Signals are disabled.

For a consent manager, set `window.placementStatsAnalyticsConsent = 'denied'` **before the app boots** to prevent even loading the tag until permission is granted. Deliver changes through:

```js
window.dispatchEvent(new CustomEvent('placementstats:analytics-consent', {
  detail: 'granted', // or 'denied'
}));
```

A grant measures the current page rather than replaying earlier browsing. A denial updates Google consent mode and the Google disable flag, preventing further collection; it does not erase past events or cookies. A consent manager owns persistence, withdrawal UI and any cookie removal required by policy. Without a pre-boot denial, an explicitly enabled deployment loads analytics by default unless a privacy signal opts out. Maintainers must resolve jurisdiction-specific consent requirements before rollout.

## Verification

1. Complete stream settings and deploy with Production environment values above. Visit the canonical HTTPS site in a browser without an analytics blocker or enabled privacy opt-out. Do not enter real personal information for testing.
2. In browser DevTools → Network, filter `gtag/js`: there should be one loader for `G-C9YFLJ7WPC`. Filter `collect`: GA4 requests should include `tid=G-C9YFLJ7WPC` and `en=page_view`. Inspect `dl` (location), `dt` (title), and `dr` (referrer): they must contain only the documented sanitized context. Requests may be batched.
3. Open **Google Analytics → Reports → Realtime overview**. Within a few minutes, check an active user and `page_view` in Event count by Event name. Open its details and inspect page location/title where available. GA4 Realtime reports may aggregate and are not an exact per-click counter.
4. Sign in, choose 2027 and navigate Overview → Companies → Back. Confirm those virtual paths appear. Re-rendering a page or changing a search filter should not add a new view. Opening another company should add a view under the same generic company label. Reloading the page should also add a view. Scroll to 90% on a long page and check `scroll`.
5. Check acquisition/referral reporting after processing. A manually pasted URL can legitimately be Direct; query campaign attribution is deliberately omitted. For detailed sequencing, use Google's Tag Assistant to enable DebugView and inspect **Admin → Data display → DebugView**; application code does not enable debug events for all users.
6. On localhost and Vercel previews, confirm there is no Google tag request. For denial testing on production, set the pre-boot denial using a consent manager, or dispatch the denial event and confirm subsequent navigations stop generating collection requests. Revoke test consent when finished.

Automated checks cover environment gates, privacy-safe route mapping, access states, referrer stripping, deduplication, back navigation and scroll counts. Controlled browser checks can intercept the Google script so no test traffic reaches GA. Actual property ingestion, stream settings, filters and Realtime visibility require access to the GA account and cannot be proven by a local build.

## References

- [Google: manual page views and Enhanced Measurement warning](https://developers.google.com/analytics/devguides/collection/ga4/views)
- [Google: single-page application measurement](https://developers.google.com/analytics/devguides/collection/ga4/single-page-applications)
- [Google: configuration reference](https://developers.google.com/analytics/devguides/collection/ga4/reference/config)
- [Google: Enhanced Measurement settings](https://support.google.com/analytics/answer/9216061)
- [Google: consent integration](https://developers.google.com/tag-platform/security/guides/consent)
