# In-app notification improvement plan

Date: 3 November 2026  
Status: Implemented locally on 3 November 2026, with the current-product adaptations and rollout requirements below. Not deployed.  
Scope: Notifications delivered through the application UI only. No email, browser push, SMS, external delivery provider or notification credentials.

## Findings from the current project

The React application uses verified Google authentication, Firebase/Firestore and a trusted Node API. Company Procedures already has a useful notification foundation:

- Private recipient-owned records at `procedureNotifications/{uid}/items/{id}`, with server-only writes (`firestore.rules`).
- Submission receipts, review decisions and unpublishing updates in `functions/src/service.ts`; discussion moderation, approved questions/replies and report outcomes in `functions/src/community.ts`.
- A notification page with All/Unread views, timestamps, individual read actions and a maximum 50-item displayed batch read action in `src/Contributions.tsx`.
- An exact unread aggregation through `notificationSummary`; this is separate from the admin pending-submission listener, capped at 100 and labelled `100+` (`src/AdminReviewLink.tsx`).
- Foreground/online-aware polling, retry backoff and event-triggered refresh (`src/background-sync.ts`). Notification lists and counts refresh on a 60-second base interval; paged refresh can re-fetch the previously opened window (`src/community-api.ts`).
- Existing privacy and read-operation backend tests, rules tests and browser coverage in `tests/firebase/community.test.ts`, `tests/firebase/rules.test.ts` and `tests/e2e/procedures-ux.spec.ts`.

The main limitations are discoverability outside Company Procedures, generic destinations, limited organisation and preferences, and stale/failure states that can look healthy. Unread filtering currently happens after fetching chronological records, potentially scanning up to 200 documents per API page. Existing design notes already propose several improvements; the plan below turns them into explicit deliverables without treating existing features as missing.

`src/AppUtilities.tsx` also displays short-lived action feedback. Keep that feedback coordinated with the persistent inbox: saving a bookmark should confirm immediately without creating a permanent inbox item.

## Personas and useful outcomes

Reader and contributor are behaviours of ordinary verified Google users, not separate production permissions. Admin is a privileged role. One person can have several needs below.

| Persona | Useful notification outcome | Default approach |
| --- | --- | --- |
| Student / placement-prep reader | Find an approved reply; optionally learn about relevant saved or followed experiences | Personal discussion updates on; discovery updates opt-in |
| Statistics-focused user | Discover the inbox from statistics; optionally see a meaningful update to a followed batch | No notification for every data read or background refresh |
| Contributor / experience author | Understand review feedback, revise the right submission and answer approved questions | Decisions and questions visible with a specific next action |
| Reporter / discussion participant | Track moderation outcomes without exposing private moderation details | Notify only affected participants using recipient-specific copy |
| Admin / moderator | Find pending submissions, questions, replies and reports; prioritise work | Separate operational queue counts from personal unread activity |
| Returning user / user with intermittent connectivity | Resume from a trustworthy unread state and recover failed actions | Preserve history, show stale status, retry safely |
| Signed-out visitor / user whose access was revoked | Authenticate before seeing private updates | Preserve the intended destination; clear private UI on account changes |

## Point-by-point improvements

### 1. Make the inbox accessible across the signed-in app — P0

Place one consistent bell entry in the shared signed-in header, including statistics, Home, Account and Company Procedures. Review the dashboard shell and mobile navigation as well as `Portal.tsx`; mounting a bell only in the portal must not leave statistics out. Preserve the existing `#procedures/notifications` URL for compatibility. Offer a small recent-items preview and a View all link after the shared entry works.

**Acceptance:** Every signed-in area exposes the same personal count and inbox destination on phone and desktop. Signed-out pages make no private notification requests.

### 2. Introduce a typed notification contract — P0

Add shared types and runtime validation for `schemaVersion`, `eventId`, `type`, `category`, `entityType`, `entityId`, optional `revision`/`questionId`/`reportId`, `createdAt`, `readAt` and presentation fields. Keep `read` during compatibility rollout. Types should distinguish submission receipts, decisions, questions, replies, report outcomes and optional discovery updates. Derive allowed actions from event type rather than arbitrary URLs or title matching.

**Acceptance:** All producers use one contract; old title/message/submissionId records still render. Unknown event types produce a safe fallback rather than breaking the inbox.

### 3. Send users to the exact task — P0

