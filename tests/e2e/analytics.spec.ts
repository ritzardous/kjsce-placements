import { readFileSync } from 'node:fs';
import ts from 'typescript';
import { expect, test, type Page } from '@playwright/test';
import type * as Analytics from '../../src/lib/analytics';

const origin = 'https://kjsce-placements.vercel.app';
const id = 'G-QK3FD7FTJC';
type HarnessWindow = Window & { analyticsHarness?: typeof Analytics; dataLayer?: ArrayLike<unknown>[] };

function compiled(file: string, environment: Record<string, string | boolean | undefined>) {
  let source = readFileSync(new URL(`../../${file}`, import.meta.url), 'utf8');
  source = source.replace(/import\.meta\.env\.([A-Z_]+)/g, (_match, key: string) => JSON.stringify(environment[key]) ?? 'undefined');
  source = source.replace(/(['"])\.\.\/app\/routing\1/g, "'./routing.js'")
    .replace(/(['"])\.\/analytics-events\1/g, "'./events.js'")
    .replace(/(['"])\.\.\/\.\.\/shared\/company-identity\1/g, "'./company-identity.js'")
    .replace(/from (['"])react\1/g, "from './react-stub.js'");
  return ts.transpileModule(source, { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext } }).outputText;
}

async function harness(page: Page, options: { origin?: string; consent?: string; dnt?: boolean; gpc?: boolean; foreign?: boolean; block?: boolean; environment?: Record<string, string | boolean | undefined> } = {}) {
  const environment = { PROD: true, VITE_GA_ENABLED: 'true', VITE_GA_ID: id, VITE_USE_FIREBASE_EMULATORS: 'false', ...options.environment };
  const assets: Record<string, string> = {
    '/analytics.js': compiled('src/lib/analytics.ts', environment),
    '/events.js': compiled('src/lib/analytics-events.ts', environment),
    '/routing.js': compiled('src/app/routing.ts', environment),
    '/company-identity.js': compiled('shared/company-identity.ts', environment),
    // Only parseRoute is used by this runtime harness, never React's routing hook.
    '/react-stub.js': 'export function useEffect(){}; export function useState(){};',
  };
  let loaders = 0;
  let collections = 0;
  await page.route('**/*', async route => {
    const url = new URL(route.request().url());
    if (url.hostname === 'www.googletagmanager.com') {
      loaders++;
      if (options.block) await route.abort();
      else await route.fulfill({ body: '', contentType: 'application/javascript' });
      return;
    }
    if (url.hostname.includes('google-analytics.com')) { collections++; await route.fulfill({ status: 204 }); return; }
    if (assets[url.pathname]) { await route.fulfill({ body: assets[url.pathname], contentType: 'application/javascript' }); return; }
    await route.fulfill({ contentType: 'text/html', body: '<!doctype html><html><head><title>Private document title</title></head><body style="height:3000px"><a id="nav" href="#2027/explore/timeline">Go</a><a class="candidate-linkedin" href="https://www.linkedin.com/in/private-student">Private student</a><script type="module">import * as analytics from "/analytics.js"; window.analyticsHarness=analytics;</script></body></html>' });
  });
  await page.addInitScript(settings => {
    if (settings.consent) Reflect.set(window, 'placementStatsAnalyticsConsent', settings.consent);
    if (settings.dnt) Object.defineProperty(navigator, 'doNotTrack', { value: '1' });
    if (settings.gpc) Object.defineProperty(navigator, 'globalPrivacyControl', { value: true });
    if (settings.foreign) { Reflect.set(window, 'gtag', () => {}); Reflect.set(window, 'dataLayer', ['existing']); }
  }, options);
  await page.goto((options.origin ?? origin) + '/?email=private@example.test#procedures/contribute?draft=private-draft');
  await page.waitForFunction(() => Boolean(Reflect.get(window, 'analyticsHarness')));
  return { loaders: () => loaders, collections: () => collections };
}
const commands = (page: Page) => page.evaluate(() => ((window as HarnessWindow).dataLayer ?? []).map(args => Array.from(args)));

test('one tag and sanitized views survive remounts, navigation and repeated product actions', async ({ page }) => {
  const requests = await harness(page);
  await page.evaluate(() => {
    const api = (window as HarnessWindow).analyticsHarness!;
    api.trackPage({ path:'/home', title:'Home · Placement Stats' });
    api.trackPage({ path:'/home', title:'Home · Placement Stats' });
    api.trackPage({ path:'/2027/companies', title:'Class of 2027: companies · Placement Stats' });
    api.trackProductEvent('search', { search_surface:'companies', result_bucket:'1_5' });
    api.trackProductEvent('search', { search_surface:'companies', result_bucket:'1_5' });
    api.trackProductEvent('view_company', { company_group:'jpmc', content_type:'company' }, 'private-record');
    api.trackProductEvent('view_company', { company_group:'jpmc', content_type:'company' }, 'private-record');
  });
  await expect.poll(requests.loaders).toBe(1);
  const queue = await commands(page);
  expect(queue.filter(command => command[0] === 'config')).toHaveLength(1);
  expect(queue.filter(command => command[1] === 'page_view')).toHaveLength(2);
  expect(queue.filter(command => command[1] === 'search')).toHaveLength(1);
  expect(queue.filter(command => command[1] === 'view_company')).toHaveLength(1);
  expect(queue.filter(command => command[0] === 'event').every(command => (command[2] as Record<string, unknown>).send_to === id)).toBe(true);
  expect(JSON.stringify(queue)).not.toMatch(/private@example|private-draft|private-record|Private document/);
  expect(requests.collections()).toBe(0);
});

test('navigation and alumni contact use bounded context without leaking link targets', async ({ page }) => {
  await harness(page);
  await page.evaluate(() => (window as HarnessWindow).analyticsHarness!.trackPage({path:'/2027/company',title:'Company'}));
  // Dispatch clicks without the browser navigating to the synthetic external profile.
  await page.evaluate(() => {
    const stopNavigation = (event: Event) => event.preventDefault();
    window.addEventListener('click', stopNavigation);
    document.querySelector('#nav')!.dispatchEvent(new MouseEvent('click', {bubbles:true,cancelable:true}));
    document.querySelector('.candidate-linkedin')!.dispatchEvent(new MouseEvent('click', {bubbles:true,cancelable:true}));
    window.removeEventListener('click', stopNavigation);
  });
  const queue = await commands(page);
  expect(queue.find(command=>command[1]==='navigation')?.[2]).toMatchObject({section:'company',academic_year:'2027',destination:'career_explorer'});
  expect(queue.find(command=>command[1]==='alumni_contact')?.[2]).toMatchObject({action_type:'linkedin'});
  expect(JSON.stringify(queue)).not.toMatch(/linkedin\.com|private-student|Private student/);
});

test('consent denies pre-boot collection, grants only the current page, and suppresses later events', async ({ page }) => {
  const requests = await harness(page, {consent:'denied'});
  await page.evaluate(() => (window as HarnessWindow).analyticsHarness!.trackPage({path:'/home',title:'Home'}));
  expect(requests.loaders()).toBe(0);
  await page.evaluate(() => {
    window.dispatchEvent(new CustomEvent('placementstats:analytics-consent',{detail:'granted'}));
    window.dispatchEvent(new CustomEvent('placementstats:analytics-consent',{detail:'granted'}));
    window.dispatchEvent(new CustomEvent('placementstats:analytics-consent',{detail:'denied'}));
    (window as HarnessWindow).analyticsHarness!.trackPage({path:'/about',title:'About'});
    (window as HarnessWindow).analyticsHarness!.trackProductEvent('login',{method:'Google'});
  });
  await expect.poll(requests.loaders).toBe(1);
  expect((await commands(page)).filter(command=>command[1]==='page_view')).toHaveLength(1);
  expect((await commands(page)).filter(command=>command[1]==='login')).toHaveLength(0);
  await page.evaluate(() => window.dispatchEvent(new CustomEvent('placementstats:analytics-consent',{detail:'granted'})));
  const views = (await commands(page)).filter(command=>command[1]==='page_view');
  expect(views).toHaveLength(2);
  expect(views[1][2]).toMatchObject({page_location:origin+'/about'});
});

test('approved entry campaigns survive navigation before consent without forwarding raw query fields', async ({page}) => {
  await harness(page, {consent:'denied'});
  await page.evaluate(() => {
    history.replaceState(null, '', '/?utm_source=linkedin&utm_medium=social&utm_campaign=public_launch&email=private@example.test#landing');
    (window as HarnessWindow).analyticsHarness!.trackPage({path:'/landing',title:'Welcome'});
    history.replaceState(null, '', '/#about');
    (window as HarnessWindow).analyticsHarness!.trackPage({path:'/about',title:'About'});
    window.dispatchEvent(new CustomEvent('placementstats:analytics-consent',{detail:'granted'}));
  });
  const queue = await commands(page);
  expect(queue.find(command=>command[0]==='config')?.[2]).toMatchObject({campaign_source:'linkedin',campaign_medium:'social',campaign_name:'public_launch'});
  expect(queue.filter(command=>command[1]==='page_view')).toHaveLength(1);
  expect(queue.find(command=>command[1]==='page_view')?.[2]).toMatchObject({page_location:origin+'/about'});
  expect(JSON.stringify(queue)).not.toContain('private@example.test');
});

for (const [label, options] of Object.entries({
  development: {environment:{PROD:false}}, disabled:{environment:{VITE_GA_ENABLED:'false'}},
  localhost:{origin:'http://localhost:5187'}, preview:{origin:'https://preview.vercel.app'},
  emulators:{environment:{VITE_USE_FIREBASE_EMULATORS:'true'}}, dnt:{dnt:true}, gpc:{gpc:true}, conflict:{foreign:true},
})) {
  test(`analytics stays off for ${label}`, async ({page}) => {
    const requests = await harness(page, options);
    await page.evaluate(() => (window as HarnessWindow).analyticsHarness!.trackPage({path:'/home',title:'Home'}));
    expect(await page.locator('#google-analytics').count()).toBe(0);
    expect(requests.loaders()).toBe(0);
    expect(requests.collections()).toBe(0);
  });
}

test('blocked Google script fails quietly and does not accumulate later events', async ({page}) => {
  await harness(page, {block:true});
  await page.evaluate(() => (window as HarnessWindow).analyticsHarness!.trackPage({path:'/home',title:'Home'}));
  await page.waitForTimeout(100);
  const before = (await commands(page)).length;
  await page.evaluate(() => {
    const api = (window as HarnessWindow).analyticsHarness!;
    for(let index=0;index<100;index++){api.trackPage({path:'/about',title:'About'},String(index));api.trackProductEvent('login',{method:'Google'});}
  });
  expect((await commands(page)).length).toBe(before);
});
