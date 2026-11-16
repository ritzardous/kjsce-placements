# Company logos

- The dashboard bundles 177 company brand assets in `public/company-logos/`. They appear in company tables, overview and branch rankings, candidate company columns, result history, and company headers across all three batches. Assets also cover community-only companies used by the experience writer.
- `src/data/company-logos.json` records each asset's source URL, company website, and explicit dataset aliases. Most assets are website icons retrieved through Google's favicon cache; sharper alternatives come directly from the company's website or its linked asset host.
- Assets are served by the app itself. Opening the dashboard does not send logo requests to Google or company websites, and logo rendering does not depend on a paid API or API key.
- Names remain visible and accessible. Logos are decorative. Unmapped companies and failed image loads show initials without removing or changing the company link.
- Keys use explicit aliases, with underscores normalized to hyphens across the three datasets. For the ambiguous 2025 `ICICI Prudential` entry, the shared ICICI brand mark identifies the brand without assigning it to life insurance or asset management. Likewise, `Edelweiss Insurance` uses Edelweiss group branding without choosing an insurance subsidiary, and `Sumitomo` uses the shared group emblem. Placement names and entity data stay as reported. Refreshing a brand preserves existing aliases, including the live batch's alternate company keys.
- The JPMorganChase entries use the current wordmark from its official corporate website. Every company uses the same square tile dimensions within each UI context (list, ranking, or detail header); images fit inside without stretching or cropping. Reliance, Loylty Rewardz, and Worley retain dark backgrounds for white artwork. Background settings live alongside each asset in the manifest and are retained by the download script.
- EDRA Labs and EDRA Labs LLP share the exact company profile image supplied by the user from its [LinkedIn page](https://www.linkedin.com/company/edra-labs/home/). The JPEG is bundled locally so LinkedIn's signed source URL expiring does not affect runtime rendering. Refreshes preserve the last verified asset if that URL has expired; obtain a fresh profile image URL before attempting to replace it.
- Logo mapping changes do not alter placement datasets, published statistics or authentication configuration. Catalog/profile updates use the separate [community company workflow](community-company-details.md). Brand assets reflect the retrieved websites' current branding, which may differ from branding during the placement year.
- To add only missing assets, run `node scripts/fetch-company-logos.mjs --missing`. To refresh a few brands, use `--only=idfy,nsdl` (comma-separated IDs); omit flags to refresh all. Existing verified mappings remain available if a refresh fails. Review skipped downloads, inspect the resulting images, and run `npm run build`. A refresh is a manual maintenance step, not part of app startup or deployment. Company trademarks belong to their respective owners.

## Coverage after this round

Counts below refer to distinct company keys in each batch's placement dataset. Shared companies reuse assets, so the counts do not sum to the number of logo files.

| Placement year | Companies | With a verified logo | Initials fallback |
| --- | ---: | ---: | ---: |
| 2024–25 / class of 2025 | 129 | 125 | 4 |
| 2025–26 / class of 2026 | 82 | 82 | 0 |
| 2026–27 / class of 2027, live | 25 | 25 | 0 |

The four remaining names are **Emergence**, **CCS INC**, **Bajao international**, and **RMC India**, all in 2024–25. The supplied names do not establish a reliable match to a specific corporate website or company logo. They retain initials until an exact website or company profile is provided; similarly named businesses are not used as substitutes.

## 16 November 2026 coverage update

Framatome and IKS Health already had bundled images; their 2027 keys were missing from the explicit alias lists. Those mappings now include `framatome` and `iks-health`, retaining the older aliases. New assets cover Saint-Gobain, Zeus Learning and Marsh. Saint-Gobain uses the mark from its [official India site](https://www.saint-gobain.co.in/); Zeus and Marsh use SVG assets linked from their official websites. Marsh's pale wordmark uses a dark tile for contrast.

Community listings add Gracenote (Nielsen), Marico Limited and Morgan Stanley logos from their official sites; InTrade Systems reuses its existing official wordmark. The manifest records exact asset URLs and preserves source provenance. Nielsen identifies Gracenote as its [content intelligence business](https://www.nielsen.com/solutions/content-metadata/); this brand relationship does not merge their placement identities. Company sites establish branding, not the maintainer-supplied salary figures.

## Registered names and brand matches

- **Brokentusk Technologies → Setu:** Setu publishes [Brokentusk's annual return](https://setu.co/Brokentusk_MGT-7_2023-24_certified.pdf). The asset comes from Setu's own website asset host.
- **Transpure Solutions → Tranzily:** the company's [LinkedIn profile](https://in.linkedin.com/company/transpure) links its website to Tranzily. The logo is the header image on [Tranzily's website](https://tranzily.com).
- **All Home Bharat Platform → Fiamarc:** the [official Fiamarc storefront](https://fiamarc.zohoecommerce.in/) identifies All Home Bharat Platform Pvt Ltd in its company description.
- **Novel Jewels → Indriya:** the brand's [official governance document](https://www.igp.indriya.com/content/dam/njis/Governance.pdf) identifies Aditya Birla Novel Jewels. The asset is Indriya's official app icon.
- **Watsun Infrabuild → Continuum group:** Continuum's [published financial statements](https://www.continuumenergy.in/uploads/assign_document/1710496766_Combined%20Financial%20Statements%20-%209M%20FY%202023-24.pdf) identify Watsun as a group subsidiary. Its entry uses the parent group's emblem; the displayed employer name remains Watsun.
- **Sure Financial:** the [official Android listing](https://play.google.com/store/apps/details?id=com.sure.financial) links to `sure.financial`; this avoids an unrelated similarly named overseas firm.
- **NCSI Technologies:** [NCS's India offices page](https://www.ncs.co/en-in/about-us/regional-offices/) establishes the NCS brand relationship.
- **IBM:** the bundled eight-bar wordmark from [Wikimedia](https://commons.wikimedia.org/wiki/File:IBM_logo.svg) matches the company's [official eight-bar branding](https://www.ibm.com/design/language/ibm-logos/8-bar/).
- **FileAgo:** its official wordmark is inline SVG on [its website](https://fileago.com), so the download script extracts that SVG and applies the same safety validation as other SVG assets. Its white artwork uses a dark tile background with the same square dimensions as every other company.

## Validation

- All 170 manifest assets decode in the browser; files exist and company aliases have no duplicate mappings.
- Reviewed the new assets visually and replaced several low-resolution website icons with sharper official wordmarks or app icons.
- Checked overview, company list, company detail, branch, candidates, and timeline pages for all three batches at desktop and mobile widths. Logo containers remain uniform squares within each context; no horizontal overflow or browser exceptions.
- `npm run build` passes. The frontend must be redeployed for the bundled additions to appear on the hosted site.

## Wissen Technology community listing

The `wissen-technology` key uses the square logo linked from [Wissen’s official website](https://www.wissen.com), bundled as `public/company-logos/wissen-technology.png`. Its original CDN URL is recorded in `src/data/company-logos.json` and the targeted download script. Refresh only this asset with `node scripts/fetch-company-logos.mjs --only=wissen-technology`. This adds community-listing coverage without changing any historical batch coverage or placement records.