Replace “Open related item” with contextual actions: Review feedback, Revise experience, Read approved experience, Answer question and View reply. Implement stable question anchors and entity-aware routing. Existing service notifications fall back to the draft editor, while community notifications link to the public post; neither reliably focuses the exact discussion or report outcome. Provide a private outcome view for reporters when the reported public content is unavailable.

**Acceptance:** A changes-requested update opens the correct owner's revision and feedback; a reply opens the correct question. Deleted, hidden or inaccessible content shows an explanation and a useful return link without leaking content.

### 4. Separate unread activity from unresolved work — P0

Keep personal unread count, pending submissions, pending discussion reviews and open reports distinctly labelled. Reading a question notification must not imply the question was answered; reading a report alert must not resolve a report. Show current task status when opening historical activity so users can distinguish old decisions from the latest state.

**Acceptance:** Marking all personal updates read never reduces moderation queue totals. An already-reviewed submission opens its current status rather than offering an invalid action.

### 5. Improve the contributor review journey — P0

Include company, experience title, submitted revision, decision, a concise feedback preview and the next step. Keep submission receipts lower emphasis than changes requested, rejection or unpublishing. Preserve exact feedback in the private detail/timeline and distinguish a rejected revision from any previously approved version that remains public.

**Acceptance:** Contributors can identify what changed and what to do from the card. Review feedback is readable on mobile, and the notification preview shown to admins matches delivered content.

### 6. Make discussion and report updates specific — P0

Replace generic “Discussion reviewed” text with clear approved/hidden question or reply outcomes. Show enough approved context to identify a conversation. Keep pending text private. Tailor report notifications: reporters receive acknowledgement/outcome information; authors receive correction/removal instructions without reporter identity or unnecessary private details. Suppress duplicate notices when one person occupies multiple recipient roles.

**Acceptance:** Only approved replies reach the questioner's notification preview. Reporters can see a resolved outcome even after hiding, while authors cannot infer the reporter's identity from notification payloads.

### 7. Add useful inbox views and stable ordering — P1

Keep All and Unread; add Needs action, Contributions, Discussions and optional Following views. Define Needs action from current domain state, not unread state. Group visually by Today, Yesterday and Earlier with meaningful company/title context. Save filter and scroll position when following a link and returning. Stage newly arrived items behind a “New updates” control while the user is reading older items.

**Acceptance:** Reading does not remove an unresolved task from Needs action. New arrivals do not move focus, reorder the active reading position or discard the selected filter.

### 8. Add reversible reading and archive controls — P1

Keep the existing accurately labelled displayed-item batch action. Add Mark unread and Archive/Undo; archive is a personal organisation action, not deletion of moderation history. If adding Mark all read, use a server-authorised operation with a fixed start cutoff, bounded batches, continuation and progress. Do not relabel the current first-50 action as “all.”

**Acceptance:** A user with more than 50 unread records can complete the operation across pages. Events arriving after its cutoff stay unread; partial failures can resume without changing another user's records.

### 9. Offer notification preferences without hiding essential history — P1

Create a private notification-settings namespace or document with category controls for optional discovery and UI interruptions. Keep direct review/moderation decisions available in history; explain this in settings. Support muting optional updates for one followed company or experience. Store settings separately from existing draft defaults: `saveDraft` currently writes `procedurePreferences/{uid}` without merge and could overwrite newly added fields there.

**Acceptance:** Settings survive draft saves and new devices. Muting discovery does not conceal feedback on the user's own submission. Users can find and reverse every mute.

### 10. Add opt-in following for readers — P2

Let readers explicitly follow a company or experience for new approved experiences and meaningful approved revisions. Bookmarking remains a save action unless the user also chooses updates. Group bursts by company, exclude draft autosaves and votes, and offer Stop following from the update. Evaluate subscriptions on authenticated bounded reads first; avoid synchronous fan-out to every follower inside approval transactions.

**Acceptance:** A followed company produces one relevant grouped update for an approval event, not one per refresh. Muting/unfollowing takes effect on the next fetch. Unapproved content is never included.

### 11. Make statistics updates meaningful and optional — P2

Use trusted batch publication/version metadata to offer followed-batch updates. Publish only after a complete validated dataset becomes active. Identify the batch, publication time and a factual change summary when available. Do not invent drive deadlines, new hiring opportunities or alumni-contact alerts: those workflows are not established by this notification system. Reuse version identifiers to suppress repeated alerts.

