# Landing V2: the pathway loom

The landing and login now share an editorial identity: Instrument Serif statements, electric-blue pathways, paper/ink structure and the application's existing theme state. The page explains three actual student benefits through distinct interactive compositions, rather than a generic feature grid.

## Experience

- A full-hero SVG pathway field sends animated signals across a registration grid. It remains available without WebGL and follows the same pause/reduced-motion policy as the foreground experience.
- The original Three.js **pathway loom** uses three procedural woven ribbons, custom GLSL surface/point materials, instanced traveling packets, projected HTML company controls, selected-node pulses, pointer damping and scroll-linked spatial changes. Batch selection changes its structure. The geometry is conceptual; no particle counts or dimensions claim placement outcomes.
- Records appear as an interactive, source-backed dossier with genuine company/batch links. Role detail placeholders lead into actual records; no package numbers are invented.
- The blue hiring workbench explores assessment, interview and preparation information. Community experiences are live in beta and reviewed before publication; the page does not claim verified alumni identities.
- A company-selectable people diagram leads into existing company records, where available LinkedIn profiles appear beside selected candidates. No individual names, contact details or private API requests appear on the public page. Profile availability varies.
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

## Completed validation (V2)

- 53 unit checks passed.
- All 20 desktop/mobile browser scenarios passed against isolated emulators (36.9s).
- Final production build and TypeScript checks passed. Vite retains a large-chunk advisory; the GPU module is separate and lazy-loaded (approximately 136KB gzip).
- Rendered light/dark desktop, tablet, mobile and login previews were inspected. Twelve repeated landing/login transitions produced no runtime errors or graphics warnings. The final shader color-space refinement was rebuilt and visually checked in both themes.
- Final previews are under `artifacts/landing-v2-*` and `artifacts/login-v2-*`; browser, unit, build and visual logs use the `artifacts/v2-*` prefix.
