# UI decluttering, alignment and navigation plan

**Status: approved by the user; implemented locally. Not deployed.**  
**Date:** 3 November 2026  
**Scope:** the authenticated app for readers, contributors and moderators, with particular attention to Company Procedures. This is a proposed experience redesign, not another CSS spacing patch.

## 1. What needs to change

The supplied screenshot and current components reveal several connected problems:

| Observed problem | Why it causes friction | Proposed resolution |
| --- | --- | --- |
| Five contribution-status buttons plus a status dropdown | Two controls express almost the same decision | One labelled status filter; remove the parallel button row |
| “Review notifications” beside the filter, in addition to the global bell | Repeated destination competes with the page task | Keep notifications in the shared header; link to feedback contextually when needed |
| Labelled dropdown beside an unlabelled navigation button | Their outer boxes align differently from their actual controls | Remove the duplicate link; standardise field/action toolbars elsewhere |
| Delete, withdraw, unpublish and history repeated on cards | Infrequent/destructive options get everyday prominence | One primary card action, a contextual More actions menu, and history in detail |
| Tall cards, stretched spacing and large action rows | Symmetry is achieved by adding empty space rather than improving scanning | Compact contribution rows on desktop; compact stacked cards on phones |
| Section heading, back link, section navigation, utility actions and page title stack up | Navigation takes attention away from the current task | One consistent page header and a clear hierarchy of navigation levels |
| Editor shows many controls and optional sections at once | The contributor must understand the whole system before writing | Essential writing first; advanced metadata and management revealed progressively |
| Nine notification view buttons plus bulk operations | A utility page becomes another dashboard to learn | Small primary view switch, one category filter and an Actions menu |
| Different back/home/company links imply different destinations | Users cannot predict whether they will return to their work or restart browsing | Explicit parent destinations plus context-aware return links |

Relevant current components: `Contributions.tsx`, `Procedures.tsx`, `ProcedureNavigation.tsx`, `ProcedureEditor.tsx`, `ProcedureAdmin.tsx`, `NotificationInbox.tsx`, `Portal.tsx`, `MobileAppNav.tsx` and the layered style sheets.

## 2. Design rules for the whole app

1. **One dominant action per page or selected task.** Each contribution row may have its own clearly subordinate action; this does not make every row a large blue call to action.
2. **Navigation looks like navigation.** Use links, active indicators and breadcrumbs for destinations. Reserve filled buttons for committing an action.
3. **One control per decision.** Avoid parallel tabs and dropdowns that filter the same state. Additional filters must represent different dimensions.
4. **Reveal complexity when relevant.** Keep common actions visible; move optional metadata, history, export and destructive management into labelled disclosures or menus.
5. **Status explains the next step.** “Changes requested” should lead directly to feedback and revision. Unread activity, publication state and unresolved tasks remain different concepts.
6. **Use containers for meaningful groups.** Avoid putting a border and shadow around every field, sentence or toolbar. Retain the existing visual identity while reducing competing surfaces.
7. **Alignment comes from shared structure.** Use common field/control dimensions, grid tracks and spacing tokens rather than isolated margins or fixed card heights.
8. **Preserve users’ place.** Navigation, background refresh and pending operations must retain filters, selection, writing and return context.
9. **Progress is local to the action.** Show a busy state where the action happened. Avoid a large page-wide blocker for a small card operation.
10. **Mobile and accessibility are first-class.** Progressive disclosure must remain discoverable, keyboard-operable and usable at 200% zoom.

## 3. Proposed navigation hierarchy

Keep the existing distinction between statistics and Company Procedures. Do not add a new sidebar alongside every existing navigation bar.

```text
App:       Home / change batch | Placement Stats | Company Procedures
Utilities: Notifications | Theme | Account

Placement Stats:   selected batch → Overview / Companies / Branches / Career explorer
Company Procedures: Browse / Saved / My contributions
Admin workspace:    Experience reviews / Reports
```

