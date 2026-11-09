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

The floating public navbar now has rounded corners and compositor-only compression/reveal transitions. `useScrollHeader.ts` accumulates downward scroll intent, hides the surface after leaving the page top, and reveals it on any upward movement. Keyboard navigation and focus restore it; reduced motion disables transition animation. Passive scroll events are coalesced through one animation frame, with no layout-height changes.

The experiences feature is now an open field-guide composition: a textured ink-blue cover, understated binding and an interactive paper leaf. Light mode has crisp blue-white paper; dark mode has neutral charcoal and blue-gray surfaces. The existing assessment/interview/preparation controls still update the page. The beta label is removed.

## Sharper Voronoi edges

The previous 380k/140k raster budgets stretched a low-resolution canvas across the footer. Rendering now targets roughly 1.5–2 pixels per CSS pixel (bounded by an adaptive 3.5M-pixel budget, with native CSS resolution as the floor). The Voronoi shader uses high-precision float arithmetic to avoid coarse edge calculations. A fractional-DPR-safe resolution floor handles browser zoom correctly; a 125%-DPR visual check rendered a 1521×558 CSS surface at 2282×837 backing pixels.

Animation advances at 30fps and stops offscreen, in hidden tabs, or when paused. The static SVG fallback remains available for reduced-motion/save-data and graphics failure.

Verification: production build/typecheck and 55 unit checks passed. Fourteen focused desktop/mobile checks passed across navigation, notebook interactions/contrast, logo visibility and Voronoi behavior; eight shader-specific checks passed again after the fractional-DPR refinement. Light/dark desktop and mobile screenshots were inspected, including native-resolution cell edges and the compress/reveal behavior.


The field-guide palette was refined to remove teal, olive and yellow casts: neutral graphite cover, blue-white page and pale blue surround in light mode; ink-black, slate-blue and cool white in dark mode. Layout and interactions are unchanged. The build and two desktop/mobile contrast/interaction checks passed; both themes were visually inspected.

## Visible motion and cursor-responsive Voronoi

The sharp renderer was advancing, but a 0.12 time multiplier made the cell cycle take about 52 seconds and its small whole-surface parallax barely registered. The shader now advances at 0.55 (roughly an eleven-second cycle), with frame-rate-independent pointer easing. A local screen-space lens bends nearby cells and shifts their animation phase around the cursor, then eases away when the pointer leaves. Text and buttons remain stationary; touch scrolling is unaffected.

The 30fps scheduling, high-resolution canvas, offscreen/hidden-tab suspension, shared pause control and reduced-motion/save-data fallbacks remain intact. Regression checks now sample actual GPU pixels at a fixed animation time to distinguish cursor deformation from clock changes, and verify frozen pixels while paused. All eight focused desktop/mobile shader checks, all 55 unit tests and the production build/typecheck passed. The rendered dark-mode footer was visually inspected. The existing large-bundle build advisory remains.
