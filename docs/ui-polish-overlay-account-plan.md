# UI repair plan: overlays, content containment and account experience

**Status: proposed; awaiting user approval. No application code changes in this pass.**  
**Date:** 3 November 2026  
**Applies to:** desktop and mobile, light/dark themes, readers, contributors and moderators.

## 1. What this pass corrects

The last redesign reduced the number of visible controls, but putting different interactions inside one generic disclosure created new usability problems. A compact menu is appropriate for choosing an action; a reporting form and a personal account panel need different layouts and behaviour.

The attached screenshots are the starting evidence. Static review of `ActionMenu.tsx`, `AuthControls.tsx`, `ProcedureCommunity.tsx`, `ProcedureEditor.tsx`, the Markdown renderer and shared styles identifies the following repair targets. Items inferred from shared components still require browser reproduction; this document does not claim that every possible UI bug has already been found.

| ID | Evidence / risk | Cause or investigation target | Priority |
| --- | --- | --- | --- |
| U01 | Report experience expands into a tall, narrow, scrolling action popup | A full form is rendered inside `ActionMenu`; generic menu rules affect its buttons and layout | P0 |
| U02 | Pending submission text creates page-level horizontal scrolling | An unbroken string escapes the Markdown/submission width; `.submission-detail` has a max-width but lacks adequate text containment | P0 |
| U03 | More actions extends toward/beyond the bottom of the screen | Desktop menu always opens below/right; height is limited by a percentage of the viewport rather than available space around the trigger | P0 |
| U04 | Account popup feels empty and anonymous | Its My Account link contains only an `aria-hidden` avatar, with no visible name, destination text or identity summary | P0 |
| U05 | Menus feel tall and heavy for a small number of choices | Inherited form/card styles, broad descendant selectors, padding and redundant entries; inspect computed styles at each breakpoint | P1 |
| U06 | Read published experience wraps into a large two-line row action | Action wording, icon semantics and available width are not designed together | P1 |
| U07 | Read approved version repeats the published row’s primary destination | Menu content is not sufficiently contextual to the row’s main action | P1 |
| U08 | Generic Close options and helper text add noise to action menus | One generic mobile/desktop presentation is used across unrelated surfaces | P1 |
| U09 | An open menu can cover another row, footer or important controls awkwardly | Needs collision handling, consistent layering and predictable dismissal; especially near the viewport edge | P1 |
| U10 | Wide tables, code, URLs, long names and validation messages may reproduce overflow elsewhere | Current tests mostly use short ordinary prose and limited open-overlay states | P0 audit |
| U11 | Opening one disclosure may leave other popups open | Existing outside-dismiss checks are per instance; inspect opening and switching between account, bell and row menus | P1 audit |
| U12 | Nested confirmation/report interactions can lose their trigger context | Closing a disclosure and opening a dialog need an explicit focus handoff and return target | P0 audit |
| U13 | Mobile keyboard and bottom navigation can reduce usable dialog space | Fixed bottom offsets and viewport percentages do not account for the visible viewport or safe areas | P0 audit |
| U14 | A pending submission is labelled “Your writing saves automatically” | Shared editor header copy does not distinguish editable writing from a submitted read-only revision | P1 |
| U15 | Account, menu and form appearance can change under unrelated global selectors | Broad button/link styles and inherited layout rules need component-level ownership rather than another patch layer | P1 |

## 2. Interaction model: three distinct surfaces

| Surface | Use it for | Do not put inside it |
| --- | --- | --- |
| Compact action menu | A short list of immediate actions or navigation choices | Full forms, long instructions, nested settings panels or expandable report editors |
| Task dialog / mobile task sheet | Report experience, confirmation and other focused multi-field tasks | Unrelated navigation or a second action menu that must remain open underneath |
| Account panel | Identity, personal destinations and sign-out | A bare avatar-only link or an undifferentiated list of destructive and routine actions |

Retain the established typography, palette, theme toggle and automatic notification behaviour. Improve hierarchy, sizing and containment without introducing another visual branding system.

## 3. Reporting experience — dedicated task UI

Replace the nested report disclosure with a single **Report experience** action. Selecting it closes Experience options and opens a dedicated, labelled dialog.

**Desktop:** a centred form approximately 440–520 px wide, constrained to the available viewport.  
**Phone:** a focused sheet/dialog using nearly the available width, safe-area spacing and a visible close control. It must remain usable when the software keyboard is open.

```text
Report experience                              [Close]
Company / short experience title
Tell us what needs review. Your report is private.

Reason                                         [Choose reason ▾]
Details (optional)
[                                                       ]

                                  [Cancel] [Send report]
```

- Keep existing reason values and backend validation. Use human-readable option labels rather than raw lowercase enum text.
- Give labels, select and textarea consistent widths. Put form actions in a stable footer, not among menu items.
- Set initial focus to the reason field, contain focus inside the dialog and return it to the originating Experience options trigger on close.
- Retain entered details when recovering from a failed send. Preserve an unsent report during a simple close/reopen on the same experience; do not silently wipe it during validation or a network error.
- Prevent duplicate submissions while sending. Keep a visible local pending state and a clear recovery message if the experience becomes unavailable.
- On success, close the form and show one concise acknowledgement. Keep the existing private report receipt/outcome in Notifications; avoid repeating the same success through several banners and toasts.
- Dismissal must not submit. Escape/Cancel/Close behaviour should be explicit; clicking outside must not accidentally discard meaningful writing.

