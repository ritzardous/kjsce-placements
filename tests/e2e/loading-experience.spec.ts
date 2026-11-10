import { test, expect } from '@playwright/test';
import { initializeApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { randomUUID } from 'node:crypto';
import { initialProcedureDraft } from '../../shared/procedures';
import { signInGoogle } from './auth-helper';

const db = getFirestore(initializeApp({ projectId: 'demo-placementstats' }, 'loading-checks'));
test.setTimeout(60000);
test.beforeEach(() => { if (process.env.E2E_FIREBASE !== 'true') throw Error('Isolated emulators required'); });

test('cold HTML shows themed skeletons before JavaScript arrives', async ({ page }, info) => {
  await page.addInitScript(() => localStorage.setItem('placement-theme', new URL(location.href).searchParams.get('theme') || 'light'));
  await page.emulateMedia({ reducedMotion: 'reduce' });
  for (const theme of ['light', 'dark']) {
    let release!: () => void;
    const gate = new Promise<void>(resolve => { release = resolve; });
    await page.route('**/src/main.tsx', async route => { await gate; await route.continue(); });
    try {
      await page.goto(`/?theme=${theme}#landing`, { waitUntil: 'commit' });
      await expect(page.locator('.boot-shell')).toBeVisible();
      await expect(page.locator('html')).toHaveAttribute('data-theme', theme);
      await expect(page.locator('html')).toHaveCSS('background-color', theme === 'dark' ? 'rgb(16, 20, 17)' : 'rgb(247, 247, 239)');
      expect(await page.locator('.boot-bar').first().evaluate(el => getComputedStyle(el, '::after').animationName)).toBe('none');
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true);
      await page.screenshot({ path: `artifacts/loading-bootstrap-${theme}-${info.project.name}.png` });
    } finally { release(); }
    await expect(page.getByRole('heading', { name: 'Don’t prep in the dark.', exact: true })).toBeVisible();
    await expect(page.locator('.boot-shell')).toHaveCount(0);
    await page.unroute('**/src/main.tsx');
  }
});

test('slow reader requests show content skeletons and retain working theme controls', async ({ page }, info) => {
  const owner = await signInGoogle(page), id = randomUUID();
  await db.doc(`procedurePosts/${id}`).set({ ...initialProcedureDraft(), id, title: 'A ready reading surface', companyKey: 'barclays', companyName: 'Barclays', body: '## My interview\nWe discussed projects, SQL and the reasoning behind my solution.', authorUid: owner, authorName: 'Contributor', published: true, publishedAt: Date.now(), revision: 1, score: 0, upvotes: 0, downvotes: 0 });
  let release!: () => void;
  const gate = new Promise<void>(resolve => { release = resolve; });
  await page.route('**/*', async route => { if (new URL(route.request().url()).port === '8080') await gate; await route.continue(); });
  try {
    await page.goto(`/#procedures/${id}`);
    const loader = page.locator('.skeleton-loader[data-layout=article]');
    await expect(loader).toBeVisible();
    await expect(loader).toContainText('Loading experience');
    await expect(loader.locator('.sr-only')).toHaveCSS('position', 'absolute');
    for (const theme of ['light', 'dark']) {
      await page.evaluate(value => { localStorage.setItem('placement-theme', value); dispatchEvent(new StorageEvent('storage', { key: 'placement-theme' })); }, theme);
      await expect(page.locator('html')).toHaveAttribute('data-theme', theme);
      expect(Number(await loader.locator('.skeleton-hourglass').evaluate(el => getComputedStyle(el).opacity))).toBeLessThan(.3);
      expect(await loader.locator('.skeleton-bar').first().evaluate(el => getComputedStyle(el, '::after').animationName)).toBe('content-shimmer');
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true);
      await page.screenshot({ path: `artifacts/loading-reader-${theme}-${info.project.name}.png` });
    }
    await page.emulateMedia({ reducedMotion: 'reduce' });
    expect(await loader.locator('.skeleton-bar').first().evaluate(el => getComputedStyle(el, '::after').animationName)).toBe('none');
    expect(await loader.locator('.skeleton-hourglass').evaluate(el => getComputedStyle(el).animationName)).toBe('none');
  } finally { release(); }
  await expect(page.getByRole('heading', { name: 'A ready reading surface', exact: true })).toBeVisible();
  await expect(page.locator('.skeleton-loader')).toHaveCount(0);
  await page.unroute('**/*');
  let releaseDashboard!: () => void;
  const dashboardGate = new Promise<void>(resolve => { releaseDashboard = resolve; });
  await page.route('**/*', async route => { if (new URL(route.request().url()).port === '8080') await dashboardGate; await route.continue(); });
  try {
    await page.goto('/#2026/overview');
    const dashboard = page.locator('.skeleton-loader[data-layout=dashboard]');
    await expect(dashboard).toBeVisible();
    await expect(dashboard.locator('.skeleton-number')).toHaveCount(3);
    if (info.project.name === 'mobile') await page.setViewportSize({ width: 320, height: 740 });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true);
    await page.screenshot({ path: `artifacts/loading-dashboard-${info.project.name}.png` });
  } finally { releaseDashboard(); }
  await expect(page.locator('main h1')).toContainText('Placement Stats');
  await expect(page.locator('.skeleton-loader')).toHaveCount(0);
  await page.unroute('**/*');
});

test('hero keeps a complete poster through delayed 3D load and context loss', async ({ page }, info) => {
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  let release!: () => void, requested = false;
  const gate = new Promise<void>(resolve => { release = resolve; });
  await page.route('**/src/landing/ArchiveScene.ts*', async route => { requested = true; await gate; await route.continue(); });
  await page.goto('/#landing');
  const stage = page.locator('.opportunity-index');
  try {
    await expect.poll(() => requested).toBe(true);
    await expect(stage).not.toHaveClass(/is-rendered/);
    await expect(stage.locator('.index-poster')).toHaveCSS('opacity', '1');
    await expect(stage.locator('.index-world')).toHaveCSS('opacity', '0');
    expect(await stage.locator('.index-company').evaluateAll(nodes => nodes.every(node => !(node as HTMLElement).style.left && !(node as HTMLElement).style.top))).toBe(true);
    await stage.screenshot({ path: `artifacts/loading-scene-poster-${info.project.name}.png` });
  } finally { release(); }
  await expect(stage).toHaveClass(/is-rendered/, { timeout: 20000 });
  await expect(stage.locator('.index-world')).toHaveCSS('opacity', '1');
  await expect(stage.locator('.index-poster')).toHaveCSS('opacity', '0');
  expect(await stage.locator('.index-company').evaluateAll(nodes => nodes.every(node => Boolean((node as HTMLElement).style.getPropertyValue('--scene-company-x'))))).toBe(true);
  await stage.screenshot({ path: `artifacts/loading-scene-ready-${info.project.name}.png` });
  await stage.locator('canvas').evaluate(canvas => canvas.dispatchEvent(new Event('webglcontextlost', { cancelable: true })));
  await expect(stage).not.toHaveClass(/is-rendered/);
  await expect(stage.locator('.index-poster')).toHaveCSS('opacity', '1');
});