- Desktop retains one global area switch and one local section-navigation level.
- Mobile retains the existing bottom-level destinations. Local views use a compact switcher; they must not repeat the full global navigation above it.
- Put logout inside the account menu. Keep account and theme accessible; keep the bell visible. Give the desktop bell one main trigger that opens recent activity with a clear View all destination, instead of two competing adjacent triggers.
- Keep moderation as a role-specific workspace entry, not another large action repeated throughout reader and contributor screens. Its active state must identify moderation rather than appearing to be Browse.
- Use **Company Procedures** consistently as the section name; supporting text can explain that it contains recruitment experiences. Avoid gratuitous route or terminology changes during this pass.
- Preserve existing hash routes and protected deep links. Introduce redirects only if a later approved design needs a new route.

## 4. Consistent page headers and orientation

Each page gets, in this order: a short breadcrumb where hierarchy helps, a single H1, a one-line description only when useful, and its primary action.

| Screen | Location cue | Primary action | Return behaviour |
| --- | --- | --- | --- |
| Company directory | Company Procedures → Browse | Share an experience | App navigation switches areas without forgetting the selected batch |
| Company experiences | Browse → Company name | Share an experience for this company | Back to companies restores directory filters and position |
| Read experience | Browse → Company → Experience | Save experience, as a quiet contextual control | Return to its originating company, Saved or contribution context |
| My contributions | Company Procedures → My contributions | Share an experience | Preserve the selected contribution status and list position |
| Write/revise | My contributions → New experience / Experience title | Submit for review / Resubmit | Back to My contributions preserves writing and explains unsaved recovery |
| View submission | My contributions → Experience title | Relevant next step, if any | Return to the same contribution list |
| Notifications | Notifications | No permanent dominant action | Item destination retains a Return to notifications path |
| Admin review | Moderation → Experience reviews → Selected item | Approve or the selected decision | Return to queue preserves filters, item and position |
| Statistics detail | Class of year → Companies → Company | Page-specific action, if needed | Return to that batch and prior list context |

Breadcrumbs express hierarchy. A separate “Back to …” link expresses the actual return journey when the user arrived from Saved or Notifications. Do not use a breadcrumb as an unpredictable browser-back command. Direct-link arrivals get a deterministic parent destination.

## 5. Contributor workspace — highest priority

### My contributions

Replace the current stacked controls and large management cards with:

```text
Company Procedures / My contributions
My contributions                              [Share an experience]

[Status: All contributions ▾]                 8 experiences
------------------------------------------------------------------
Experience title        Company · Year        Draft       Continue  ⋯
Experience title        Company · Year        In review   View      ⋯
Experience title        Company · Year        Needs edits Revise    ⋯
------------------------------------------------------------------
```

- One status selector contains All, Needs attention, Drafts, In review, Published and any necessary specific decision states. The selected value is visible and persists on return/reload.
- Remove the duplicate status-button row and the Review notifications shortcut shown in the screenshot.
- Put impact information behind “Contribution impact”; it should not interrupt the action/filter/list sequence.
- Show title, canonical company, year and status in a predictable order. Show a concise feedback excerpt for Needs attention; the full feedback remains easy to open.
- Each row exposes one action appropriate to its state: Continue writing, View submission, Revise or View published experience. Published revisions need a clear distinction between the public version and editable draft.
- More actions contains only valid operations for that row: Edit/update, Withdraw, Unpublish, Delete and View history as applicable. Destructive operations remain labelled and confirmed.
- Submission timeline moves to the submission/detail view. A View history menu entry opens it directly; it is not repeated as a large disclosure beneath every row.
- Device recovery remains prominent when unsynced writing exists. Use one recovery notice with an explicit Review recovered drafts action, rather than interleaving recovery cards with account contributions.
- On phones, each row becomes a compact card with status, one action and More actions. Avoid a squeezed desktop table or horizontal scrolling.

