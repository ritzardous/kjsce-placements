# Features and routes

[Documentation index](README.md) · [Authentication](authentication.md)

## Statistics

Visible choices are 2025 and 2026. Dashboards provide overview, company list/detail, branch views, candidate search, timeline, insights and exploration. Source notes and identities accompany records. Available 2026 LinkedIn profiles come from committed sources/mappings, not a live profile search.

| Batch | Committed coverage and interpretation |
| --- | --- |
| 2025 | 360 official report selections, 323 distinct students; email-enriched dates/roles; no registration denominator; overall CTC selection-weighted |
| 2026 | 100 announcements, 311 selections, 299 distinct students, 82 companies; B.Tech registration base 524; overall CTC announcement-weighted |
| 2027 | Retained/tested: 22 announcements, 121 selections/distinct roll numbers, 19 companies; hidden in routing and redirected away by `App.tsx`; no denominator |

Counts describe source coverage, not current college-wide outcomes. 2027's historical LIVE label means an ongoing source season, not automatic ingestion. Unknown/mixed CTC is excluded from numeric aggregates; unknown dates are excluded from timelines. See the [dictionary](data-dictionary.md).

## Community and administration

Contributors choose a recruiter, write in a live formatted document, select attribution and save private drafts. Submission needs a valid company, recruitment route, graduation batch year, role and at least 60 meaningful body characters beyond headings/comments. Feedback supports revision/resubmission. Readers filter approved experiences, vote, bookmark and report content. Bookmarks can indicate unavailable or updated posts.

Contributors choose On campus or Off campus before submitting. The choice is retained in private drafts, submitted revisions and approved posts; old untagged experiences remain unspecified rather than receiving an inferred route.

Anonymous attribution changes the displayed author name; ownership remains visible to the service and administrators. Owners can withdraw, hide or delete with version checks. Administrators review immutable revisions, unpublish exact revisions, resolve reports, manage accounts, inspect bounded analytics and run staged import/quality/repair jobs.

Notifications are in-app only, with categories, read/archive state, private outcomes and versioned preferences. Follows are opt-in; batch follows support 2025/2026. Discovery happens during requests, without email, push or a scheduled worker. Cleanup targets read following/statistics updates older than 90 days in bounded batches, not all history.

## Routes

Routes use URL hashes. Bare statistics routes default to 2026.

| Hash | Behavior |
| --- | --- |
| `#landing`, `#login` | Public sign-in presentation; signed-in visitors go Home |
| `#home` | Visible years and community entry |
| `#statistics` | Selected-batch shortcut or year chooser |
| `#2025/overview`, `#2026/overview` | Batch dashboards; other page names: `companies`, `company/<key>`, `branches`, `candidates`, `timeline`, `insights`, `explore` |
| `#2027/overview` | Current configuration redirects to Home |
| `#procedures` | Company/experience browsing |
| `#procedures/<postId>` | Experience reader |
| `#procedures/contribute?draft=<id>` | New editor or owner's draft |
| `#procedures/contributions` | Contributor workspace; legacy `#contributions` redirects here |
| `#account` | Account/profile workspace |
| `#admin`, `#admin/procedures` | Overview/moderation; further sections: users, data, analytics, operations |
| `#alumni` | Redirects to statistics; contact directory unavailable |

Protected deep links retain their destination during sign-in. Route guards control presentation; rules and backend checks enforce access independently.

## Unavailable and bounded behavior

- **New questions and replies are disabled.** `ask` and `answer` fail before retained implementation branches. Legacy read/report/moderation paths remain.
- No automatic email/PDF ingestion, employer verification, accepted-offer tracking or candidate-specific inference for mixed CTC.
- No attachment upload in the experience form. Markdown images become text placeholders; raw HTML is skipped.
- No alumni directory, email/push notifications, autonomous worker queue or complete infrastructure monitoring.
- Historical visual test reports are evidence, not guarantees for every device.

### Dashboard browsing

Company and candidate tables show 25 rows per page; changing a filter resets the page. Company CTC rankings use one row per employer and its highest known package, while source announcements remain separate. Recent results are collapsed until opened. Methodology and coverage notes are available at the bottom under **Data sources & limitations**. The panel closes when navigating to another page, moving focus or clicking outside it, or scrolling it out of view.

The public landing preview highlights JPMC, ION and EDRA Labs for 2026, and Browserstack, JPMC and Eventstrat Labs for 2025. Unknown roles stay unprovided. Campus labels use the source report where present; Google's off-campus display label follows maintainer clarification. This does not alter source records or historical totals.

The 3D hero uses JPMC, Barclays, Deloitte, Oracle and Capgemini, independently of the package previews. Company lists omit campus tags; opened company details retain the route labels.

### Developer note and community companies

The public `#about` page contains the project story, source limitations, privacy practices, use boundaries and the developers’ existing GitHub profiles. Section routes include `#about/privacy` and `#about/contact`. The story, developer email contacts, GitHub profiles and repository link appear before source and privacy information. A floating return link stays available throughout the page. A fixed retention policy remains a maintainer decision.

All graduation years accepted by the schema, including 2027, can contribute. In the editor, search for a company and use **Add “[name]”** if it is missing. Company creation is authenticated, rate-limited and idempotent for normalized identities. New companies carry no official placement years. The normal private-draft, submission and administrator-review process still applies.

### Writing and alumni invitations

Administrators can use **Invite an alum** on a company’s experience page or placement-detail page to share a link to `#procedures/contribute?company=KEY&name=DISPLAY_NAME`. The public invitation explains the request before Google sign-in; the same destination is retained after authentication. The editor verifies the company against its signed-in directory. Invitation links do not include draft IDs. If sharing or clipboard access is unavailable, a selectable link is shown.

The writer opens a focused document with automatic saving, live bold/italic, headings, lists, code, quotes, links, undo/redo and a reader preview. Formatting applies to selected text without exposing Markdown markers; bodies remain Markdown in storage for existing readers and drafts.

Company selection shows a logo, recorded roles and highest recorded CTC. The matching graduation batch is used when available, otherwise the latest recorded batch is explicitly labelled. A single recorded role is preselected; multiple roles offer a choice, with a custom role always available. Unrecorded companies accept a custom role without invented CTC.

Company selection is collapsed when prefilled; recruitment route, graduation batch year and role are required above the writing area. The optional title stays on the document; interview year, outcome, rounds and attribution settings live under **Optional details**. An unspecified interview year remains null; coverage and outcome remain `Not specified`. Old dated experiences still work. Device recovery copies are scoped by user and invited company to keep separate invitations from mixing writing. Publication still requires administrator approval.

**Clear** resets blog text, title, interview year, summary, coverage, outcome, rounds and public attribution. Company, recruitment route, graduation batch and role stay selected. **Save & close** keeps the draft. **Cancel & back** discards this editing session: a new autosaved draft is removed, or an existing draft is restored to its opening contents. It waits for in-flight saves and checks versions before cleanup, retains newer changes from other tabs, and leaves published experiences intact. Cancellation also removes this draft’s device recovery copies. If cleanup fails, the editor stays open with an error.

Invitation controls are admin-only; the generated contribution link remains a public entry point for an invited author. This controls the invitation tool, not who may submit an experience or manually share a public URL.
