# Company Procedures: frontend and UX redesign

Status: UX flow improvements pushed in `9d59f5c` · 11 October 2026

**Implementation:** the existing fonts, colors and overall design are retained. Navigation hierarchy, dedicated contributions, contextual headers, URL filters, persistent comparisons, validation/focus, notification handling, moderation recovery and destructive-action confirmations are implemented. Notifications remain in-app. The supporting notification API uses existing private collections and requires no new indexes, secrets or billing setup. The frontend and API are released together through the normal Vercel build. The local follow-up aligns search fields, filters, secondary buttons, expandable sections and mobile controls with the existing visual style. The viewer layout now leads with the page title, uses a consistent Browse experiences / Saved for prep / My contributions navigation bar, groups notifications and sharing as utility actions, and separates discovery filters from approved results. The page-wide programmatic focus outline is removed while keyboard indicators on interactive controls and skip-link focus remain available. These follow-up changes are uncommitted.

## 1. Product direction

Make Company Procedures feel like a dependable recruitment community: easy to explore, comfortable to read, safe to contribute to, and efficient to moderate. Production quality means predictable navigation, clear priorities, polished states and reliable recovery throughout the journey.

Keep the existing KJSCE identity, working community features, verified Google access, approval workflow and Firebase Spark/Vercel architecture. Notifications remain entirely in-app. This document records the UX plan and its implementation scope.

### Current problems to address

These findings come from the current frontend code and flows; usability sessions should validate their impact.

| Current structure | UX consequence | Planned change |
| --- | --- | --- |
| One horizontal row mixes Browse, Contribute, Saved, Notifications, Contributions and Admin | Users must repeatedly decide which type of destination they need | Separate everyday navigation, the contribution action, personal utilities and moderation |
| The same large welcome block appears above browse, editor and article pages | Useful content starts too far down, especially on mobile | Give each page a compact, task-specific header |
| My Contributions links to the broader account page | Managing experiences requires an unrelated detour | Dedicated contributions destination inside Company Procedures |
| Many similarly styled buttons, links, badges and disclosure blocks | Main actions and important feedback are difficult to identify | Shared component rules and consistent action hierarchy |
| Search and a large set of filters compete for space | Discovery feels like completing a form | Search first, a few visible filters, remaining options on demand |
| Admin overview, queue, preview and decisions share a long page | Context and decision controls can be separated by scrolling | Dedicated queue/detail workspace with stable decision placement |
| Loading is often plain text; errors and refresh controls vary | Users have to infer whether something is empty, stale or broken | A consistent set of loading, empty, error and recovery states |

## 2. Principles translated into behavior

| Principle | Implementation rule |
| --- | --- |
| Clear hierarchy and recognition | One primary action per page; visible destination labels and selected navigation. Use icons alongside text for unfamiliar actions. |
| Progressive disclosure | Show necessary fields and common filters first. Put attribution, advanced filters and review history behind clearly labelled controls. |
| Visibility of status | Distinguish saved on device, saved to account, pending review and published. Describe what happens next after every submission or decision. |
| User control | Support browser Back, stable deep links, preserved filters/scroll, recoverable drafts and explicit conflict choices. |
| Consistency | Use the same company identity, status wording, spacing, buttons, dates and feedback patterns everywhere. |
| Error prevention and recovery | Validate close to the relevant field. Preserve input on failure. Confirm destructive actions; give actionable recovery instructions. |
| Low effort | Remember editable preferences; avoid asking users to re-enter information. Keep common actions close to their content. |
| Trust and accurate claims | Distinguish self-reported experiences from official information. Label partial coverage and appearance year. Approval means content review, not verified selection or official company policy. |
| Accessible interaction | Keyboard access, readable contrast, predictable focus and responsive layouts are release requirements. |
| Calm engagement | No fabricated popularity, distracting notifications or pressure to contribute. Users control notification reading and comparison selection. |

## 3. Information architecture and navigation

### Desktop

- Keep the app-level navigation for **Placement Stats** and **Company Procedures**.
- Within Company Procedures, use **Explore**, **Saved** and **My contributions** as the primary destinations.
- Place **Share an experience** as a distinct primary action, rather than a destination competing with browsing.
- Put the notification bell with an accessible name and unread count in the section header, alongside account access.
- Give admins a separate **Moderation** entry with the pending-submission count. Label that count accurately; questions and reports have their own counts inside moderation.
- Use breadcrumbs on company, experience and editing pages. The article title should replace the repeated welcome block.