### Editor and submission detail

- Lead with Company and the writing area. Keep the short introductory guidance inline rather than as a large attention-grabbing box.
- Put necessary metadata into one clearly named Experience details section. Group optional attribution and additional metadata separately; do not hide missing required fields behind an unexplained collapsed section.
- Keep a compact formatting toolbar. On phones expose essential formatting plus a labelled More formatting disclosure. Preview is a mode switch adjacent to writing, not a repeated navigation action.
- Autosave is the default. Show a compact Saved / Saving / Offline status near the action footer. Move Save now into a secondary menu or failure recovery action rather than presenting it as a routine competing workflow.
- Use one action footer: Back to contributions, save status and Submit. While pending review, show a read-only submission view with status and next steps rather than an editor full of disabled controls.
- Keep moderation feedback above the relevant writing and link directly to it from Needs attention and notifications.
- Clear all and template replacement stay under Writing options, with recovery/confirmation where needed. Do not present destructive writing actions as peers of Preview and Submit.
- Preserve draft conflict handling, device recovery, version checks and safe navigation away. Simplifying the screen must not remove those safeguards.

## 6. Reader, saved items and discovery

- Company directory: search plus one Filters control. Put less-used filters in the existing filter sheet with Apply, Reset and Cancel; show a concise active-filter summary afterward.
- Company pages: one company header, useful year/context information and a clear experience list. Group links to placement statistics under one “Placement statistics” entry rather than a row of batch buttons.
- Experience reader: prioritise the title and writing. Keep Save and helpful voting available; group Share, Report and supplementary context in a restrained utility area. Reporting must remain easy to find and clearly labelled.
- Saved: use the same compact list language as My contributions, with one Read action and a bookmark/remove control. Explain unavailable items without replacing their place with an unrelated destination.
- Avoid repeated Share an experience calls to action in the global/local navigation, page header and empty state at the same time. The page header owns the usual action; an empty state may replace it with contextual guidance.

## 7. Notifications and account

- Notifications gets All / Unread as the primary view switch and one category filter covering Contributions, Reports, Following, Statistics and historical activity.
- Needs action remains discoverable as a filter option; it does not become synonymous with unread. Archived items remain accessible through the filter.
- Move Mark all read, displayed-item operations and archive management into an Actions menu. Show bulk controls only when a selection or continuation operation needs them.
- Cards show one contextual destination. Put Mark unread and Archive in More actions; retain undo. Automatic visible-item reading continues without a manual-read step.
- Preferences stay behind one labelled Notification preferences entry. Following management should not compete with the inbox at the top of the page.
- Account leads with identity and settings. Keep links to My contributions and Saved, but remove the full duplicate contribution-management interface embedded in Account. There should be one canonical place to manage writing.

## 8. Moderator workspace

- Show two workspace tabs: Experience reviews and Reports. Keep operational counts distinct from the personal notification bell.
- Keep queue search and one Filters control visible; move company, year, status and sorting into a structured panel or sheet. Show the resulting filter summary.
- Desktop uses a clearly bounded queue/detail relationship. Mobile switches from queue to detail with an explicit Back to queue control; do not squeeze both into one viewport.
- Group decisions in one action area. Approve and Request changes remain discoverable; Reject and Unpublish are secondary destructive actions with existing safeguards.
- Keep checklist and required feedback visible during a decision. Collapse templates, comparison and audit history until requested. Do not hide information needed for a responsible moderation decision.
- Preserve written feedback and selection through refresh/conflict recovery. A new arrival should not replace the item being reviewed.

## 9. Statistics and global consistency

