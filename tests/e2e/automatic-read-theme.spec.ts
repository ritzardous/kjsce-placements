import { test, expect as baseExpect } from '@playwright/test';
import { randomUUID } from 'node:crypto';
import { initializeApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { signInGoogle } from './auth-helper';

const expect = baseExpect.configure({ timeout: 20000 });
const db = getFirestore(initializeApp({ projectId: 'demo-placementstats' }, 'automatic-read-theme-tests'));
test.setTimeout(60000);
test.beforeEach(() => { if (process.env.E2E_FIREBASE !== 'true') throw new Error('Emulators required.'); });

test('opening visible notifications marks them read without consuming unseen history or moving cards', async ({ page }) => {
  const uid = await signInGoogle(page), ids = Array.from({ length: 25 }, () => randomUUID()), batch = db.batch(), now = Date.now();
  ids.forEach((id, index) => batch.set(db.doc(`procedureNotifications/${uid}/items/${id}`), { title: `Automatic read ${index}`, message: 'A private activity update.', read: false, createdAt: now - index }));
  await batch.commit();
  await page.goto('/#procedures/notifications');
  const first = page.locator(`#notification-${ids[0]}`);
  await first.scrollIntoViewIfNeeded();
  const before = await first.boundingBox();
  await expect.poll(async () => (await db.doc(`procedureNotifications/${uid}/items/${ids[0]}`).get()).data()?.read).toBe(true);
  await expect(first).toHaveClass(/is-read/);
  expect(await first.boundingBox()).toEqual(before);
  expect((await db.doc(`procedureNotifications/${uid}/items/${ids[24]}`).get()).data()?.read).toBe(false);
  await first.locator('.action-disclosure>summary').click();await page.getByRole('button', { name: 'Mark unread', exact: true }).click();
  await expect(first).toHaveClass(/is-unread/);
  // A deliberate manual unread action must not immediately be undone by visibility tracking.
  await page.clock.install(); await page.clock.runFor(1500);
  expect((await db.doc(`procedureNotifications/${uid}/items/${ids[0]}`).get()).data()?.read).toBe(false);
});

test('preview reads only the five opened items and updates the shared count', async ({ page }, info) => {
  test.skip(info.project.name === 'mobile', 'Phones open the full inbox directly.');
  const uid = await signInGoogle(page), ids = Array.from({ length: 7 }, () => randomUUID()), now = Date.now();
  await Promise.all(ids.map((id, index) => db.doc(`procedureNotifications/${uid}/items/${id}`).set({ title: `Preview auto read ${index}`, read: false, createdAt: now - index })));
  await page.locator('.notification-entry').click();
  await expect(page.getByRole('region', { name: 'Recent notifications' }).getByRole('link', { name: /Preview auto read/ })).toHaveCount(5);
  await expect.poll(async () => (await db.doc(`procedureNotifications/${uid}/items/${ids[0]}`).get()).data()?.read).toBe(true);
  await expect(page.getByRole('link', { name: 'Notifications (2)', exact: true })).toBeVisible();
  expect((await db.doc(`procedureNotifications/${uid}/items/${ids[6]}`).get()).data()?.read).toBe(false);
});

test('theme toggle reveals a circular ripple and slap, then preserves the selected theme', async ({ page }, info) => {
  await signInGoogle(page);
  await page.evaluate(() => {
    const original = Element.prototype.animate;
    (window as any).themeEffects = [];
    Element.prototype.animate = function(frames, options) {
      const animation = original.call(this, frames, options);
      if (typeof options === 'object' && options?.pseudoElement?.includes('view-transition')) {
        (window as any).themeEffects.push({ frames, options }); animation.pause(); animation.currentTime = 160;
      }
      return animation;
    };
  });
  const toggle = page.getByRole('button', { name: 'Switch to dark mode', exact: true });
  await toggle.click();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  await expect.poll(() => page.evaluate(() => (window as any).themeEffects.length)).toBe(2);
  const effects = await page.evaluate(() => (window as any).themeEffects);
  expect(effects[0].frames.clipPath[0]).toContain('circle(0px at');
  expect(effects[0].options.pseudoElement).toBe('::view-transition-new(root)');
  expect(effects[1].frames.some((frame: any) => frame.scale === '.82 .9')).toBe(true);
  expect(effects[1].options.pseudoElement).toBe('::view-transition-image-pair(theme-toggle)');
  await page.screenshot({ path: `artifacts/theme-ripple-${info.project.name}.png`, animations: 'allow' });
  await page.evaluate(() => document.getAnimations().filter(animation => Number.isFinite(animation.effect?.getComputedTiming().endTime)).forEach(animation => animation.finish()));
  await expect(page.locator('html')).not.toHaveClass(/theme-transitioning/);
  await page.reload();
  await expect(page.getByRole('button', { name: 'Switch to light mode', exact: true })).toBeVisible();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
});

test('theme follows the system until selected manually and respects reduced motion and keyboard activation', async ({ page, context }) => {
  await page.emulateMedia({ colorScheme: 'dark', reducedMotion: 'reduce' });
  await signInGoogle(page);
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  const toggle = page.getByRole('button', { name: 'Switch to light mode', exact: true });
  await toggle.focus(); await page.keyboard.press('Enter');
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
  await expect(page.locator('html')).not.toHaveClass(/theme-transitioning/);
  expect(await page.evaluate(() => document.getAnimations().filter(animation => (animation.effect as KeyframeEffect)?.pseudoElement?.includes('view-transition')).length)).toBe(0);
  const other = await context.newPage();
  await other.goto('/#home');
  await expect(other.locator('html')).toHaveAttribute('data-theme', 'light');
  await page.evaluate(() => localStorage.setItem('placement-theme', 'dark'));
  await expect(other.locator('html')).toHaveAttribute('data-theme', 'dark');
  await other.close();
});

test('automatic read failures remain unread and retry successfully', async ({ page }) => {
  const uid = await signInGoogle(page), id = randomUUID();
  await db.doc(`procedureNotifications/${uid}/items/${id}`).set({ title: 'Retry automatic reading', message: 'A private update.', read: false, createdAt: Date.now() });
  let failing = true;
  await page.route('**/procedureCommunity', async route => {
    if (route.request().postDataJSON()?.data?.action === 'readNotifications' && failing) return route.fulfill({ status: 503, json: { error: { status: 'UNAVAILABLE', message: 'Read status temporarily unavailable.' } } });
    return route.continue();
  });
  await page.goto('/#procedures/notifications');
  const card = page.locator(`#notification-${id}`);
  await card.scrollIntoViewIfNeeded();
  await expect(page.getByRole('button', { name: 'Retry read status', exact: true })).toBeVisible();
  expect((await db.doc(`procedureNotifications/${uid}/items/${id}`).get()).data()?.read).toBe(false);
  failing = false;
  await page.getByRole('button', { name: 'Retry read status', exact: true }).click();
  await card.scrollIntoViewIfNeeded();
  await expect(card).toHaveClass(/is-read/);
  expect((await db.doc(`procedureNotifications/${uid}/items/${id}`).get()).data()?.read).toBe(true);
});

test('rapid theme changes settle on the latest choice and older browsers still toggle', async ({ page }) => {
  await signInGoogle(page);
  await page.evaluate(() => { const button = document.querySelector<HTMLButtonElement>('.theme-toggle')!; button.click(); button.click(); button.click(); });
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  await expect(page.locator('html')).not.toHaveClass(/theme-transitioning/);
  await expect(page.getByRole('button', { name: 'Switch to light mode', exact: true })).toBeVisible();
  await page.evaluate(() => Object.defineProperty(document, 'startViewTransition', { configurable: true, value: undefined }));
  await page.getByRole('button', { name: 'Switch to light mode', exact: true }).click();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
  await expect(page.locator('html')).not.toHaveClass(/theme-transitioning/);
});