**Acceptance:** Reloading the same dataset does not notify again. A batch-version change yields at most one opt-in update per publication, and its link opens the relevant statistics view.

### 12. Give moderators a complete work summary — P1

Show separate counts and oldest waiting age for submissions, pending questions, pending replies and open reports. Link each category to its filtered queue. Use the existing capped submission listener where appropriate, and represent listener failure as unavailable/stale rather than resetting the visible state to a misleading zero. Announce incoming work without automatically replacing the active review item. Defer assignments/escalation until actual multi-admin usage justifies them.

**Acceptance:** Every supported moderation category is discoverable. Another admin resolving an item produces a safe current-state response; fresh arrivals preserve draft feedback and review context.

### 13. Coordinate polling and cross-tab state — P0

Build a UID-scoped notification store/provider shared by the bell, preview and full inbox. Retain foreground/online gating and exponential backoff from `useBackgroundSync`; keep a 60-second baseline initially. Share in-flight requests, add jitter, and broadcast read/archive invalidations across tabs. Fetch summary without loading full history; refresh only the active page or a small new-event window instead of repeatedly re-fetching every opened page. Measure before adding leader election or additional listeners.

**Acceptance:** One foreground tab makes at most one scheduled summary request per interval, regardless of visible notification components. Hidden/offline tabs stop scheduled reads; account changes cancel or invalidate outstanding results and clear prior counts immediately.

### 14. Query unread records directly and bound cost — P0

Move unread filtering into Firestore queries with explicit chronological ordering and a document-ID tie breaker. Add and verify the required indexes in `firestore.indexes.json`; audit indexes for each added category/archive query. Preserve cursor pagination and a small page size. Keep the existing exact count aggregation initially; introduce a transaction-maintained count only if measurements justify its reconciliation and contention costs. Avoid unbounded archive listeners or per-row status fetches.

**Acceptance:** An unread page does not scan through hundreds of read items to find its results. Pagination handles equal timestamps without duplicates, and count/query costs are measured against the existing implementation.

### 15. Make event creation idempotent and permissions explicit — P0

Centralise notification creation in a server helper used by both service files, using deterministic recipient/event keys. Preserve atomic writes with the source transaction for direct notifications; random document IDs alone are not a retry-deduplication policy. Validate ownership for read/archive/settings operations and current admin access for work summaries. Recheck access when opening targets. Preserve anonymous attribution and prevent client writes to authoritative event fields.

**Acceptance:** Retrying the same moderation event produces one item per intended recipient. Cross-user mutation attempts fail, revoked admins lose operational data, and a delayed response after account switching cannot repopulate the old user's inbox.

### 16. Show freshness and recover failures honestly — P0

Show Last checked, Updating, Offline and Couldn't refresh states, with a manual Refresh/Retry action. A failed summary must not look like a confirmed zero; a quiet refresh failure must not remain hidden behind “Automatic updates.” Preserve loaded rows during recoverable failures and confirm read/archive state only after success, or roll back optimistic changes. Keep essential errors inline beyond toast expiry.

**Acceptance:** An API failure with previously loaded items retains them and exposes stale status. Failed read operations preserve the unread state and can be retried without reload.

### 17. Make the UI accessible and calm — P1

Use text/icon treatment as well as colour for unread, action-needed and resolved states. Give bell counts clear accessible names, localised timestamps with exact date/time available, touch-friendly controls and a keyboard-operable preview with Escape dismissal and focus return. Announce new-update counts politely without re-announcing the whole feed. Coordinate persistent events and `AppUtilities` feedback so a single action does not trigger repeated toasts; never let a disappearing toast be the only place to find review feedback.

**Acceptance:** Keyboard and screen-reader users can open, filter, act and return without losing focus. Mobile zoom/reflow and reduced motion work, and background polling does not interrupt writing or reading.

### 18. Establish retention, measurement and regression checks — P1

Define retention before adding broad subscriptions. A candidate policy is to remove optional read discovery items after 90 days, while preserving direct decisions and unresolved work until a separate policy is agreed. Keep moderation audit records independent. Any cleanup must use bounded trusted execution; do not assume a paid scheduled worker or TTL setup is available. Measure request volume, documents scanned, duplicate events, refresh failures and action completion with no feedback text, email or reporter details in telemetry.