- Preserve the selected batch prominently and provide one clearly labelled Change batch route.
- Keep one local statistics navigation model with a consistent active indicator. Mobile “Statistics” opens section choices with clear text indicating the behaviour; an active tab should not secretly act like a different control.
- Audit company, branch, candidate and explorer toolbars for the same field/action alignment problem as the screenshot. Group primary search, filters and optional exports by purpose.
- Place exports and infrequent display options under a labelled utility menu where present; keep chart data and meaningful controls accessible.
- Do not redesign chart semantics, placement calculations or database identity rules as part of this visual/navigation pass.

## 10. Alignment and surface specification

- Use a shared spacing scale: 4, 8, 12, 16, 24 and 32 px; larger page separation must be intentional rather than accumulated default margins.
- Desktop controls have consistent heights within their toolbar; interactive targets are at least 44 px. Fields keep visible labels. An adjacent unlabelled action aligns to the input box, not the combined label-and-field wrapper.
- Use grid rows for labels and controls, or bottom-align field/action groups. At narrow widths, stack deliberately with full-width controls rather than leaving uneven wrapped fragments.
- Share content edges across breadcrumb, title, toolbar, results and pagination. Limit prose/editor width for readability rather than stretching every panel across the whole viewport.
- Use compact row separators for repeated contributions/notifications. Use stronger containers for the selected task, dialogs and important feedback. Reduce repeated borders/shadows around nested groups without changing the underlying fonts or brand palette.
- Avoid fixed card heights and large `margin-top:auto` gaps that produce the empty spaces visible in the screenshot. Symmetry means aligned anchors and predictable structure, not identical whitespace inside unrelated content.
- Long titles, multi-line feedback, empty values and busy/error states must fit without clipping, overlap or misaligned neighbouring controls.
- CSS changes should consolidate competing layout rules in touched components. Do not keep adding another override sheet for each screenshot defect.

## 11. Interaction, accessibility and state preservation

- Label More actions menus with the item name for assistive technology. Support keyboard opening, focus movement, Escape and focus return; use ordinary buttons/links where a complex menu role is unnecessary.
- Use a dialog/sheet with explicit Close/Cancel on phones for longer action/filter sets. Opening an overflow menu must never trigger its destructive action directly.
- Make active area, local view, selected filter and selected queue item visually distinct and programmatically identifiable.
- Preserve scroll/filter context on back/forward navigation. Restore focus to the originating row/action where possible, with a sensible fallback if that item was removed.
- Pending controls keep their footprint and explain the current operation. Disable conflicting actions for the affected item rather than unnecessarily freezing the whole screen.
- Errors appear next to the affected task with a useful recovery action. Success feedback should not repeatedly expand the page or duplicate a toast, banner and notification for the same event.
- Keep existing automatic notification reading, theme transitions, reduced-motion support, authentication and privacy protections.

## 12. Implementation sequence after approval

| Phase | Work | Review/checkpoint |
| --- | --- | --- |
| 1 | Shared page-header, field/action toolbar, action hierarchy, menus and local navigation patterns | Desktop and phone examples with long labels, errors and busy states |
| 2 | My contributions and submission detail, then editor | Walk through draft → submit → feedback → revise; assess density and return context |
| 3 | Browse, company detail, reader and Saved | Find → save → read → return; verify statistics destinations |
| 4 | Notifications, Account and moderation | Review personal updates and operational queues without duplicate controls |
| 5 | Statistics/global consistency and CSS consolidation | Selected-batch navigation, toolbar alignment and whole-app visual pass |

All phases are covered by this proposal. Implement in this order so the contributor experience establishes a consistent pattern for the rest of the app. This document does not authorise starting Phase 1 before user approval.

## 13. Acceptance criteria and validation

