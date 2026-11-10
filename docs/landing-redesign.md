# Landing V2: the pathway loom

The landing and login now share an editorial identity: Instrument Serif statements, electric-blue pathways, paper/ink structure and the application's existing theme state. The page explains three actual student benefits through distinct interactive compositions, rather than a generic feature grid.

## Experience

- A full-hero SVG pathway field sends animated signals across a registration grid. It remains available without WebGL and follows the same pause/reduced-motion policy as the foreground experience.
- The original Three.js **pathway loom** uses three procedural woven ribbons, custom GLSL surface/point materials, instanced traveling packets, projected HTML company controls, selected-node pulses, pointer damping and scroll-linked spatial changes. A sculpted flame with an open heart and suspended ember anchors the center; the hero has no year labels, batch controls or record caption. An icon-only pause/play control remains available. The geometry is conceptual; no particle counts or dimensions claim placement outcomes.
- Records appear as an interactive, source-backed dossier with curated companies for each batch. Actual role and reported CTC snippets are tied to individual source announcement IDs and checked by unit tests. They are selected records, not company-wide averages.
- The blue hiring workbench explores assessment, interview and preparation information. Community experiences are live in beta and reviewed before publication; the page does not claim verified alumni identities.
- A placement handoff board connects company choices with useful interview, role and preparation questions, then leads into existing company records where available LinkedIn profiles appear beside selected candidates. No individual names, contact details or private API requests appear on the public page. Profile availability varies.
- Google sign-in uses the original `GoogleButton` and popup/security logic. Its new visual treatment has layered depth, magnetic pointer response, a sliding hover surface, animated arrow, clear focus and press/loading feedback. Protected destinations retain their existing return flow.
- Login reuses the same branding, field, scene, sign-in treatment and theme control, while retaining existing reauthentication/sign-out states.

## Implementation boundaries

`LandingPage.tsx` and `LoginPage.tsx` own public layouts; `LandingChrome.tsx` shares navigation, footer and sign-in presentation. `motion.tsx` centralizes motion policy and lightweight interaction hooks. `ArchiveIndex.tsx` retains semantic HTML controls and an SVG fallback; `ArchiveScene.ts` stays behind a lazy import.

Public themes previously had an explicit light-only exception in `ThemeControl.tsx`. That exception is removed: both pages now follow the same saved/system preference and existing ripple/slap toggle mechanism as authenticated pages. Theme-specific landing tokens also update the GPU materials without rebuilding the context. Application layouts and data logic are unchanged.

The previous hero used fixed minimum heights alongside typography scaled only to viewport width. The replacement accounts for header size, viewport height and content dimensions. At ordinary desktop/laptop heights, the sign-in action and navigation cue fit; at smaller sizes, content can grow naturally rather than being clipped. Mobile has its own typography, scene dimensions, section ordering and controls.

## Performance and accessibility

- One renderer; no new runtime dependencies beyond the Three.js dependency introduced in V1.
- GPU scene loads near the viewport; reduced-motion/save-data visitors receive the SVG and do not download Three.js.
- 30fps cap; DPR capped at 1.5 desktop/1.25 narrow viewports; no postprocessing or shadow maps.
- Hidden/offscreen scenes stop requesting frames. Unmount disposes geometry, materials, textures, instancing resources and WebGL context.
- A page-wide motion control stops the GPU, background pathways, decorative CSS and entrance transitions. Keyboard navigation, native buttons, live content announcements, a skip link and touch scrolling remain available.
- Context loss or unavailable graphics restores the themed SVG. Failed hero logos retain company text. Company logos preserve their original proportions against a neutral brand-safe surface.
- Fonts remain self-hosted with OFL licensing and a metric-adjusted fallback. No proprietary font service or animation framework was added.

## Data provenance

`archive-data.ts` contains only source-verified 2025/2026 examples, using source-specific route keys. `tests/landing-archive.test.ts` checks those combinations against the checked-in fixtures. IBM remains excluded because it appears only in the hidden 2027 data.

