import { test, expect as baseExpect } from '@playwright/test';
import { signInGoogle } from './auth-helper';
const expect = baseExpect.configure({ timeout: 20000 });
test.setTimeout(90000);
test.beforeEach(() => { if (process.env.E2E_FIREBASE !== 'true') throw Error('Isolated emulators required'); });

test('focused preferences stay readable and following controls persist their changes', async ({ page }, info) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await signInGoogle(page);
  await page.goto('/#procedures/notifications?preferences=1');
  await expect(page.getByRole('heading', { name: 'Notification preferences', exact: true })).toBeVisible();
  const toggle = page.getByRole('switch', { name: 'Followed updates', exact: true });
  await expect(toggle).toBeVisible();
  await expect(page.locator('.notification-toolbar,.notification-card')).toHaveCount(0);
  await expect(page.getByText('No follows yet', { exact: true })).toBeVisible();
  const advanced = page.locator('.settings-advanced');
  await expect(advanced).not.toHaveAttribute('open');
  await expect(page.getByRole('button', { name: 'Clear older updates', exact: true })).toBeHidden();
  for (const theme of ['light', 'dark']) {
    await page.evaluate(value => { localStorage.setItem('placement-theme', value); dispatchEvent(new StorageEvent('storage', { key: 'placement-theme' })); }, theme);
    await page.evaluate(() => document.fonts.ready);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true);
    const select = await page.getByLabel('Follow a company or batch').boundingBox();
    const button = await page.getByRole('button', { name: 'Follow updates', exact: true }).boundingBox();
    if (info.project.name === 'desktop') expect(Math.abs(select!.y + select!.height - button!.y - button!.height)).toBeLessThanOrEqual(1);
    else {
      expect(button!.y).toBeGreaterThanOrEqual(select!.y + select!.height);
      await page.setViewportSize({ width: 320, height: 740 });
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true);
    }
    await page.screenshot({ path: `artifacts/preferences-${theme}-${info.project.name}.png`, fullPage: true });
  }
  await page.getByLabel('Follow a company or batch').selectOption('batch:2026');
  await page.getByRole('button', { name: 'Follow updates', exact: true }).click();
  const followed = page.locator('.notification-follow-list li').filter({ hasText: 'Class of 2026' });
  await expect(followed).toBeVisible();
  await expect(toggle).toBeChecked();
  await followed.getByRole('button', { name: 'Mute', exact: true }).click();
  await expect(followed.getByRole('button', { name: 'Unmute', exact: true })).toHaveAttribute('aria-pressed', 'true');
  await page.reload();
  await expect(page.locator('.notification-follow-list li').getByRole('button', { name: 'Unmute', exact: true })).toBeVisible();
  await page.getByRole('switch', { name: 'Followed updates', exact: true }).uncheck();
  await expect(page.getByRole('switch', { name: 'Followed updates', exact: true })).not.toBeChecked();
  await expect(page.locator('.notification-follow-list li')).toHaveCount(1);
  await page.getByRole('button', { name: 'Stop following Class of 2026', exact: true }).click();
  await expect(page.getByText('No follows yet', { exact: true })).toBeVisible();
  await advanced.locator('summary').click();
  await expect(page.getByRole('button', { name: 'Clear older updates', exact: true })).toBeVisible();
  await expect(advanced).toContainText('Review decisions and report history are kept.');
  await page.getByRole('link', { name: 'Back to notifications', exact: false }).click();
  await expect(page.getByRole('heading', { name: 'Notifications', exact: true })).toBeVisible();
  await expect(page.locator('.settings-workspace')).toHaveCount(0);
  await page.getByRole('link', { name: 'Notification preferences', exact: true }).click();
  await expect(toggle).toBeVisible();
});

test('account shortcuts clearly separate writing, reading and notification settings', async ({ page }, info) => {
  await signInGoogle(page);
  await page.goto('/#account');
  const shortcuts = page.getByRole('navigation', { name: 'Manage your content' });
  await expect(shortcuts.getByRole('link')).toHaveCount(3);
  for (const theme of ['light', 'dark']) {
    await page.evaluate(value => { localStorage.setItem('placement-theme', value); dispatchEvent(new StorageEvent('storage', { key: 'placement-theme' })); }, theme);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true);
    await page.screenshot({ path: `artifacts/account-refined-${theme}-${info.project.name}.png`, fullPage: true });
  }
  await shortcuts.getByRole('link', { name: /Notification preferences/ }).click();
  await expect(page.getByRole('heading', { name: 'Notification preferences', exact: true })).toBeVisible();
  await expect(page.getByRole('switch', { name: 'Followed updates', exact: true })).toBeVisible();
});

test('a failed preference save restores the previous switch state', async ({ page }) => {
  await signInGoogle(page);
  await page.goto('/#procedures/notifications?preferences=1');
  const toggle = page.getByRole('switch', { name: 'Followed updates', exact: true });
  await expect(toggle).toBeVisible();
  await expect(toggle).not.toBeChecked();
  await page.route('**/procedureCommunity', async route => {
    const data = route.request().postDataJSON()?.data;
    if (data?.action === 'saveNotificationSettings') await route.fulfill({ status: 503, contentType: 'application/json', headers: { 'access-control-allow-origin': '*' }, body: JSON.stringify({ error: { status: 'UNAVAILABLE', message: 'Save unavailable' } }) });
    else await route.continue();
  });
  await toggle.check();
  await expect(page.getByRole('alert')).toBeVisible();
  await expect(toggle).not.toBeChecked();
  await expect(toggle).toBeEnabled();
  await page.unroute('**/procedureCommunity');
  await toggle.check();
  await expect(page.getByRole('status')).toContainText('Notification settings saved.');
  await expect(toggle).toBeChecked();
});