## 4. Content containment — fix overflow at its source

Apply a common content contract to submitted revisions, published experience bodies, editor preview, moderation preview/comparison, timelines and notification text:

1. Text containers and flex/grid children can shrink: `min-width: 0`, an appropriate maximum width and border-box sizing.
2. Ordinary paragraphs, long URLs, headings, labels, feedback and unbroken words wrap within the available inline size.
3. Code blocks and genuinely wide data tables may scroll **inside their own bounded region**. They must not widen the page.
4. Inline code wraps when necessary; preserve code formatting in its dedicated scrollable block.
5. Long company names, display names, email addresses, badges and metadata wrap or truncate intentionally. Make the complete value available accessibly when truncating it.
6. Body/footer/header layout must not inherit a width from an oversized child.

Do not solve this by putting `overflow-x: hidden` on the whole document, shrinking text until it fits, or silently changing users’ writing.

Reproduce the submitted-review screenshot with a very long single word. Also test Markdown tables, fenced code, long links, nested lists and quoted content. The same fixture should be inspected in every view that renders the body.

## 5. Compact action menus

### Content and hierarchy

- Prefer short visible labels: **View submission**, **Read experience**, **Edit experience**, **View history**, **Withdraw submission**, **Unpublish** and **Delete**. Keep precise accessible labels and confirmation descriptions where needed.
- Use a view/read icon for reading and a pen icon for editing. The screenshot’s published reading action should not show an editing cue.
- Do not repeat Read experience in More actions when it is already the row’s primary destination. Keep a public-version link when a revision/draft is the primary task and that second destination is useful.
- Keep destructive items in a separated group. Use restrained danger text/icon treatment in the menu; reserve strong warning surfaces for the confirmation dialog.
- Standard action rows should be about 40–44 px high with consistent icon and text columns, left alignment and no inherited card/button shadows.
- Use a compact desktop width, normally about 220–260 px, growing only when content requires it. Fit the content rather than imposing an oversized minimum panel.
- Remove desktop Close options rows and mobile pseudo-element instructions from generic menus. Keep an explicit Close control on modal mobile sheets, where it serves a real navigation purpose.

### Placement and lifecycle

- Anchor to the selected trigger. Open below when space permits, flip above near the bottom, and clamp to the viewport with a small edge margin.
- Recalculate or close safely on resize, zoom, scroll and orientation change. Do not leave a popup detached from its trigger.
- Use a top-layer/popover or portal-based strategy so menu geometry is not clipped by a card, table or scroll container. Final API choice must include a capability fallback; no mandatory library addition is assumed.
- Limit scrolling to unusually long lists. Five short actions should not normally need an internal scrollbar.
- Allow only one transient action/account/notification popup to be active at a time. Moving from a menu action to a dialog closes the menu and transfers focus deliberately.
- Outside click and Escape dismiss without executing an action. Restore focus appropriately, particularly after a dialog or an item deletion. Avoid closing a form merely because its parent menu closed.
- On phones, a short menu may stay an anchored popover when it fits. Use a proper labelled modal sheet for longer lists; do not turn every disclosure into the same large fixed box.

## 6. Account: a recognisable personal home

Replace the generic avatar dropdown with an account-specific panel. Its first job is to reassure the user which account they are using and where their personal work lives.

```text
[Avatar]  User’s display name
          email@example.com
---------------------------------
My account                     →
My contributions              →
Saved for prep                 →
Notification preferences       →
[Moderation — admins only]      →
---------------------------------
Sign out
```

- The avatar remains the header trigger; give it a clear Account accessible name, expanded state and matching panel relationship.
- Render a visible display name and email in the identity header, with a graceful initials/photo-failure fallback. Do not rely on an avatar to communicate the My account destination.
- Keep the identity header non-interactive; provide an explicit **My account** navigation row. Each row has a clear label and consistent icon/alignment.
- Link to existing personal destinations rather than duplicating their contents. Notification preferences should open the correct section, not merely the top of the inbox.
- Show moderation only to eligible admins and retain server-side access enforcement. Keep personal unread activity separate from work-queue counts.
- Separate Sign out from routine navigation. Make its in-progress/error state clear and avoid an oversized red block in the default panel.
- Desktop panel target: roughly 300–340 px, constrained to screen edges. Phone presentation: a proper account sheet with identity at the top, reachable Close and stable space for its destinations.
- Do not add achievements, fabricated activity, gamification or unrequested profile editing. The account should feel personal through identity and useful navigation, not additional widgets.

## 7. Contributor detail and row refinements