### Mobile

- Use a compact header and labelled bottom navigation for Explore, Saved and My contributions. Place Share in the section header and first-time empty states.
- Keep Notifications and Moderation accessible from the header/menu. Admins can switch to the moderation workspace without losing their browsing state.
- Reserve space for bottom navigation and safe areas. A sticky editor or moderation action bar replaces the bottom navigation on those task screens so two bars do not compete.
- Use route links for page navigation. Use actual tabs only for alternate panels within the same page, with the corresponding keyboard behavior.

### Routing and restoration

- Introduce `#procedures/contributions` and route My contributions there. Keep account details at `#account` and retain its link to contributions.
- Preserve existing experience, company, editor, saved, comparison and admin links. Old bookmarks must continue to open correctly.
- Put shareable discovery filters in the hash query. Preserve private view state, comparison selection and scroll separately, scoped to the signed-in user.
- Define precedence: explicit URL filters → saved filters → defaults. Reset updates both the visible controls and stored state.
- Returning from an experience restores the previous results and scroll. Opening a new destination focuses its heading; returning to a list restores the previous item when possible.
- Centralize route generation and reserved route names, rather than adding more scattered hash strings.

## 4. Viewer experience

### Explore

1. Compact heading, short description and Share action.
2. Prominent search with clear scope: company, experience title or role. Do not imply full-body search.
3. Company and appearance-year controls, a **More filters** control and sort.
4. Removable active-filter chips and Clear all. On mobile, advanced filters use an accessible sheet with Apply and Reset; draft changes do not affect results until Apply.
5. Scannable experience cards and an explicit Load more action.

Card hierarchy: company identity → experience title → appearance year and role → contributor summary → coverage/round tags → reading time and helpful score. Keep Read as the main action; Save and Compare are secondary. Avoid making the entire card a clickable container containing nested interactive controls.

Show loading skeletons with the final card dimensions. Keep current results visible during filter refresh with a subtle updating state. When paginated search scans an archive, say **No matches in this batch; load more to continue** rather than claiming the archive has no matches. Never label loaded-item counts as database totals.

### Company hub

Use a company header, year/role filters and experiences grouped consistently by appearance year. Include relevant placement-statistics links as secondary context. Clearly separate partial accounts from full procedures. For an empty hub, explain that no approved experience is available and offer Share an experience.

### Experience reading

- Use a readable content column, approximately 65–75 characters wide, with 16–18px body text and generous paragraph spacing.
- Put title, company, year, coverage and role above the article; make secondary attribution and timestamps quieter.
- On wide screens, place the heading outline beside the article. On mobile, use a collapsible **On this page** control.
- Keep Save and voting easy to find without overwhelming reading. Explain vote meaning and prevent duplicate submissions while an action is pending.
- Give Questions its own section with clear pending/answered labels. Keep Report accessible near the relevant post or reply.
- Show the self-reported/content-review explanation once in a concise context block.

### Saved and comparison

Saved becomes a preparation workspace with clear updated/unavailable states, useful metadata and immediate removal feedback. Restore a failed save/remove action to its previous state and explain the failure.

Comparison uses a selection tray that shows the selected experiences and a clear two-item limit. It becomes a bottom tray on mobile without covering navigation. Compare metadata first, then full accounts; keep independent attempts distinct and use labelled stacked sections on narrow screens. Preserve selection after returning to Explore.

## 5. Contributor experience

### My contributions

Show **Needs your attention**, Drafts, In review and Published as views within a dedicated workspace. Surface requested changes, unsynced writing and unanswered questions before general impact statistics. Each item has one obvious next action: Continue writing, View submission, Revise or Update experience.

Keep the timeline and older feedback available within the item. Separate approved public content from the revision being edited. Do not describe a draft as published merely because an older approved version exists.

### Focused editor

- Compact header: back to contributions, editable title, save state and Preview.
- A short company/year/coverage/outcome section followed by the writing area. Keep optional metadata collapsed and editable remembered preferences visible when relevant.
- Offer Full experience or One round starters with concise explanations. Never replace meaningful writing without an explicit choice.
- Use a familiar formatting toolbar with text alternatives. Retain Markdown and safe preview; avoid a rich-text migration in this redesign.
- Desktop: write/preview split option. Mobile: Write and Preview panels with reliable cursor and scroll restoration.
- Persistent task footer: save state and **Submit for review**. Keep it above the keyboard/safe area and avoid covering validation messages.
- Validate on blur and submission; show field-specific guidance plus an error summary linking to invalid fields. Focus the first issue after submission fails.

