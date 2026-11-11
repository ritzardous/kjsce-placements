import { test, expect as baseExpect } from '@playwright/test';
import { randomUUID } from 'node:crypto';
import { initializeApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { signInGoogle } from './auth-helper';

const db = getFirestore(initializeApp({ projectId: 'demo-placementstats' }, 'notification-browser-tests'));
const expect = baseExpect.configure({ timeout: 20000 });
test.setTimeout(60000);
test.beforeEach(() => { if (process.env.E2E_FIREBASE !== 'true') throw new Error('Emulators required.'); });

test('global inbox works from statistics, supports unread/archive undo and following preferences', async ({ page }) => {
  const uid = await signInGoogle(page), id = randomUUID();
  await db.doc(`procedureNotifications/${uid}/items/${id}`).set({ title: 'Notification regression update', message: 'A private review decision.', read: false, createdAt: Date.now(), submissionId: 'removed-experience' });
  await page.goto('/#2026/overview');
  const bell = page.getByRole('link', { name: /^Notifications/ });
  await expect(bell).toBeVisible();
  await bell.click();
  if (await page.locator('.notification-preview').isVisible()) await page.getByRole('link',{name:'View all notifications',exact:true}).click();
  await expect(page.getByRole('heading', { name: /Notification regression update/ })).toBeVisible();
  await expect(page.getByRole('link', { name: /^Notifications/ })).toBeVisible();
  const card = page.locator(`#notification-${id}`);
  await card.scrollIntoViewIfNeeded();
  await expect(card).toHaveClass(/is-read/);
  await itemAction(page, card, 'Mark unread');
  await expect(card.getByText('New', { exact: true })).toBeVisible();
  await itemAction(page, card, 'Archive');
  await expect(card).toHaveCount(0);
  await page.getByRole('button', { name: 'Undo archive', exact: true }).click();
  await page.getByRole('button', { name: 'Refresh notifications', exact: true }).click();
  await expect(card).toBeVisible();
  await page.getByRole('link', { name: 'Notification preferences', exact: true }).click();
  await page.getByLabel('Follow a company or batch').selectOption('batch:2026');
  await page.getByRole('button', { name: 'Follow updates', exact: true }).click();
  await expect(page.locator('.notification-settings').getByRole('status')).toContainText('Notification settings saved.');
  await page.getByRole('button', { name: 'Mute', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Unmute', exact: true })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({ path: `artifacts/notification-inbox-${test.info().project.name}.png`, fullPage: true });
});

test('failed refresh retains history, failed read retains unread state and account switch clears private cards', async ({ page }) => {
  const uid = await signInGoogle(page), id = randomUUID();
  await db.doc(`procedureNotifications/${uid}/items/${id}`).set({ title: 'Private account update', message: 'Only for this account.', read: false, createdAt: Date.now() });
  await page.goto('/#procedures/notifications');
  const card = page.locator(`#notification-${id}`);
  await expect(card).toBeVisible();
  await card.scrollIntoViewIfNeeded();
  await expect(card).toHaveClass(/is-read/);
  await itemAction(page, card, 'Mark unread');
  await page.context().setOffline(true);
  await expect(page.getByText('Offline. Showing your last loaded updates.')).toBeVisible();
  await itemAction(page, card, 'Mark as read');
  await expect(card.getByText('New', { exact: true })).toBeVisible();
  await page.context().setOffline(false);
  await page.locator('.auth-controls .account-menu > summary').click();
  await page.getByRole('button', { name: 'Log out', exact: true }).click();
  await expect(card).toHaveCount(0);
  await signInGoogle(page);
  await page.goto('/#procedures/notifications');
  await expect(page.getByText('No updates in this view yet.', { exact: true })).toBeVisible();
  await expect(page.getByRole('heading', { name: /Private account update/ })).toHaveCount(0);
});

test('desktop preview dismisses with Escape and focuses the selected private update', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name === 'mobile', 'Mobile opens the full inbox directly.');
  const uid = await signInGoogle(page), id = randomUUID();
  await db.doc(`procedureNotifications/${uid}/items/${id}`).set({ title: 'Preview regression update', read: false, createdAt: Date.now() });
  const trigger = page.getByRole('link', { name: /^Notifications/ });
  await trigger.click();
  await expect(page.getByRole('region', { name: 'Recent notifications' })).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(trigger).toBeFocused();
  await expect(page.getByRole('region', { name: 'Recent notifications' })).toHaveCount(0);
  await page.goto('/#procedures/notifications');
  await expect(page.locator(`#notification-${id}`)).toBeVisible();
  await page.locator(`#notification-${id}`).scrollIntoViewIfNeeded();
  await expect(page.locator(`#notification-${id}`)).toHaveClass(/is-read/);
  await page.getByRole('button', { name: 'Unread notifications', exact: true }).click();
  await expect(page.locator(`#notification-${id}`)).toHaveCount(0);
  await trigger.click();
  await page.getByRole('link', { name: /Preview regression update/ }).click();
  await expect(page.locator(`#notification-${id}`)).toBeFocused();
  await expect(page.getByRole('button', { name: 'All notifications', exact: true })).toHaveAttribute('aria-pressed', 'true');
});

test('an old refresh cannot undo a successful read action', async ({ page }) => {
  const uid = await signInGoogle(page), id = randomUUID(), createdAt = Date.now();
  await db.doc(`procedureNotifications/${uid}/items/${id}`).set({ title: 'Concurrent refresh update', message: 'A private decision.', read: false, createdAt });
  await page.goto('/#procedures/notifications');
  const card = page.locator(`#notification-${id}`);
  await expect(card).toBeVisible();
  await card.scrollIntoViewIfNeeded();
  await expect(card).toHaveClass(/is-read/);
  await itemAction(page, card, 'Mark unread');
  let release!: () => void, intercepted!: () => void, delay = true;
  const gate = new Promise<void>(resolve => { release = resolve; }), started = new Promise<void>(resolve => { intercepted = resolve; });
  await page.route('**/procedureCommunity', async route => {
    if (route.request().postDataJSON()?.data?.action !== 'notifications' || !delay) return route.continue();
    delay = false; intercepted(); await gate;
    await route.fulfill({ json: { result: { rows: [{ id, title: 'Concurrent refresh update', message: 'An older snapshot.', read: false, createdAt }], cursor: null, more: false, checkedAt: createdAt } } });
  });
  try {
    await page.getByRole('button', { name: 'Refresh notifications', exact: true }).click();
    await started;
    await itemAction(page, card, 'Mark as read');
    await card.scrollIntoViewIfNeeded();
  await expect(card).toHaveClass(/is-read/);
    release();
    await card.scrollIntoViewIfNeeded();
  await expect(card).toHaveClass(/is-read/);
    await expect(card.getByText('An older snapshot.', { exact: true })).toHaveCount(0);
  } finally { release(); }
});

test('cross-tab read changes reconcile the unread inbox', async ({ page, context }) => {
  const uid = await signInGoogle(page), id = randomUUID();
  await db.doc(`procedureNotifications/${uid}/items/${id}`).set({ title: 'Cross-tab update', read: false, createdAt: Date.now() });
  await page.goto('/#procedures/notifications');
  await page.getByRole('button', { name: 'Unread notifications', exact: true }).click();
  const other = await context.newPage();
  await other.goto('/#procedures/notifications');
  await expect(other.locator(`#notification-${id}`)).toBeVisible();
  // Simulate two visible windows: browsers may hide the first tab when opening another.
  await page.evaluate(() => { Object.defineProperty(document, 'visibilityState', { configurable: true, value: 'visible' }); });
  await other.locator(`#notification-${id}`).scrollIntoViewIfNeeded();
  await expect(other.locator(`#notification-${id}`)).toHaveClass(/is-read/);
  await expect(page.locator('.notification-card.is-unread')).toHaveCount(0);
  await expect(page.getByRole('link', { name: 'Notifications', exact: true })).toBeVisible();
  await other.close();
});

test('shared summary polling stays bounded and stops while hidden', async ({ page }) => {
  let summaries = 0;
  await page.route('**/procedureCommunity', async route => {
    if (route.request().postDataJSON()?.data?.action !== 'notificationSummary') return route.continue();
    summaries++;
    await route.fulfill({ json: { result: { unread: 0, checkedAt: Date.now() } } });
  });
  await page.clock.install();
  await signInGoogle(page);
  await page.goto('/#procedures/notifications');
  await expect(page.getByText('No updates in this view yet.', { exact: true })).toBeVisible();
  const initial = summaries;
  await page.clock.runFor(65000);
  await expect.poll(() => summaries).toBe(initial + 1);
  await page.evaluate(() => { Object.defineProperty(document, 'visibilityState', { configurable: true, value: 'hidden' }); document.dispatchEvent(new Event('visibilitychange')); });
  const hidden = summaries;
  await page.clock.runFor(240000);
  expect(summaries).toBe(hidden);
});

async function itemAction(page: import('@playwright/test').Page, card: import('@playwright/test').Locator, label: string) {
  await card.locator('.action-disclosure > summary').click();
  await page.getByRole('button', {name:label,exact:true}).click();
}