- Pending submission header: use **Submission details** / **Pending review**, and describe its read-only state. Use “Saved automatically” only in editable contexts.
- Keep company, title, year and current review status in a coherent header. Constrain the reading column without forcing a narrow popup-like layout on desktop.
- Keep View history in detail and make its loading/error state local and readable. Long audit feedback must wrap correctly.
- Maintain aligned contribution-row action columns while allowing concise labels to fit. On phones, stack metadata and actions deliberately rather than compressing text into multiple awkward fragments.
- Check busy indicators and errors with More actions closed. An operation must remain understandable even after its launching popup disappears.
- Deleted/unpublished items should return the user to a valid list/context and a sensible focus target.

## 8. Whole-app audit matrix

Run a systematic sweep rather than checking only the four screenshots:

| Area | States to inspect |
| --- | --- |
| Shared header/account/bell | Open near edges; long identity; photo failure; zero/large unread count; keyboard and touch; sign-out pending/error |
| Browse and company pages | Long names, empty results, filters open, company options, placement-statistics disclosure, direct-link return paths |
| Reader | Short and pathological Markdown, long title, experience options near page end, report dialog, vote pending/error, unavailable content |
| My contributions | Draft, pending, changes requested, published with a revision, long feedback/title; every menu; confirmation; local pending/error; recovery drafts |
| Editor/submission | Long writing, validation errors, preview, metadata, format/save options, conflict recovery, read-only revision and timeline |
| Notifications/preferences | Long messages, category/Unread combinations, item/bulk menus, archive undo, follow management, stale/offline/error states |
| Moderation | Queue/filter menus, selected detail, long comparison/code, feedback, decision confirmation, stale review and return-to-queue |
| Statistics/account page | Filters, long company/branch values, table-local scrolling, selected batch and return links, identity content at large text sizes |

Classify findings as **reproduced**, **shared-component risk**, **fixed** or **deferred with a reason**. Record the route, persona, viewport, theme, trigger, expected behaviour and verification for every reproduced defect. Do not invent findings to fill a quota or claim a finite audit guarantees a bug-free app.

## 9. Accessibility and responsive quality bar

- Test 320, 390, 768, 1280 and 1920 px widths, plus a short desktop viewport where downward-opening menus commonly fail.
- Test both themes, browser zoom at 200%, increased text size, reduced motion and a phone keyboard-open form state.
- Menus/sheets/dialogs need visible focus, correct expanded/label relationships, reachable Close/Cancel, keyboard operation and reliable focus return.
- Do not apply complex menu ARIA roles unless implementing their complete keyboard behaviour. Use normal buttons/links for navigation lists and genuine dialog semantics for forms/modal sheets.
- Dialog content should have one intentional scrolling region. Header, close control and send/cancel actions must remain reachable in the visible viewport.
- Avoid hover-only controls, tiny hit targets, nested independent scrollbars and global overflow suppression.

## 10. Implementation order after approval

1. Add regression fixtures that reproduce long-word overflow, bottom-edge menus, the expanded report form and the account panel’s missing visible identity.
2. Define separate compact-menu, task-dialog/sheet and account-panel primitives, including placement, dismissal and focus handoff. Consolidate conflicting shared styles.
3. Move reporting into the dedicated task UI and fix content containment across all Markdown surfaces.
4. Apply the compact menu model to contribution rows, reader utilities, notification actions, writing/save options and moderation decisions.
5. Build the account panel and correct contextual copy, labels and icons.
6. Sweep the audit matrix, patch related defects, and inspect desktop/mobile screenshots of the actual open/error/busy states.
7. Run relevant unit/backend regressions, focused browser checks, the production build and visual acceptance review. Update affected old UI tests to the approved interaction model instead of leaving stale selectors as the only coverage.

## 11. Acceptance criteria

1. Report experience opens a usable standalone form; it never expands inside an action menu.
2. A long unbroken submission body does not create document-level horizontal scrolling on desktop or phone.
3. Wide code/tables scroll locally where necessary, with surrounding content still contained and readable.
4. A More actions menu opened on the last visible row stays inside the viewport and uses the appropriate opening direction.
5. A short desktop menu has compact rows, no unnecessary scrollbar and no redundant Close options entry.
6. Reading actions use concise labels and appropriate icons; duplicate primary destinations are removed where redundant.
7. The account panel visibly identifies the signed-in user and labels every personal destination, including My account.
8. Long names/emails and failed profile photos do not break the account panel or header.
9. Only one transient popup is active; opening a form or confirmation gives it independent geometry and focus handling.
10. Phone sheets and report controls remain usable with the keyboard open and do not sit behind bottom navigation.
11. Error, sending, disabled, empty and deleted-target states fit the same layouts; no critical action is clipped.
12. Regression checks cover pathological content and opened overlays, not just ordinary text and closed screens. Screenshot review is required before reporting visual completion.

## 12. Approval boundary

Approval authorises the UI repairs and audit above, including replacing the generic dropdown treatment for reports and accounts. Preserve content, routes/deep links, privacy, permissions, moderation confirmations, draft recovery and notification behaviour. No production database cleanup, new user-facing data collection, deployment or unrelated rebranding is included.

**Next step: user approves or amends this plan. No application implementation begins before that response.**