**Acceptance:** Retention cannot silently remove unresolved tasks. Regression coverage includes legacy records, more than 100 items, identical timestamps, cross-tab reads, late events during batch operations, deleted targets, offline recovery, account switching and revoked roles.

## Implementation order

| Phase | Deliverables | Release gate |
| --- | --- | --- |
| 1: Trust and correctness | Points 2–6, 13–16; add the shared bell from point 1 | Validated event contract, safe targets, reliable counts/freshness, private/idempotent writes and bounded reads |
| 2: Daily usability | Preview, organisation, read/archive controls, settings, moderation summary and accessibility: points 1, 7–9, 12, 17 | All persona journeys pass on desktop/mobile and with keyboard navigation |
| 3: Relevant discovery | Opt-in following and batch updates: points 10–11, supported by point 18 | Proven relevance, bounded cost, working opt-out and no unpublished-content leakage |

Ship compatible API changes before dependent UI changes. Read legacy records without a full-history migration; use a bounded, resumable backfill only where new queries require it. Keep old links operational. Review deployed indexes/rules and Spark constraints before enabling new queries or cleanup. Roll back discovery producers independently from the essential decision inbox.

## Verification and success measures

- Extend existing backend/rules tests for privacy, recipient-specific payloads, idempotency, indexed pagination and bounded mutation semantics.
- Extend existing Playwright coverage for the shared bell, exact destinations, filtering/back navigation, stale status, account transitions and accessible mobile controls.
- Run `npm test`, `npm run test:firebase`, `npm run test:e2e` and `npm run build` when implementing; use isolated emulators for stateful tests.
- Baseline costs before changes, then compare summary requests per active minute, documents scanned per page and repeated history reads. Initial targets: no duplicate recipient/event records in retry tests, no idle hidden-tab polling, and no cross-account data retention.
- Verify each persona can reach a relevant update and its next action from any signed-in area. Track task completion and stale/error visibility; do not optimise for notification volume or clicks alone.

## Primary code touchpoints

| Concern | Existing files |
| --- | --- |
| Notification UI, contracts and paginated client | `src/Contributions.tsx`, `src/community-api.ts`, `src/CommunityPageState.tsx` |
| Shared access, routing and authentication | `src/Portal.tsx`, `src/App.tsx`, `src/ProcedureNavigation.tsx`, `src/MobileAppNav.tsx`, `src/auth.tsx` |
| Moderation and immediate UI feedback | `src/AdminReviewLink.tsx`, `src/ProcedureAdmin.tsx`, `src/ProcedureCommunity.tsx`, `src/AppUtilities.tsx` |
| Refresh coordination and statistics publication state | `src/background-sync.ts`, `src/repository.ts` |
| Trusted notification producers and operations | `functions/src/service.ts`, `functions/src/community.ts` |
| Privacy and query configuration | `firestore.rules`, `firestore.indexes.json` |
| Regression starting points | `tests/firebase/community.test.ts`, `tests/firebase/procedures.test.ts`, `tests/firebase/rules.test.ts`, `tests/e2e/procedures-ux.spec.ts`, `tests/e2e/community.spec.ts` |

Related context: [existing UX plan](../company-procedures-ux-plan.md), [community enhancement plan](../company-procedure-enhancements.md), [architecture](architecture.md) and [current in-app setup](company-procedures-setup.md). Some older access documentation still mentions notification email setup; align those references with the in-app-only policy during implementation.

## Implementation record — 3 November 2026

The numbered sections above preserve the intended design. The implemented feature includes:

- One shared notification bell across authenticated Home, statistics, Account and Company Procedures, with an accessible desktop recent-items disclosure. Phones open the full inbox directly. The existing inbox route is preserved.
- A shared versioned contract, validated legacy/unknown-event rendering, deterministic transactional event creation and safe application-owned actions. Existing notification documents remain readable without a bulk migration.
- Company/title/revision context, current contributor task state, persistent review feedback, report receipts and private report outcomes that survive removal of public content. Reporter-facing copy excludes private author feedback. Self-report outcomes are deduplicated while retaining correction instructions.
- All, Unread, Needs action, Contributions, Reports, Past discussions, Following, Statistics and Archived views; day grouping, manual refresh, fresh-item staging, memory-cached navigation/scroll state and exact-item focus from the preview.
- Automatic, server-confirmed reading of opened visible notifications, manual read/unread and archive/restore actions, archive undo that restores the original unread state, and cutoff-based read-all operations with explicit 50-record continuation. Reading never completes moderation work.
- Private, version-checked preferences separate from draft defaults. Follow company/experience controls and batch choices support explicit opt-in, mute/unmute and unfollow, up to 20 subscriptions. Conflicting saves ask users to reload preferences instead of silently overwriting another tab.
- Pull-based discovery without follower fan-out: one grouped latest company/experience update, and version-keyed batch updates after a follow-time baseline. Batch activation records its publication time after the existing dataset verification.
- A UID-scoped shared summary provider with one polling timer, jitter, offline/visibility gating, retry backoff, in-flight coalescing and cross-tab invalidation. An old list response cannot overwrite a successful read action. Private state is discarded synchronously on account changes.
- Direct indexed unread queries, 20-record fetch windows and at most four windows per filtered request. Current task lookups deduplicate entity IDs and project only needed fields. API responses expose scanned/fetched counts for cost inspection without collecting notification content in telemetry.
- Accurate freshness/error/offline UI, retry controls, keyboard preview dismissal/focus return, mobile layouts and polite new-update announcements.
- Separate admin submission/report totals and oldest waiting ages, links into the relevant workspace, and an unavailable state for a failed admin badge listener.
- Explicit user-triggered cleanup of at most 50 read discovery records older than 90 days. Direct decisions, unread discovery and moderation audit records are preserved.

### Adaptations and operating limits

Questions and replies were already removed in the current checkout: `ask` and `answer` explicitly reject requests and the reader page no longer exposes discussion creation. This implementation preserves that product decision. Historical discussion notifications remain readable; they do not link to a retired answering workflow. No new discussion UI or question anchors were added. Operational moderator navigation covers the currently supported submissions and reports.

No interrupting discovery toasts were introduced, so preferences control optional inbox discovery rather than a new stream of popups. Essential decisions always remain in history.

Discovery runs while the app is visible and online, at most once per five minutes per account. The summary polls every 60–65 seconds and the open inbox every 65 seconds. Following shows grouped recent approved activity, not an exhaustive replay of every publication while a user was away. Company discovery inspects at most the five newest approved posts per followed company. Notifications do not arrive through an external channel while the app is closed.

Category/archive/Needs action views retain bounded compatibility filtering for legacy documents lacking those fields. A sparse page can therefore expose Load more even if it contains no matches. Unread selection itself is performed in Firestore rather than scanning read history. New indexes cover unread, archived and retention queries; company publication queries reuse the existing company indexes.

### Rollout

1. Review and deploy the updated `firestore.indexes.json` and `firestore.rules` through the project's existing Firebase workflow; wait for indexes to finish building.
2. Deploy the built API and frontend together through the existing Vercel build. New APIs retain compatibility with the old notification request shape and read operations. No new secrets, email service, scheduled worker or billing upgrade are required.
3. Smoke-test separate reader/contributor/admin accounts: open the bell from statistics, submit/review an experience, resolve a report, mark/read/archive in two tabs, follow then mute an item, and sign out before switching accounts.
4. Inspect request counts and the API's scanned/fetched metadata on a large personal inbox. Keep discovery opt-in. The 90-day cleanup is a user action, not an automatically configured TTL or background job.
5. If rolling back the UI/API, leave notification history and private settings in place. Disable optional discovery through preferences if needed; do not delete direct decisions or audit history.

Implementation validation and local screenshots are recorded in [notification implementation checks](notification-implementation-checks.md).

### Automatic opening and theme polish follow-up

Opened inbox cards and the five-item recent preview now save read status automatically after 500 ms of actual foreground visibility. Offscreen and unloaded history stays unread. Following a related link or opening a report outcome also saves read status without blocking navigation. Writes are batched and coalesced, failures expose Retry, and manual Mark unread is preserved for the current visit. Automatically read cards stay in place in an Unread view until explicit refresh or a view change.

The theme control now uses a circular native view-transition reveal from the click/tap position, plus a springy press/overshoot animation on the toggle. Keyboard activation uses the button centre. The theme follows the system when no manual preference exists, persists manual choices and synchronises across tabs. Reduced motion switches instantly; browsers without native view transitions retain a working instant theme switch and lightweight button feedback.