1. The screenshot’s duplicate contribution filters and Review notifications row are gone; the replacement toolbar has a single clear alignment baseline.
2. My contributions exposes one status filter, one page-level creation action, and one main action per row. Destructive operations are accessible through More actions.
3. A contributor can locate feedback, revise, submit and return to the original list without guessing which screen owns the task.
4. Every reviewed screen identifies its current area, page/context and a clear parent/return path, including direct-link arrivals.
5. A reader can move between company experiences and the correct statistics context, then return without losing filters or the selected batch.
6. Account does not duplicate the complete writing-management screen. Notifications does not require scanning nine peer view buttons.
7. Moderators can change queues and return from detail while preserving selected filters, feedback and review context.
8. Toolbars, row actions and busy/error states align at 320, 390, 768, 1280 and 1920 px widths, with no horizontal page overflow.
9. Keyboard-only use, screen-reader labels, focus return, reduced motion and 200% zoom remain usable. Menus are not hover-only.
10. No data, permissions, moderation safeguards, recovery mechanisms or existing deep links are lost through decluttering.

Verification after implementation: relevant unit/routing tests, isolated Firebase regression checks, focused Playwright journeys, and visual review of desktop/mobile screenshots for every screen family above. Add meaningful checks for toolbar bounding-box alignment and navigation restoration; do not rely on the build alone to assess a visual redesign. Record any unrelated full-suite failures separately.

## 14. Approval scope

Approval of this plan authorises the UI/navigation changes described above, including moving secondary actions into menus, replacing contribution cards with compact rows, consolidating duplicate filters, simplifying Account and reorganising local navigation. Existing content, permissions, company identity repairs and notification behaviour are preserved.

It does **not** authorise database cleanup, removal of existing content, deployment, a new branding system, additional notification channels or a new discussion feature. Any material change to this scope should be brought back for review.

## Implementation record

Implemented after the user's approval:

- Shared page headers and breadcrumbs, quieter local navigation, one bell trigger and an account utility disclosure containing sign-out and role-specific moderation access.
- One contribution-status selector, compact full-width rows with aligned action columns, contextual action disclosures, per-item pending state, recovery disclosure and impact information below the list. Destructive actions retain native confirmation dialogs.
- Read-only pending submission pages, contextual return links, history in the detail view, grouped experience metadata, optional writing/save actions and a single editor action footer. Conflict recovery, autosave and device recovery remain available.
- Saved and reader views use quieter surfaces and contextual return destinations. Experience options group following, sharing and reporting; company statistics links resolve actual dataset IDs lazily instead of guessing from community aliases.
- All/Unread and activity category are independent inbox controls. Bulk operations and item management are available on demand, while automatic reading and cross-tab updates remain in place.
- Account no longer duplicates the writing-management screen. Review queue search remains visible with advanced filters collapsed; feedback templates and destructive review decisions are secondary disclosures.
- Statistics salary chips are replaced by one labelled selector; existing batch and section navigation is preserved. Home is no longer misleadingly highlighted as the current Statistics view.
- Shared layout rules live in the existing layout sheet. Conflicting contribution grid rules were removed from the older theme stylesheet. Native disclosures support Escape, outside dismissal and a Close control on phones; their contents retain ordinary button/link semantics.

Validation includes the production build, unit/backend regression checks and focused desktop/mobile journeys in `tests/e2e/workspace-flow.spec.ts`, `data-quality.spec.ts` and `automatic-sync.spec.ts`. Browser assertions check row width, shared content edges and horizontal overflow at 320, 390, 768, 1280 and 1920 px. Desktop and phone screenshots for contributions, editor and inbox are under ignored `artifacts/workspace-*.png`.

The broad legacy browser suite contains selectors for intentionally removed controls (direct header logout, duplicate contribution tabs, always-visible management actions and the second bell trigger). Those tests are not represented as passing; focused tests exercise the replacement flows. No production data was changed or application deployment performed for this UI task.

Verified locally: 52 unit tests, 33 isolated backend/rules checks and 14 focused desktop/mobile browser journeys pass. The production build passes. Visual review caught and corrected inherited two-column sizing that squeezed the new action column; tests now check full row width and a usable action width, in addition to alignment and viewport fit. Legacy full-suite UI assertions still need migration to the approved control structure before the entire historical browser suite can be reported green.
