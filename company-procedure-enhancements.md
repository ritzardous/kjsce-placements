# Company Procedures: enhancement plan

**Goal:** make experiences easier to discover, quicker to contribute, and simpler to moderate. All 15 enhancements below are now implemented; the IDs remain a checklist for testing.

The beta already has company/year/coverage/outcome filters, voting, Markdown preview, autosaved drafts, revision approval, admin feedback and a pending badge. The ideas below extend those flows. Viewers and contributors can be the same person; admin access remains a separate permission.

## Viewers — 5 improvements

| # | Feature | Proposed experience | Priority |
| --- | --- | --- | --- |
| V1 | Better search and persistent filters | Search company names, roles and experience titles. Add round tags such as Aptitude, Coding and HR. Preserve filters and scroll position when returning from a post; offer a clear Reset action. | High |
| V2 | Company procedure hubs | Give each company one page grouping approved experiences by appearance year and role. Show available full/partial accounts and links to its placement statistics. Keep different attempts distinct; never present one person's account as the official procedure. | High |
| V3 | Saved preparation list | Bookmark experiences into a private “Saved for prep” list, synced across devices. Show when a saved post has an approved update or becomes unavailable. | Medium |
| V4 | Easier reading and comparison | Add a short contributor-written summary, round chips, reading time and a heading outline. Let readers compare up to two experiences by year, role, rounds and outcome, with a mobile-friendly stacked view. | High |
| V5 | Questions and corrections | Add focused Q&A beneath a post, with contributor replies and a Report action for outdated, misleading or inappropriate content. Label unanswered questions; introduce this only with admin moderation tools. | Later |

## Contributors — 5 improvements

| # | Feature | Proposed experience | Priority |
| --- | --- | --- | --- |
| C1 | Guided, lightweight editor | Offer “Full experience” and “One round” starters, optional round chips, a formatting toolbar and side-by-side preview on desktop. Keep plain Markdown available and optional details collapsed. | High |
| C2 | Stronger draft recovery | Extend the current session backup to recovery after closing the browser. Clearly distinguish “Saved on this device” from “Saved to your account”; offer retry and conflict recovery without freezing navigation. | High |
| C3 | Remember preferences and reuse metadata | Remember role, graduation year and public-name preference privately, with editable defaults. “Share another company experience” reuses metadata while starting a fresh body; appearance year remains distinct from graduation year. | Medium |
| C4 | Clear review progress and notifications | Add a submission timeline showing submitted, changes requested, resubmitted and approved events. Send in-app notifications linking directly to feedback and the draft. Notifications stay in-app; never promise an approval deadline without staffing data. | High |
| C5 | Contribution impact dashboard | Enhance My Contributions with filters, private draft/submission counts, helpful votes and reader questions needing a reply. Offer “Update this experience” and explain that the approved version remains visible until the new revision passes review. | Medium |

## Admins — 5 improvements

| # | Feature | Proposed experience | Priority |
| --- | --- | --- | --- |
| A1 | Searchable, complete review queue | Add company, year and status filters, oldest-first sorting, waiting-age labels and cursor pagination beyond the current 100-item cap. Preserve queue position after a decision. | High |
| A2 | Review workspace with revision differences | Show the submitted revision beside the currently published version, highlighting edits. Add a short checklist for firsthand scope, clarity and privacy. Detect stale revisions and prevent conflicting decisions if multiple admins review the same item. | High |
| A3 | Faster, clearer decisions | Provide editable feedback templates for missing round details, unclear coverage and private information. Preview the contributor's notification, then approve/request changes/reject. Keep a recorded reason and actor for each decision. | High |
| A4 | Reports and discussion moderation | Add an inbox for reported posts and Q&A, grouped by reason. Let admins dismiss reports, request corrections or hide content with an audit trail. Duplicate-content hints assist review; report counts alone never trigger removal. | Later |
| A5 | Moderation and service overview | Show queue size, oldest pending item, review turnaround and reports awaiting action. Display API/notification failures with a Retry or setup link; distinguish an empty inbox from a failed load. Never display server credentials. | Medium |

## Delivery order

1. **Make everyday use smoother:** V1, V4, C1, C2, A1.
2. **Improve publishing and review:** V2, C3, C4, C5, A2, A3, A5.
3. **Add ongoing community engagement:** V3, then V5 and A4 together.

Keep the current React/Vercel/Firebase Spark architecture. Add private bookmarks/preferences/notifications and moderated questions/reports with owner/admin access rules. Route trusted writes through the existing API, paginate lists, and avoid unbounded live listeners. Start search with company names, normalized titles and structured tags; full-body search needs a separate design if the archive outgrows this approach.

**Success checks:** a viewer finds and saves a relevant experience on mobile; a contributor recovers writing after closing the browser and follows review feedback; an admin reviews an older submission, checks revision differences and resolves a report without losing queue position. Published content still requires approval, identities stay private where requested, and navigation stays responsive during failed saves.

## Implementation and testing notes

- Viewer pages: Browse, company hubs, Saved for prep, two-post comparison and moderated discussion. Search covers company/title/role and structured filters; it does not search entire Markdown bodies. Each request scans at most 200 records; **Load more** continues through older records, including when a selective filter has no matches in the current page.
- Contributor pages: guided Markdown editor, account/device save indicators, explicit conflict recovery, remembered private preferences, paginated contributions, timelines and in-app notifications. Device recovery requires browser storage; account drafts are available across devices.
- Admin pages: paginated oldest-first review queue, revision workspace/checklist, editable feedback, reports filtered by reason, question/reply moderation, audit events and service overview. **Refresh review queue/inbox** loads new items; decisions preserve the current queue position.
- Revision body differences show the first 300 lines; both complete versions remain readable. Duplicate hints check exact wording against the latest 100 approved experiences. Overview review times use the latest 50 moderation records and are labeled accordingly.
- Firebase Spark remains supported. Private writes and sanitized discussion reads use the trusted Vercel API. Questions and replies require approval; reports alone never remove content. Existing approved experiences work without the new optional title/summary/round fields.
- Notifications are in-app only for all users. Admins use the review badge, pending inbox and moderation overview; contributors/readers use Notifications. No email provider, delivery worker or email settings are required.
- Automated checks cover private bookmarks/notifications, unapproved reply privacy, stale moderation, revoked admin access, 121-item pagination, desktop/mobile discovery, comparison, reporting and draft conflicts. Hosted rollout steps and the manual acceptance checklist are in [4amchanges.md](4amchanges.md).

**Verified:** production build/type checking, 24 unit tests, 21 Firebase integration/security tests and 30 desktop/mobile browser tests. Live rules, all index readiness and the enhancement read queries were verified against `placement-stats-kjsce`; no test content was written to production.
