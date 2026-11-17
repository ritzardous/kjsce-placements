import { readFileSync } from 'node:fs';
import ts from 'typescript';
import { expect, test, type Page } from '@playwright/test';
import type * as Analytics from '../../src/lib/vercel-analytics';

const origin = 'https://kjsce-placements.vercel.app';
type Harness = Window & { harness: typeof Analytics; hits: { url: string; referrer?: string }[] };

async function setup(page: Page, options: { denied?: boolean; dnt?: boolean; gpc?: boolean; production?: boolean; origin?: string; blocked?: boolean } = {}) {
  let source = readFileSync('src/lib/vercel-analytics.ts', 'utf8')
    .replace("from '@vercel/analytics'", "from '/sdk.js'")
    .replace("from './analytics'", "from '/origin.js'")
    .replaceAll('import.meta.env.PROD', String(options.production ?? true))
    .replaceAll('import.meta.env.VITE_USE_FIREBASE_EMULATORS', "'false'");
  source = ts.transpileModule(source, { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext } }).outputText;
  let loaders = 0;
  await page.addInitScript(settings => {
    if (settings.denied) Reflect.set(window, 'placementStatsAnalyticsConsent', 'denied');
    if (settings.dnt) Object.defineProperty(navigator, 'doNotTrack', { value: '1' });
    if (settings.gpc) Object.defineProperty(navigator, 'globalPrivacyControl', { value: true });
  }, options);
  await page.route('**/*', async route => {
    const path = new URL(route.request().url()).pathname;
    if (path === '/sdk.js') return route.fulfill({ contentType: 'application/javascript', body: readFileSync('node_modules/@vercel/analytics/dist/index.mjs', 'utf8') });
    if (path === '/origin.js') return route.fulfill({ contentType: 'application/javascript', body: `export const analyticsOrigin=${JSON.stringify(origin)};` });
    if (path === '/app.js') return route.fulfill({ contentType: 'application/javascript', body: source });
    if (path === '/_vercel/insights/script.js') {
      loaders++;
      if (options.blocked) return route.abort();
      // Controlled transport: exercises the installed SDK and its beforeSend
      // contract without submitting test traffic to Vercel.
      return route.fulfill({ contentType: 'application/javascript', body: `
        window.hits=[];let before=e=>e,first=true;
        window.va=(type,data)=>{if(type==='beforeSend')before=data;
          if(type==='pageview'){const url=new URL(location.href);url.pathname=data.path;url.search='';const result=before({type:'pageview',url:url.href});
            if(result)window.hits.push({...result,...first?{referrer:document.referrer}:{}});first=false;}};
        (window.vaq||[]).forEach(args=>window.va(...args));window.vaq=[];` });
    }
    return route.fulfill({ contentType: 'text/html', body: '<script type="module">import * as api from "/app.js";window.harness=api;</script>' });
  });
  await page.goto((options.origin ?? origin) + '/?email=private@example.test#procedures/contribute?draft=private', { referer: 'https://example.test/private?email=private@example.test' });
  await page.waitForFunction(() => Boolean(Reflect.get(window, 'harness')));
  return () => loaders;
}

test('manual virtual views are sanitized, deduplicated and independent of GA4', async ({ page }) => {
  const loaders = await setup(page);
  await page.evaluate(() => {
    const api = (window as unknown as Harness).harness;
    for (const path of ['/landing', '/landing', '/2027/overview', '/2027/companies', '/2026/branches', '/2025/explore/candidates', '/experiences', '/experiences/company', '/experiences/read']) {
      api.trackVercelPage({ path, title: 'Private title' }, path);
    }
    api.trackVercelPage({ path: '/experiences/read', title: 'Private title' }, '/experiences/read/private-second-id');
    api.trackVercelPage({ path: '/experiences/read', title: 'Private title' }, '/experiences/read/private-second-id');
    api.trackVercelPage({ path: '/private-record?email=private@example.test', title: '' }, 'unsafe');
  });
  await expect.poll(loaders).toBe(1);
  await expect.poll(() => page.evaluate(() => (window as unknown as Harness).hits?.length)).toBe(9);
  expect(await page.locator('script[data-disable-auto-track="1"]').count()).toBe(1);
  const hits = await page.evaluate(() => (window as unknown as Harness).hits);
  expect(hits[0].url).toBe(origin + '/landing');
  expect(JSON.stringify(hits)).not.toMatch(/private|email|draft|referrer|title|#/);
  expect(await page.evaluate(() => Reflect.has(window, 'gtag'))).toBe(false);
});

test('consent defers loading, revokes delivery and grants only the current view', async ({ page }) => {
  const loaders = await setup(page, { denied: true });
  await page.evaluate(() => (window as unknown as Harness).harness.trackVercelPage({ path: '/landing', title: '' }, 'landing'));
  expect(loaders()).toBe(0);
  await page.evaluate(() => window.dispatchEvent(new CustomEvent('placementstats:analytics-consent', { detail: 'granted' })));
  await expect.poll(() => page.evaluate(() => (window as unknown as Harness).hits?.length)).toBe(1);
  await page.evaluate(() => {
    window.dispatchEvent(new CustomEvent('placementstats:analytics-consent', { detail: 'denied' }));
    (window as unknown as Harness).harness.trackVercelPage({ path: '/support', title: '' }, 'support');
    window.dispatchEvent(new CustomEvent('placementstats:analytics-consent', { detail: 'granted' }));
    window.dispatchEvent(new CustomEvent('placementstats:analytics-consent', { detail: 'granted' }));
  });
  expect(await page.evaluate(() => (window as unknown as Harness).hits.map(hit => hit.url))).toEqual([origin + '/landing', origin + '/support']);
  expect(loaders()).toBe(1);
});

for (const options of [{ dnt: true }, { gpc: true }, { production: false }, { origin: 'http://localhost:5173' }, { origin: 'https://preview.vercel.app' }]) {
  test(`does not load for ${JSON.stringify(options)}`, async ({ page }) => {
    const loaders = await setup(page, options);
    await page.evaluate(() => (window as unknown as Harness).harness.trackVercelPage({ path: '/landing', title: '' }, 'landing'));
    expect(loaders()).toBe(0);
    expect(await page.locator('script[src*="insights"]').count()).toBe(0);
  });
}

test('a blocked script is not retried or bypassed', async ({ page }) => {
  const loaders = await setup(page, { blocked: true });
  await page.evaluate(() => (window as unknown as Harness).harness.trackVercelPage({ path: '/landing', title: '' }, 'landing'));
  await expect.poll(loaders).toBe(1);
  await page.evaluate(() => (window as unknown as Harness).harness.trackVercelPage({ path: '/support', title: '' }, 'support'));
  expect(loaders()).toBe(1);
});
