import { test, expect } from '@playwright/test';
import { initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { signInGoogle } from './auth-helper';
const admin = initializeApp({ projectId: 'demo-placementstats' }, 'identity-checks');
function contrast(a: string, b: string) {
  const luminance = (color: string) => color.match(/[\d.]+/g)!.slice(0, 3).map(Number)
    .map(value => value / 255).map(value => value <= .04045 ? value / 12.92 : ((value + .055) / 1.055) ** 2.4)
    .reduce((sum, value, index) => sum + value * [.2126, .7152, .0722][index], 0);
  const first = luminance(a), second = luminance(b);
  return (Math.max(first, second) + .05) / (Math.min(first, second) + .05);
}
test.setTimeout(120000);
test.beforeEach(() => {
  if (process.env.E2E_FIREBASE !== 'true' || process.env.FIREBASE_AUTH_EMULATOR_HOST !== '127.0.0.1:9099') throw Error('Isolated emulators required');
});

test('landing identity carries through reader, contributor, account and admin screens', async ({ page }, info) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  const uid = await signInGoogle(page);
  for (const theme of ['light', 'dark']) {
    await page.evaluate(value => {
      localStorage.setItem('placement-theme', value);
      dispatchEvent(new StorageEvent('storage', { key: 'placement-theme' }));
    }, theme);
    for (const route of ['home', '2026/overview', 'procedures', 'procedures/contribute', 'account', 'procedures/notifications']) {
      await page.goto('/#' + route);
      await expect(page.locator('.app-header .workspace-brand-mark')).toBeVisible();
      await expect(page.locator('.app-header .area-nav')).toHaveCount(0);
      if (info.project.name === 'desktop') {
        const navigation = page.locator('.workspace-area-navigation .area-nav');
        await expect(navigation).toBeVisible();
        const header = await page.locator('.app-header').boundingBox();
        const tabs = await navigation.boundingBox();
        const brand = await page.locator('.app-header .brand').boundingBox();
        expect(tabs!.y).toBeGreaterThan(header!.y + header!.height);
        expect(Math.abs(tabs!.x - brand!.x)).toBeLessThanOrEqual(2);
        await expect(navigation.locator('.area-switcher')).toHaveCSS('background-color', 'rgba(0, 0, 0, 0)');
        await expect(navigation).toHaveCSS('overflow-y', 'visible');
        const current = navigation.locator('a[aria-current="page"]');
        if (await current.count()) await expect(current).toHaveCSS('background-color', 'rgba(0, 0, 0, 0)');
      }
      await expect(page.locator('.app-header .notification-entry')).toHaveCSS('box-shadow', 'none');
      await expect(page.locator('.app-header .notification-entry-label')).toHaveCount(0);
      await expect(page.locator('.app-header .notification-entry')).toHaveAccessibleName(/Notifications/);
      await expect(page.locator('.app-header .notification-entry')).toHaveCSS('width', '44px');
      await expect(page.locator('.app-header')).toHaveCSS('border-radius', info.project.name === 'mobile' ? '18px' : '22px');
      await expect(page.locator('main h1').first()).toBeVisible();
      const shell = page.locator('#app,.portal-shell').filter({ has: page.locator('.app-header') }).first();
      const palette = await shell.evaluate(el => {
        const style = getComputedStyle(el);
        const span = document.createElement('span');
        span.style.color = 'var(--accent)'; el.append(span);
        const accent = getComputedStyle(span).color;
        span.style.color = 'var(--ink-soft)'; const muted = getComputedStyle(span).color;
        span.remove();
        return { background: style.backgroundColor, ink: style.color, accent, muted };
      });
      expect(palette.background).toBe(theme === 'light' ? 'rgb(247, 247, 239)' : 'rgb(16, 20, 17)');
      expect(palette.accent).toBe(theme === 'light' ? 'rgb(36, 69, 235)' : 'rgb(141, 163, 255)');
      expect(contrast(palette.ink, palette.background)).toBeGreaterThanOrEqual(7);
      expect(contrast(palette.muted, palette.background)).toBeGreaterThanOrEqual(4.5);
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true);
      await page.screenshot({ path: `artifacts/identity-${route.replaceAll('/', '-')}-${theme}-${info.project.name}.png`, animations: 'disabled' });
      if (info.project.name === 'mobile') {
        const original = page.viewportSize()!;
        await page.setViewportSize({ width: 320, height: 640 });
        expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true);
        await expect(page.locator('.account-menu>summary')).toBeVisible();
        await page.setViewportSize(original);
      }
    }
    await page.goto('/#home');
    await expect(page.locator('.portal-welcome h1')).toHaveCSS('font-weight', '400');
    expect(await page.locator('.portal-welcome h1').evaluate(el => getComputedStyle(el).fontFamily)).toContain('Lora');
    await page.locator('.account-menu>summary').click();
    await expect(page.getByRole('dialog', { name: 'Account', exact: true })).toBeVisible();
    await page.screenshot({ path: `artifacts/identity-account-menu-${theme}-${info.project.name}.png`, animations: 'disabled' });
    await page.keyboard.press('Escape');
  }
  await getAuth(admin).setCustomUserClaims(uid, { role: 'admin' });
  await page.evaluate(`(async()=>{const {getFirebase}=await import('/src/lib/firebase.ts');await getFirebase().auth.currentUser.getIdToken(true);})()`);
  for (const theme of ['light', 'dark']) {
    await page.evaluate(value => { localStorage.setItem('placement-theme', value); dispatchEvent(new StorageEvent('storage', { key: 'placement-theme' })); }, theme);
    await page.goto('/#admin');
    await expect(page.getByRole('heading', { name: 'Needs attention', exact: true })).toBeVisible();
    await expect(page.getByRole('link', { name: /submissions awaiting review/ })).toBeVisible({ timeout: 20000 });
    await page.screenshot({ path: `artifacts/identity-admin-${theme}-${info.project.name}.png`, animations: 'disabled' });
    await expect(page.getByRole('navigation', { name: 'Administration', exact: true })).toBeVisible();
  }
});
