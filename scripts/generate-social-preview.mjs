// Regenerate the committed social image: node scripts/generate-social-preview.mjs
// No runtime dependency or GPU rendering is required to serve this image.
import { chromium } from '@playwright/test';
import { readFile, mkdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
const root = new URL('../', import.meta.url);
const regular = await readFile(new URL('public/fonts/instrument-serif/normal.woff2', root));
const italic = await readFile(new URL('public/fonts/instrument-serif/italic.woff2', root));
const browser = await chromium.launch();
try {
  const page = await browser.newPage({ viewport: { width: 1200, height: 630 }, deviceScaleFactor: 1 });
  await page.setContent(`<!doctype html><html lang="en"><head><meta charset="utf-8"><style>
    @font-face{font-family:Editorial;src:url(data:font/woff2;base64,${regular.toString('base64')})}
    @font-face{font-family:Editorial;font-style:italic;src:url(data:font/woff2;base64,${italic.toString('base64')})}
    *{box-sizing:border-box}body{margin:0;background:#f7f7ef;color:#171a1b;font-family:Arial,sans-serif}
    main{position:relative;width:1200px;height:630px;overflow:hidden;padding:42px 54px;border:1px solid #171a1b}
    header{display:flex;align-items:center;gap:14px;font-size:22px;line-height:1;font-weight:700}
    .logo{width:51px;height:51px;background:#2845ff;color:white;font-family:Editorial;font-style:italic;font-size:62px;line-height:42px;padding-left:7px;font-weight:400}
    .brand{line-height:1.05;letter-spacing:-.7px}.college{margin-left:auto;font-size:16px;font-weight:400;letter-spacing:2px}
    h1{position:relative;z-index:2;font:122px/.94 Editorial;margin:50px 0 23px;letter-spacing:-5px}
    h1 em{color:#2845ff;font-weight:400}p{position:relative;z-index:2;font-size:23px;margin:0;line-height:1.5}
    footer{position:absolute;bottom:34px;left:54px;right:54px;border-top:1px solid #171a1b;padding-top:20px;display:flex;justify-content:space-between;font-size:16px}
    .visual{position:absolute;right:37px;top:128px;width:420px;height:383px}
    .node{position:absolute;background:#f7f7ef;border:1px solid #171a1b;box-shadow:5px 5px 0 #171a1b;padding:16px 20px;font-size:19px;z-index:1;display:flex;gap:17px;align-items:center}
    .node span{color:#2845ff;font-size:28px}.records{top:22px;left:80px;transform:rotate(-5deg)}
    .experiences{top:154px;left:133px;transform:rotate(4deg)}.people{top:281px;left:38px;transform:rotate(-3deg)}
  </style></head><body><main>
    <header><span class="logo">p</span><span class="brand">Placement<br>Stats.</span><span class="college">KJSCE</span></header>
    <h1>Know more.<br><em>Go further.</em></h1>
    <p>Placement intelligence.<br>Built for the next batch.</p>
    <div class="visual">
      <svg width="420" height="383" viewBox="0 0 420 383" fill="none" aria-hidden="true">
        <defs><pattern id="grid" width="20" height="20" patternUnits="userSpaceOnUse"><circle cx="1" cy="1" r="1" fill="#2845ff" opacity=".22"/></pattern></defs>
        <circle cx="218" cy="192" r="168" fill="#e8ecff"/><circle cx="218" cy="192" r="168" fill="url(#grid)" stroke="#2845ff"/>
        <ellipse cx="218" cy="192" rx="80" ry="168" stroke="#2845ff" opacity=".35" transform="rotate(33 218 192)"/>
        <ellipse cx="218" cy="192" rx="80" ry="168" stroke="#2845ff" opacity=".35" transform="rotate(-33 218 192)"/>
        <path d="M208 65L285 185L172 310" stroke="#2845ff" stroke-width="3"/>
        <circle cx="208" cy="65" r="7" fill="#2845ff"/><circle cx="285" cy="185" r="7" fill="#2845ff"/><circle cx="172" cy="310" r="7" fill="#2845ff"/>
      </svg>
      <div class="node records"><span>↗</span>Real records</div>
      <div class="node experiences"><span>↗</span>Firsthand experiences</div>
      <div class="node people"><span>↗</span>Alumni connections</div>
    </div>
    <footer><span>A clearer perspective on placements.</span><span>kjsce-placements.vercel.app ↗</span></footer>
  </main></body></html>`);
  await page.evaluate(() => document.fonts.ready);
  await mkdir(new URL('public/social/', root), { recursive: true });
  await page.screenshot({ path: fileURLToPath(new URL('public/social/placement-stats-preview.png', root)) });
} finally {
  await browser.close();
}