Submission success should show **Submitted for review**, the current status and a link to View submission. Explain that the experience becomes public after approval. Do not add a redundant confirmation dialog to a routine submission or promise a review deadline.

### Reliability visible to the user

Use plain save labels: Saving, Saved to your account, Saved on this device only, or Save failed — Retry. Device-only recovery must identify the device limitation. If leaving could lose unsaved content, offer Stay or Leave; do not block navigation when a durable recovery copy exists. During account conflicts, show both versions and require an explicit choice.

Discarding a device copy or unpublishing content requires a specific confirmation explaining what is affected. Do not offer Undo unless the server supports restoring that action safely.

## 6. Admin experience

### Moderation workspace

Use a distinct work-oriented shell with **Experiences**, **Questions & replies** and **Reports**, each with accurate pending counts. Keep overview metrics compact above the queue; show operational errors only when actionable.

Desktop layout: searchable queue on the left, selected item in the main panel, decisions in a stable footer. Avoid forcing a second internal scroll region if normal page scrolling works better. Mobile uses a queue page followed by a focused detail page with Back to queue.

### Review detail

Order information by decision relevance: submitted title and metadata → content → current approved version/diff when applicable → privacy/clarity checklist → feedback and decision controls. Keep moderation-only identities and notes out of the public reader component.

- Primary action: Approve. Secondary: Request changes. Destructive/restrictive: Reject or Unpublish, clearly distinct and explained.
- Selecting a feedback template never submits a decision; the admin can edit it.
- Require a reason when appropriate and show how it will appear in the contributor's in-app notification.
- After a successful decision, remove the resolved item, keep queue filters/position and offer the next item without silently approving it.
- If another admin has acted or a newer revision exists, explain the conflict, disable stale actions and provide Reload latest.
- Preserve entered feedback on network failure. Do not optimistically hide content before the server confirms the decision.

Reports must show the actual reported content, reason and scope of the selected action. Distinguish hiding a reply from hiding an entire experience. Keep moderation history discoverable without making it the first thing an admin sees.

## 7. In-app notification center

Provide a visible unread indicator, clear read/unread styling, time grouping and direct links to the relevant feedback, draft or discussion. Opening the related item can mark the notification read after successful navigation; retain an explicit Mark as read control.

Use a compact preview for recent items and **View all notifications** for history. Add Mark all as read only with an authorized, bounded backend operation; do not simulate it by marking just the loaded page. Badge counts must be accurate or explicitly capped, never inferred from one page of results.

Admin queue counts and personal unread notifications are different concepts and must have distinct labels. Keep Refresh available; fresh-item indicators must not reorder the active queue, move focus or discard writing. Notification polling/listeners should be bounded, foreground-aware and stopped at sign-out.

## 8. Visual system and interaction states

Create shared tokens for surfaces, text, borders, spacing, typography, radius, elevation, focus and semantic colors. Retain the existing accent and company identity; use a restrained neutral background, clear card boundaries and fewer oversized headings. Start with a 4/8px spacing scale and tune density by task: comfortable reading, compact admin queues.

Reusable components: section shell, page header, breadcrumbs, navigation, button variants, labelled icon button, form field, search/filter bar, status badge, experience card, notification item, toast, inline alert, skeleton, empty state, dialog/sheet, action footer and pagination.

Every interactive component must define default, hover, focus, pressed/selected, disabled, pending and error states where applicable. Status needs text or an icon as well as color. Use brief success toasts for completed actions; keep errors and required feedback inline until resolved. Avoid multiple alerts describing the same failure.

Use modest transitions and respect reduced-motion preferences. Layout stability and readable controls take priority over decorative motion. Do not introduce a large UI library or remote fonts solely to change the appearance.

## 9. Accessibility and responsive acceptance