The original supplied [reference](https://github.com/Team-Managed/EVM-Web3MCP/blob/main/apps/website/components/HeroRibbonWave.tsx) was inspected during V1. This implementation uses original 3D woven pathways and SVG route traces, rather than that implementation's ASCII/dither ribbon.

## Verification commands

- `npm test`: unit suite, including source/example validation.
- `npm run test:landing`: isolated Firebase auth/firestore/functions emulators and desktop/mobile browser scenarios; requires Java 21+ and Playwright Chromium.
- `npm run build`: linked-profile generation, backend compilation, TypeScript and production bundling. No lint command is configured in this project.

Browser scenarios cover genuine sign-in return paths, popup cancellation, keyboard controls, no anonymous private reads, 320–1920px layouts, short laptop heights at default page scale, persisted themes across public routes, source/experience/contact controls, reduced motion, save-data, WebGL/context failure, missing logos and delayed fonts. Manual rendered inspection covers light/dark desktop, mobile and login layouts.

No production accounts, database content or deployment are changed by this work.

## Completed validation (V2 baseline)

- 53 unit checks passed.
- All 20 desktop/mobile browser scenarios passed against isolated emulators (36.9s).
- Final production build and TypeScript checks passed. Vite retains a large-chunk advisory; the GPU module is separate and lazy-loaded (approximately 136KB gzip).
- Rendered light/dark desktop, tablet, mobile and login previews were inspected. Twelve repeated landing/login transitions produced no runtime errors or graphics warnings. The final shader color-space refinement was rebuilt and visually checked in both themes.
- Final previews are under `artifacts/landing-v2-*` and `artifacts/login-v2-*`; browser, unit, build and visual logs use the `artifacts/v2-*` prefix.


## Landing follow-up

The horizontal-scroll root cause was the translated full-width background mask. The mask now remains stationary; an overscanned SVG moves inside it. Regression checks compare scroll width with the document client width (excluding the scrollbar), including pointer movement at both edges, both themes and mobile/tablet/desktop viewports. No page-wide overflow hiding is used.

The records use source-backed 2025 and 2026 company examples with roles and CTCs from individual announcements. The hero is independent of batch count; its SVG and GPU center use a shared flame outline. `PeopleHandoff.tsx` owns the company-to-senior guidance board without exposing or fabricating personal details.

Follow-up verification: 55 unit checks and all 26 desktop/mobile browser checks passed, including pointer-edge overflow, source-backed preview changes, year-independent hero navigation and the senior-question handoff. The production build/typecheck passed. Rendered light/dark mobile, tablet, desktop and login layouts were inspected; no runtime or graphics warnings appeared during the visual checks. Phone record text was additionally checked at 320px and 393px for readable CTC sizes and non-overlapping columns.


## Highest-CTC preview and flame refinement

The 2025 preview now ranks the top three distinct companies by highest reported numeric CTC: Google (51.72 LPA), Goldman Sachs (30 LPA) and CrackedDevs (24.16 LPA). These individual source records are off-campus. The source fixtures leave two roles unavailable; web-researched estimates are marked “inferred” in the public preview, without changing the fixtures. A ranking check compares these examples with the complete source fixture. The 2026 selection remains unchanged.

The center mark is a curved, beveled flame with a negative-space heart, an inset ember, normal-based blue shading and subtle motion. `flame-mark.ts` supplies shared contours for the GPU geometry and reduced-motion/no-WebGL SVG. The requested hero description and company-record caption are removed. The animation control has an accessible label and icon, with no visible play/pause text.

Flame refinement verification: 55 unit checks and all 26 desktop/mobile browser checks passed, including exact 2025 ranking, missing-role disclosure, removal of the hero caption/copy, icon-only motion control and matching SVG fallback. Production build/typecheck passed. Light/dark, phone/tablet/desktop and login previews were checked with no runtime or graphics warnings.


## Copy cleanup and researched role estimates

Removed the requested hero sign-in helper, record-preview footer, people-section access notes, handoff footer and login privacy helper. The same repeated email/draft sentence was removed from the collapsed privacy disclosure.

The 2025 Goldman Sachs and CrackedDevs preview role estimates are marked with an asterisk and an explanatory tooltip. The current role titles are preserved as Software Engineer and Software Developer, respectively. These are role-family estimates, not verified KJSCE placement roles. Goldman Sachs’ [2025 Engineering Analyst FAQ](https://www.goldmansachs.com/careers/materials/india-echp-faqs.pdf) explicitly describes software engineering for that cohort. A [public first-person resume](https://cdn.isujith.dev/Sujith_Resume.pdf) lists Software Engineer at CrackedDevs in 2025; that person is not evidence of the individual KJSCE placement. Metadata retains the inference note and source; the base placement datasets remain unmodified.

Cleanup verification: build/typecheck and 55 unit checks passed. Four focused desktop/mobile browser checks passed for removed copy, preview content and clearly labelled inferred roles. Updated light/dark mobile/tablet/desktop/login renders had no runtime or graphics warnings.


## Voronoi closing section

The closing chapter now uses the selected [Paper Voronoi shader](https://shaders.paper.design/voronoi) instead of the large decorative arrow. Cream/blue cells in light mode and ink/blue cells in dark mode fade into a quiet text area. Mouse movement adds damped parallax and a slight rotation; a local icon-only control shares the page-wide animation pause state.

`ClosingSection.tsx` lazily loads `VoronoiScene.ts` near the viewport. The standalone zero-dependency `@paper-design/shaders` package is pinned to 0.0.82 as recommended by its maintainers. The shader chunk is about 26KB gzip. Resolution is capped at 380,000 desktop pixels / 140,000 narrow-screen pixels. The package suspends animation offscreen and in hidden tabs; unmount disposes graphics, observers and event handlers.

A deterministic local SVG tessellation supplies the static background when motion/data-saving preferences disable GPU loading or graphics fail. The texture stays within the section and does not intercept links or scrolling. The npm package retains its Apache-2.0 license and NOTICE.

Final pre-push validation: production build/typecheck and all 55 unit checks passed. Ten focused desktop/mobile browser scenarios passed for record previews, copy cleanup, inferred-role indicators, lazy shader loading, themes, pointer response, pause, reduced motion/save-data and graphics/context-loss fallbacks. Rendered closing sections in both themes and mobile were inspected with no runtime errors.

## Floating navigation and quieter experiences

The public header now floats within inset paper/ink borders and uses native sticky positioning throughout scrolling. Section and focus scroll margins keep headings clear of the bar. The root establishes its own formatting context to prevent the header margin exposing an unthemed strip; login retains its flex layout.

The experiences section now uses pale blue paper in light mode and muted ink-blue in dark mode, with a static low-contrast assessment-sheet dot/rule texture. Blue is concentrated on the active step and editorial emphasis. A neutral workbench surface separates interactive content from the patterned background.

The authentic JPMorgan wordmark now appears in hero, records and people controls, with preserved proportions on a neutral brand surface. Failed logos fall back to readable company labels. Verification: production build/typecheck, all 55 unit checks and four focused desktop/mobile browser checks passed. Browser checks cover persistent navigation, unobscured exploration headings, narrow layouts, visible logo assets, interactive rounds and text contrast of at least 4.5:1 in both themes. Rendered light/dark desktop and mobile previews were inspected.

## Rounded directional navigation and interview field guide

The floating public navbar has rounded corners and compositor-only compression/reveal transitions. `useScrollHeader.ts` measures travel from directional high/low points: 40px downward hides the bar beyond the first 160px, while 72px upward reveals it. Small reversals and inertial bounce do not toggle visibility. The first 80px, keyboard navigation and focus restore it immediately; reduced motion disables transition animation. Mobile browser chrome changing viewport height no longer resets visibility; width changes still restore the bar. Passive scroll events are coalesced through one animation frame, with no layout-height changes.

The experiences feature is now an open field-guide composition: a textured ink-blue cover, understated binding and an interactive paper leaf. Light mode has crisp blue-white paper; dark mode has neutral charcoal and blue-gray surfaces. The existing assessment/interview/preparation controls still update the page. The beta label is removed.

## Sharper Voronoi edges

The previous 380k/140k raster budgets stretched a low-resolution canvas across the footer. Rendering now targets roughly 1.5–2 pixels per CSS pixel (bounded by an adaptive 3.5M-pixel budget, with native CSS resolution as the floor). The Voronoi shader uses high-precision float arithmetic to avoid coarse edge calculations. A fractional-DPR-safe resolution floor handles browser zoom correctly; a 125%-DPR visual check rendered a 1521×558 CSS surface at 2282×837 backing pixels.

Animation advances at 30fps and stops offscreen, in hidden tabs, or when paused. The static SVG fallback remains available for reduced-motion/save-data and graphics failure.

Verification: production build/typecheck and 55 unit checks passed. Fourteen focused desktop/mobile checks passed across navigation, notebook interactions/contrast, logo visibility and Voronoi behavior; eight shader-specific checks passed again after the fractional-DPR refinement. Light/dark desktop and mobile screenshots were inspected, including native-resolution cell edges and the compress/reveal behavior.


The field-guide palette was refined to remove teal, olive and yellow casts: neutral graphite cover, blue-white page and pale blue surround in light mode; ink-black, slate-blue and cool white in dark mode. Layout and interactions are unchanged. The build and two desktop/mobile contrast/interaction checks passed; both themes were visually inspected.

## Visible motion and cursor-responsive Voronoi

The sharp renderer was advancing, but a 0.12 time multiplier made the cell cycle take about 52 seconds and its small whole-surface parallax barely registered. The shader now advances at 0.55 (roughly an eleven-second cycle), with frame-rate-independent pointer easing. A local screen-space lens bends nearby cells and shifts their animation phase around the cursor, then eases away when the pointer leaves. Text and buttons remain stationary; touch scrolling is unaffected.

The 30fps scheduling, high-resolution canvas, offscreen/hidden-tab suspension, shared pause control and reduced-motion/save-data fallbacks remain intact. Regression checks now sample actual GPU pixels at a fixed animation time to distinguish cursor deformation from clock changes, and verify frozen pixels while paused. All eight focused desktop/mobile shader checks, all 55 unit tests and the production build/typecheck passed. The rendered dark-mode footer was visually inspected. The existing large-bundle build advisory remains.

## Social sharing preview

The public deployment returned HTTP 200 to `Twitterbot/1.0`, but its initial HTML contained neither Open Graph nor X card metadata. `index.html` now supplies a canonical production URL, title, description, absolute image URLs, image dimensions/alt text and `summary_large_image` card metadata before JavaScript runs. A static 1200×630 PNG in `public/social/` uses the landing page's serif typography, off-white background and electric-blue network motif. It contains no private data and is about 86KB. `public/robots.txt` provides a plain-text crawler policy.

Regenerate the committed image with `node scripts/generate-social-preview.mjs`; it uses the existing Playwright dependency and local fonts, with no runtime image-generation service. Production build/typecheck passed. HTTP checks against the built site using the Twitterbot user agent verified the raw HTML metadata, matching Open Graph/X image URLs, PNG content type and dimensions, and robots response. The image was visually inspected. Deployment is required before the public URL receives these changes; an actual X DM preview was not tested.

## Animation when WebGL fails

The previous graphics-failure path silently displayed a static SVG while still exposing a pause control. The supplied screenshot appeared to show that fallback; WebGL animation itself was reproducible in a fresh Chromium session against the user's local server, so the exact failure in their existing browser session was not confirmed.

Shared shader uniforms and varyings now explicitly match the vertex shader's precision for stricter GPU drivers, and failed program linking is detected. Initial GPU failure or context loss switches to a lazy Canvas 2D renderer with genuinely moving Voronoi sites and damped cursor repulsion. It preserves the theme, bounded high-resolution canvas and pause state, stops offscreen/in hidden tabs, and disposes its observers and handlers. The fallback adds about 1.5KB gzip and no dependency. Reduced motion/save-data still use the static SVG; if neither renderer is available, the static background remains and no misleading playback control is shown.

Eight focused desktop/mobile scenarios passed across GPU rendering/pointer pixels, context-loss recovery, blocked-WebGL animation/pause/resume, resolution and motion/data-saving preferences. The desktop GPU scenario was rerun in isolation after a development reload interrupted its earlier run. The final Canvas fallback was visually inspected in dark mode.

## Fresh sharing URL after the first empty X preview

Live requests using `Twitterbot/1.0` confirmed that the deployed homepage already returned its card tags, the 1200×630 PNG returned `image/png` with HTTP 200, and robots allowed access. The remaining DM failure could therefore not be attributed to missing deployed metadata; X retaining the earlier empty result is a hypothesis, not a confirmed diagnosis.

The production build now emits `/share/` with its own canonical/Open Graph URL and a content-hashed image path. This provides a fresh page/image identity instead of repeatedly sharing the previously fetched homepage URL. It serves the same built landing application and auth controls without crawler-only content, redirects, or JavaScript-generated metadata. Vercel routes `/share` and `/share/` to that document. Use `https://kjsce-placements.vercel.app/share/` when testing a new DM. The application cannot purge X's own cache or modify previews in existing messages.

Validation: production build/typecheck, all 55 unit checks, raw production-output HTTP checks for both URLs and hashed PNG dimensions/content type, and a browser check of the share page's landing headline and Google button passed. Actual X DM rendering is not asserted by these checks.

After pushing, Vercel reported a successful deployment and the public `/share/` HTML returned its own card URL. A request during alias rollout briefly received old SPA HTML for the new image path; later requests returned the correct PNG. Social-image paths are now excluded from the SPA catch-all, so unavailable images cannot masquerade as successful HTML responses. Verify both the HTML and image content type after deployment, rather than relying on HTTP 200 alone.

## Direct sign-in without a separate login page

The standalone login page and its styles are removed. Header sign-in, the hero Google button and the closing CTA all invoke the existing Google popup directly. Legacy `#login` links resolve to the landing page. Unauthenticated protected URLs render the landing page without changing their hash, so successful sign-in continues to the original destination; a short contextual hint explains this. Account recovery, auth errors, busy-state guards and Google-only access checks remain intact.

Production build/typecheck and all 55 unit checks passed. Eight desktop/mobile Auth-emulator browser checks cover all three popup entry points, cancellation/retry, legacy login links, preserved protected destinations, theme persistence and narrow/short viewports. The protected-route checks validate authentication/navigation; they do not assert backend data availability in the auth-only emulator run.

## Scroll-driven experience and alumni chapters

Explore is removed from the navbar; the hero's existing archive cue remains. Two short native-scroll sequences now drive the assessment/interview/preparation pages and the alumni interview/role/preparation prompts. Panels pin only when they fit comfortably below navigation; smaller or shorter viewports use normal document flow, tracking the interactive content instead of trapping oversized panels. Scrolling upward reverses the sequence. A small threshold prevents boundary flicker; tab clicks take priority until meaningful scrolling resumes.

The visual treatment adds a continuous progress rule, dimensional page/number entrances, active connection branches and subtle ticket perspective. No wheel/touch events are intercepted and no animation library is added. Updates use passive scroll events coalesced into one frame; React state changes only at stage boundaries. Reduced-motion/save-data retain manual stages without pinning or added animation. Background pause does not collapse chapter heights or move the page.

Validation: production build/typecheck, 55 unit checks and ten focused desktop/mobile browser scenarios passed. Both scroll sequences passed again after the final pause-layout and boundary refinements. Checks cover forward/reverse progression, manual controls, pinned visibility, overflow, reduced motion, navigation, themes and notebook interactions. Desktop chapter previews and a dark-mode mobile viewport were visually inspected.

## Stable, readable alumni card

The alumni panel was about 708px tall, exceeding the pinning budget on typical laptop viewports. It therefore scrolled away while its questions advanced, with additional perspective/rotation moving the text. Laptop spacing now fits the full panel into approximately 576px without shrinking touch targets. The ticket remains flat; question changes use only a brief opacity transition, with no blur or translation. At 1536×730 the panel stays at y=112 and ends around y=688 throughout the sequence, including its profile link.

The alumni story now auto-advances only when its entire composition can be pinned. Oversized/narrow layouts retain normal scrolling and manual question tabs, preventing text changes mid-read. The experience story is unaffected. Six focused desktop/mobile checks passed, including fixed card position, complete card/link visibility across all stages at 1280×720, 1366×768, 1536×730 and 1920×916, manual behavior on phones and reduced motion. The matching dark laptop viewport was visually inspected; production build/typecheck passed.

## Distinct archive and directory stories

The written-experience section now leads with “The process. In their words.” Its copy and CTA describe saved assessment/interview accounts and preparation write-ups. The people section leads with “Find a senior. Start a conversation.” It describes company-wise LinkedIn discovery and direct outreach. Its examples cover day-to-day work, a senior's career path and introducing yourself, rather than repeating interview/preparation topics from the archive. Company-specific links and the existing access controls are unchanged; no in-app messaging or fabricated conversations are implied.

The connection graphic now normalizes all paths to the same length. A rounded moving head and soft trailing stroke follow only the selected branch on a 3.2-second loop, replacing the eight-second dash with its long inactive gap. Endpoints reinforce the selected destination. No text or card motion is added; reduced motion/pause stop the trace.

Production build/typecheck and eight focused desktop/mobile checks passed for distinct messaging and destinations, actual trace movement, reduced motion, keyboard controls, layout/overflow, privacy and stable laptop card visibility. Both sections were visually inspected in light and dark laptop viewports.

## Consistent identity inside the application

`identity.css` owns the locally hosted Lora faces and the light/dark paper, ink, blue and surface tokens. The landing page aliases those shared values; the signed-in workspace uses the same foundation. Dark mode restores blue accents and distinct success/warning/error colors instead of monochrome controls. The app header now carries the same blue editorial mark and an inset rounded frame. Selected areas/tabs use blue underlines, page introductions use the editorial serif, and data labels, tables and form controls keep their readable sans/monospace typography. Surface borders and offset shadows are quieter, with modest corner radii on major cards.

The changes apply through the existing shell to statistics, community browsing/writing, account, notifications and admin. Navigation destinations, authentication, data, permissions and application behavior are unchanged. `workspace-identity.css` scopes presentation to the authenticated app; no landing animation or scroll effects are introduced into working screens.

Validation: 55 unit tests passed. Four browser scenarios passed with isolated Auth/Firestore/Functions emulators, covering public landing regression and seven signed-in screens in light/dark themes on desktop/mobile, plus 320px containment, account menus, actual admin overview data, heading typography and text contrast (primary ≥7:1, secondary ≥4.5:1 against the page). Home, procedures, dashboard, admin and account-menu screenshots were visually inspected. Existing theme assertions were updated to the shared palette. Production build/typecheck passed; the existing large-bundle advisory remains.

## Detached workspace navigation and Lora typography

The Placement Stats / Company Procedures switcher now sits directly below, and outside, the rounded header frame. Its desktop alignment and destinations remain unchanged; phones retain the existing bottom navigation. Lora replaces Instrument Serif throughout headings, editorial marks and the generated social-preview image, paired with the existing sans-serif interface and monospace metadata. Variable normal/italic fonts are hosted locally with their OFL license, including Latin extended coverage. The former font files are removed.

Headline sizes and line heights are adjusted for Lora's wider proportions across the landing page and workspace. Browser checks cover detached navigation placement, typography, light/dark themes, narrow layouts, delayed font loading, stable alumni cards and authenticated screens.

## Workspace navigation refinement

The detached boxed switcher becomes an open navigation rail with a shared baseline, larger section names and a single blue active underline. This establishes the two application areas above the smaller page-level navigation without adding another card. The header uses a compact surface, soft shadow, quiet rounded utility buttons and a separated account anchor. Link destinations, unread indicators, keyboard focus and the existing mobile bottom navigation remain intact.

Validation: production build/typecheck and both focused desktop/mobile workspace scenarios passed. Screens in both themes, account controls, active-rail styling, 320px containment and admin navigation were checked; desktop and mobile screenshots were visually reviewed.

## Shared header chrome and icon-only notifications

`product-header.css` applies one paper background, ink border, rounded capsule, shadow, width, brand typography and circular utility treatment to both the landing and signed-in headers. Existing landing scroll behavior and workspace routes are retained. Notification navigation displays the bell and unread badge, with the name retained through aria-label and tooltip. The section rail explicitly uses visible overflow: the inherited horizontal-auto rule had also made the active underline create a tiny vertical scroll container.

Validation: four focused public/workspace desktop/mobile browser scenarios passed, including both themes, icon-only accessible notification entry, rail overflow and 320px containment. The shared circular border was additionally checked against the resolved CSS cascade; production build/typecheck passed.

## Shared product footer

The landing page and workspace now render `ProductFooter` with the same brand lockup, source/privacy disclosure and author links. Shared styling sets their typography, paper/ink colors, divider and responsive layout. Only the home destination and space for the existing mobile app navigation differ. The workspace retains its existing back-to-top portal target. Six browser-rendered layout checks compared public/workspace footer styles and opened disclosures at 1280, 393 and 320px in both themes; desktop and mobile screenshots were reviewed. Production build/typecheck passed.

## Landing copy pass

Rewrote marketing headings, descriptions, round explanations, senior prompts and calls to action around student questions: who hired, what was asked, and whom to contact. Fixed navigation labels, company/role/pay values and auth control names remain literal. The shared footer disclosure uses plainer wording with its factual limits intact. No styles, structure, routes or animation behavior changed for this pass.

Copy length and rendered height were compared before/after at 320, 393, 1280 and 1440px; the measured main headings and paragraphs keep their original heights. A laptop visual review prompted one shorter senior heading to retain its line count there too. Eight focused desktop/mobile browser scenarios passed for delayed fonts, real records, overflow, distinct directory content and stable scroll cards. Production build/typecheck passed, and both supporting sections were visually reviewed in light/dark mode.

## Placement-season toolkit positioning

The hero now introduces a KJSCE-specific toolkit for final-year placement season: “Your season. Your edge.” followed by clear stats, campus rounds and alumni in one toolkit. Supporting copy separates typical pay/hiring analysis with visible sources and gaps, alumni accounts of KJSCE company rounds, and company-wise LinkedIn discovery for direct seniors. No claim of exclusive access, verified alumni identities, guaranteed outcomes or misconduct in college reporting is introduced. Legal/source disclosure and data are unchanged.

The main text blocks retain their previous heights at 320, 393, 1280 and 1440px. Eight focused desktop/mobile scenarios and the production build/typecheck passed. Desktop/mobile hero and the supporting laptop sections were visually reviewed. This pass changes copy and matching test expectations only.

Final headline refinement: the hero reads ‘Don’t prep / in the dark.’ and the closing section reads ‘Stats. Rounds. / People to ask.’ Text heights remain unchanged at the four checked widths, with no layout or behavior changes. Browser containment checks, typecheck and production bundle generation passed.
