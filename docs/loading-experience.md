# Loading experience

Content fetches now use the shared `FetchLoader` skeleton instead of the large hourglass. Card, statistics, article and session layouts reserve useful content shapes, with a compact version for previews, history and preferences. Notification and draft loads use the same treatment. Placeholders contain no invented numbers or progress percentages, and are hidden from assistive technology; a status announcement identifies the actual request.

`loading.css` uses the existing light/dark identity palette. Shimmer is subtle and stops with reduced motion. The remaining hourglass is 14–18px at 22% opacity, positioned as a secondary accent. Saving/uploading retains the existing operation status and indeterminate progress treatment, with a quieter spinner and wording that also fits scans and imports.

The initial HTML includes a lightweight skeleton before React or Firebase can load. Saved/system theme is applied in the head to avoid a light flash on dark-mode visits. The editorial fonts preload without blocking content on a custom animation timer. React's session skeleton follows the same basic structure. Auth, permissions, data fetches and existing timeout/error/retry behavior remain intact.

The hero keeps its complete SVG composition while its lazy 3D module loads. Projected logo coordinates are buffered in CSS variables and become active with the scene's ready state, after a rendered frame has had a paint opportunity. Context loss restores the original poster layout. The arbitrary scene-start delay is removed; reduced-motion and save-data policy continue to retain the static composition. Existing closing-pattern fallbacks are preserved.

Validation: production build/typecheck and 55 unit tests passed. Six focused desktop/mobile browser scenarios passed for delayed JavaScript, light/dark bootstrap colors, delayed reader requests, shimmer, reduced motion, delayed 3D readiness and context loss. The reader scenarios were rerun after visual refinement and extended to delayed statistics loading, successful content replacement and 320px containment. Bootstrap, reader, dashboard and completed 3D screenshots were visually inspected.

The hero’s five fallback badge positions are assigned by slot rather than company name, so changing the featured companies does not leave new logos unpositioned during module loading. The same slots apply after context loss. Browser checks cover delayed module loading and reloading, badge separation, readiness and the context-loss fallback.