Target WCAG 2.2 AA and use WAI-ARIA patterns for complex widgets. Test normal-text contrast of at least 4.5:1, large text at least 3:1, and relevant control/focus contrast. Aim for 44px touch targets; meet the WCAG AA 24px minimum or its permitted exceptions. Validate keyboard operation, visible/unobscured focus, labelled inputs, status announcements, error association and reflow at 320 CSS pixels. These checks follow the [W3C WCAG reference](https://www.w3.org/WAI/WCAG22/quickref/).

Prefer native controls. Dialogs/sheets need meaningful names, controlled focus, Escape behavior and focus restoration; tabs need their expected keyboard model. Use the [WAI-ARIA Authoring Practices patterns](https://www.w3.org/WAI/ARIA/apg/patterns/) when those components are necessary.

Also check 200% text zoom, 400% page zoom/reflow, screen-reader reading order, mobile keyboards and long company names. Code blocks and comparison tables may scroll within clearly labelled regions; the whole page must not overflow. Sticky headers/footers must not obscure focused elements or article anchors.

## 10. Technical implementation boundaries

| Area | Main implementation location | Work |
| --- | --- | --- |
| App/section shell | `Portal.tsx`, `AuthControls.tsx`, `Procedures.tsx` | Navigation hierarchy, compact headers, mobile shell and notification access |
| Navigation state | `routing.ts`, route helpers, `community-api.ts` | Contributions route, deep links, filter precedence, cache/scroll/focus restoration |
| Discovery and reading | `ProcedureCommunity.tsx`, `ProcedureMarkdown.tsx` | Search/filter layouts, cards, reading layout, saved/compare interactions |
| Contribution workspace | `Contributions.tsx`, `ProcedureEditor.tsx` | Dedicated management page, focused editor, validation and submission success |
| Moderation | `ProcedureAdmin.tsx`, `AdminReviewLink.tsx` | Queue/detail layout, decision footer, counts and stale-review recovery |
| Shared feedback/design | `CommunityPageState.tsx`, `procedures.css`, new small UI components | Design tokens, consistent states, accessible sheets/dialogs and responsive rules |

Reuse existing transaction services and data shapes. Any new unread-count, mark-all-read or queue-summary endpoint needs explicit authorization, accurate semantics and bounded reads; it is a small supporting backend change, not something CSS can provide. Keep API/database limits visible in the UX. Add no email provider or paid search/analytics service.

## 11. Delivery sequence and review gates

| Phase | Deliverable | Gate before moving on |
| --- | --- | --- |
| 1. Flow and layout prototype | Screen map; desktop/mobile layouts for Explore, experience, contributions, editor, notifications and moderation | Walk through find/save, submit/revise and review/report journeys without ambiguous destinations |
| 2. Design system and shell | Tokens/components, navigation, contributions route, breadcrumbs and responsive frame | Existing deep links, keyboard navigation and Back behavior still work |
| 3. Viewer journey | Search/filter UX, cards, hubs, reading, saved and comparison | Preserve filters/scroll/selection; handle empty, updating, unavailable and failed states |
| 4. Contributor journey | Management workspace, editor, recovery, validation and status screens | No lost writing; device/account/conflict states are understandable on mobile |
| 5. Admin and notifications | Moderation workspace, stable decisions, notification center and accurate counts | Private data stays private; stale reviews and failed actions recover safely |
| 6. Quality and rollout | Accessibility review, representative usability sessions, regression tests and production build | Pass the release checklist; deploy the coherent redesign and verify live routes |

Use a preview deployment to review the full journeys. Keep the old entry routes working throughout rollout. Prepare a known-good frontend rollback that remains compatible with any additive API changes. Update `4amchanges.md` with only actual release/setup actions when implementation is complete.

## 12. Definition of done

- A new reader can find a company, understand year/coverage, save an experience and return to the same results without guidance.
- A contributor can resume a draft, recover failed saves, understand review status and act on feedback without visiting account settings.
- An admin can review, request changes and handle reports while retaining queue context; notification and pending counts use accurate labels.
- Desktop/mobile keyboard, screen-reader, zoom, loading, empty, slow-network, failed-request and stale-data checks pass.
- Existing approval, privacy, voting, draft-conflict and deep-link tests remain valid. Add meaningful tests for navigation restoration, focus, sheets, sticky actions and new notification operations.
- The production build passes. Compare route load, responsiveness and layout shift with the current baseline; investigate regressions before release. Keep route bundles lazy and avoid unbounded subscriptions.

Run formative sessions with readers, contributors and an admin before calling the redesign successful. Proposed targets, to calibrate against a baseline: at least 90% completion of find/save and resume/submit tasks without help, and clear understanding of review status for every participant. Record task time, mistakes and lost-context incidents; do not collect draft contents or personal account details as UX telemetry. These are validation targets, not current measured results.
