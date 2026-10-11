# Frontend enhancement action plan

**Scope:** Company Procedures first; light polish for statistics and account screens. Leave the landing page untouched. Retain the existing cream/white surfaces, blue accent, fonts and overall identity. Notifications stay in-app. Implemented locally on 11 October 2026. No commit or deployment.

## 1. Shared controls and click targets — first priority
- [x] Standardize primary, secondary, destructive and icon buttons, including hover, focus, pressed, loading and disabled states.
- [x] Make everyday controls at least 44 × 44px; use 48px targets for important phone actions. Enlarge the actual clickable region, not just the visible icon.
- [x] Make navigation links, disclosure headers, checkbox labels and queue rows clickable across their full intended area. Give experience cards a generous title/read link area while keeping Save, Vote and Compare separate; avoid nested buttons or links.
- [x] Use a consistent local SVG icon set for search, filters, save, notifications, share, edit, delete, back and formatting. Keep text beside unfamiliar actions and accessible names/tooltips on icon-only buttons.

## 2. Navigation that feels like a finished product
- [x] Keep desktop app navigation and the phone bottom bar consistent, with unmistakable active destinations. Retain the Statistics “More options” hint and selected batch behavior.
- [x] Give Company Procedures one compact, consistent navigation area: Browse experiences, Saved for prep and My contributions; place Share, Notifications and admin Moderation as clear utility actions.
- [x] Reduce repeated headings and competing back links. Use a compact page title and one contextual back/breadcrumb path on company, experience and editor screens.
- [x] Preserve filters, list position and relevant view state when returning from details. Make browser Back work naturally and restore keyboard focus to the originating item where possible.

## 3. Company Procedures discovery and reading
- [x] Polish the search/filter bar: search icon, clear input action, visible result/update status, removable filter chips, and advanced filters in a phone sheet with Apply and Reset.
- [x] Make cards easy to scan: company logo/name, experience title, year/role, coverage and outcome, followed by clearly separated reader actions. Use consistent spacing and alignment.
- [x] Improve the company hub with a compact identity header, relevant company context and clear experience grouping; keep secondary information expandable.
- [x] Improve article rhythm, heading spacing and reading width. Group Save/Vote/Share controls near the content and keep Questions and Report easy to find.
- [x] Give Saved and Compare a clear selection/removal flow; prevent trays and sticky controls from covering content or the phone bottom bar.

## 4. Contributor workflow
- [x] Keep the quick path short: one company picker, essential details, writing and Submit. Keep optional details in clearly labelled expandable sections.
- [x] Refine the editor toolbar with familiar icons, visible active formatting, generous targets and accessible keyboard shortcuts. Preserve formatting toggles, Clear all confirmation and writing recovery.
- [x] Make Write/Preview switching predictable on phones; retain cursor/scroll position and keep the main action reachable without covering the editor or keyboard.
- [x] Show one calm, accurate save indicator and field-level validation. Give submission success a clear next step; preserve writing on errors.
- [x] Make My contributions easy to manage with readable statuses, large Continue/Edit/View controls, and a separate content-management menu with explicit delete/unpublish confirmations.

## 5. Admin workflow
- [x] Clarify review, discussion and report navigation with accurately labelled counts and selected states.
- [x] Improve queue density and full-row selection; keep search/filter controls aligned. On phones, separate queue browsing from focused review with an obvious Back to queue action.
- [x] Keep review decisions together and easy to reach; distinguish Approve, Request changes and Reject/Unpublish through labels, icons and semantic color.
- [x] Preserve feedback and queue context after failures or decisions. Keep history and secondary metadata expandable, with clear conflict/reload guidance.

## 6. Spacing, color and motion
- [x] Apply a shared 4/8px spacing scale: consistent field gaps, card padding, section separation and action groups. Audit crowded layouts at 320–430px and wider screens.
- [x] Reserve blue for navigation/primary actions, green for confirmed success, amber for attention/pending states, and red for errors/destructive actions. Pair every status color with readable text or an icon; keep adequate contrast.
- [x] Add restrained 120–180ms hover/press feedback and 180–240ms sheet/dialog transitions. Use opacity/transform motion, small button press effects and gentle icon state changes; avoid animating layout dimensions or every page element.
- [x] Keep current content visible while refreshing; use stable placeholders for initial loading and concise feedback after Save, Vote and moderation actions. Do not show success before confirmation or move users' focus unexpectedly.
- [x] Respect reduced-motion preferences, preserve visible keyboard focus and avoid essential information that appears only on hover.

## 7. Final polish and release checks
- [x] Apply shared control/spacing improvements to statistics and account screens; preserve existing statistics layout, batch selection and all working routes.
- [x] Verify viewer → search/read/save/compare, contributor → write/recover/submit/manage, and admin → review/feedback/decision flows on desktop and phones.
- [x] Check touch targets, keyboard navigation, accessible labels, semantic-color contrast, narrow viewports, slow/error states, safe areas and narrow-screen input sizing. Check the on-screen keyboard on a physical phone during release testing. Run typecheck/build and relevant existing tests after each functional change.
- [x] Confirm the landing page has no visual or behavioral changes. Review locally before any commit or deployment.

**Implementation order:** shared controls/targets → navigation → discovery/reading → contributor → admin → motion/spacing consistency → responsive and accessibility checks. Each stage must keep existing functionality working.


## Local implementation notes
- Shared polish is in `src/enhancements.css` and the local SVG icon component. Styles are scoped to app screens, with reduced-motion handling; the landing page is excluded.
- Phone discovery keeps company/sort visible and moves year/coverage/outcome/round into an Apply/Reset sheet. Existing URL filters and return state remain supported.
- Card title/read areas, disclosure headers, editor tools and moderation queue rows have larger targets. Phone preview and focused review views reduce competing controls.
- Save, submit, approve, withdraw, delete and notifications retain their existing backend behavior. No new service, email setup, credentials or billing is needed.
- Verification uses existing unit, build and desktop/phone browser checks, including a new filter-sheet cancellation/application test. Physical-device keyboard testing remains a release follow-up.
- Validation completed: production build and 43 unit tests passed; desktop/phone flows passed, including 320/390/430px layouts. The editor flow passed three consecutive runs per device after fixing formatting selection timing.
