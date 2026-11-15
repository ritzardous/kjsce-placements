# Search visibility

[Documentation index](README.md) · [Deployment](deployment.md) · [Features and routes](features.md)

## Current public search surface

The public, canonical landing page is `https://kjsce-placements.vercel.app/`. Its HTML provides a concise KJSCE placement title and description, a canonical URL, Open Graph/Twitter sharing metadata and `WebSite` structured data. The XML sitemap intentionally lists only this page, and `robots.txt` advertises that sitemap.

The generated `/share/` page exists for social previews, not as a second search result. It carries `noindex, follow` and the landing page's canonical URL.

## Indexing boundaries

The application uses hash-based routes. URL fragments are not separate server paths, so the statistics, company, branch and experience routes do not currently have independent crawlable HTML documents or sitemap entries. Statistics are loaded after verified sign-in from Firestore; exposing their contents in pre-rendered pages would change the current access boundary and requires an explicit product/security decision. The sitemap must not claim those routes are independently indexable.

Do not add keyword lists, fabricated salary figures, unreviewed recruiter claims, or structured data for content that is not present to users. The year range and topic descriptions in search metadata should be revisited when the public experience or supported data coverage changes.

## External setup after deployment

1. Verify ownership of the actual production hostname in Google Search Console using a maintainer-approved verification method.
2. Submit `https://kjsce-placements.vercel.app/sitemap.xml` in Search Console and inspect the canonical landing URL.
3. If the production hostname changes, update the canonical, Open Graph and structured-data URLs in `index.html`, `public/sitemap.xml`, `public/robots.txt`, and the origin in `scripts/build-social-pages.mjs` together. Confirm the deployment's redirect/canonical behavior before submitting the new sitemap.
4. Monitor indexing, query coverage and Core Web Vitals in Search Console. Repository metadata cannot guarantee rankings or indexing.

No Search Console property, verification token, sitemap submission, or production setting is configured by this repository change.
