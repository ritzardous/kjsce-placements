import { test, expect } from '@playwright/test';
import { signInGoogle } from './auth-helper';
import { readFileSync } from 'node:fs';
import { batch2026, datasetSchema } from '../../shared/dataset';
import { buildStatistics } from '../../shared/statistics';

const dataset = datasetSchema.parse(JSON.parse(readFileSync('data/placements-2026.json', 'utf8')));
const payload = { metadata: dataset.metadata, statistics: buildStatistics(dataset, batch2026) };
async function chooseSection(page: import('@playwright/test').Page, name: string) {
  const menu=page.locator('.dashboard-mobile-menu');
  if(await menu.isVisible()) await menu.locator('summary').click();
  await page.getByRole('link',{name,exact:true}).click();
}

test.beforeEach(async ({ page }) => {
  if (process.env.E2E_FIREBASE !== 'true') throw new Error('Run npm run test:firebase for isolated seeded Firestore/Auth emulator tests.');
  await signInGoogle(page);
});

test('ongoing 2027 season stays explicit across routes, reload, refresh and year changes', async ({ page }) => {
  await page.goto('/#2027/overview');
  await expect(page.getByRole('heading', { name: /KJSCE '27/ })).toBeVisible();
  await expect(page.locator('.live-notice')).toContainText('Placements ongoing');
  await expect(page.locator('.live-notice')).toContainText('08 Oct 2026');
  await expect(page.locator('.stat').filter({ hasText: 'Candidate selections recorded' }).locator('.stat-value')).toHaveText('121');
  await expect(page.locator('.stat').filter({ hasText: 'Placement rate' }).locator('.stat-value')).toHaveText('—');
  await chooseSection(page,'Companies');
  await expect(page).toHaveURL(/#2027\/companies/);
  await page.getByRole('link', { name: 'Barclays', exact: true }).click();
  await expect(page).toHaveURL(/#2027\/company\/barclays/);
  await page.reload();
  await expect(page.getByRole('heading', { name: 'Barclays', exact: true })).toBeVisible();
  await expect(page.locator('.live-notice')).toBeVisible();
  await page.getByRole('button', { name: 'Refresh latest published data' }).click();
  await expect(page.getByRole('heading', { name: 'Barclays', exact: true })).toBeVisible();
  await page.getByRole('combobox', { name: 'Placement year' }).selectOption('2025');
  await expect(page.getByRole('heading', { name: /KJSCE '25/ })).toBeVisible();
  await expect(page.locator('.live-notice')).toHaveCount(0);
  await page.getByRole('combobox', { name: 'Placement year' }).selectOption('2026');
  await expect(page.getByRole('heading', { name: /KJSCE '26/ })).toBeVisible();
  await expect(page.locator('.live-badge')).toHaveCount(0);
});
test('year switching keeps 2025 links, refresh, missing data and campus filters isolated from 2026', async ({ page }) => {
  await page.goto('/#overview');
  await expect(page.getByRole('heading', { name: /Placement Stats/ })).toBeVisible();
  await page.getByRole('combobox', { name: 'Placement year' }).selectOption('2025');
  await expect(page.getByRole('heading', { name: /KJSCE '25/ })).toBeVisible();
  await expect(page.locator('.stat').filter({ hasText: 'Unique UG students placed' }).locator('.stat-value')).toHaveText('323');
  await expect(page.locator('.stat').filter({ hasText: 'Candidate selections recorded' }).locator('.stat-value')).toHaveText('360');
  await expect(page.locator('.stat').filter({ hasText: 'Placement rate' }).locator('.stat-value')).toHaveText('—');
  await chooseSection(page,'Candidates & Roles');
  await expect(page).toHaveURL(/#2025\/candidates/);
  await page.getByRole('combobox', { name: 'Campus status' }).selectOption('Off campus');
  await expect(page.locator('.result-count')).toHaveText('29 / 360');
  await page.getByRole('textbox', { name: 'Search candidates' }).fill('Gaurish');
  await expect(page.locator('.result-count')).toHaveText('1 / 360');
  await page.getByRole('link', { name: 'Google', exact: true }).click();
  await page.reload();
  await expect(page).toHaveURL(/#2025\/company\/google/);
  await expect(page.getByRole('heading', { name: 'Google', exact: true })).toBeVisible();
  await expect(page.locator('.note-flag')).toContainText('Off Campus Placement');
  await page.getByRole('link', { name: '← All Companies', exact: true }).click();
  await page.getByRole('textbox', { name: 'Search companies' }).fill('Goldman');
  await page.locator('tbody').getByRole('link', { name: 'Goldman Sachs', exact: true }).click();
  await expect(page.locator('.a-date').first()).toContainText('—');
  await expect(page.locator('.a-role').first()).toContainText('Role not provided');
  await page.getByRole('combobox', { name: 'Placement year' }).selectOption('2026');
  await expect(page.getByRole('heading', { name: /KJSCE '26/ })).toBeVisible();
  await chooseSection(page,'Candidates & Roles');
  await expect(page.locator('.result-count')).toHaveText('311 / 311');
  await expect(page.getByRole('combobox', { name: 'Campus status' })).toHaveCount(0);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});
test('overview renders legacy totals, chart series, and fits viewport', async ({ page }) => {
  await page.goto('/#overview');
  await expect(page.getByRole('heading', { name: /Placement Stats/ })).toBeVisible();
  await expect(page.locator('.stat').filter({ hasText: 'Unique B.Tech students placed' }).locator('.stat-value')).toHaveText('299');
  await expect(page.locator('.stat').filter({ hasText: 'Candidate selections recorded' }).locator('.stat-value')).toHaveText('311');
  await page.getByRole('button', { name: 'Unique students', exact: true }).click();
  await expect(page.getByRole('img', { name: 'Calculated unique students placed' })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
});
test('companies search, type and CTC filters work; old detail URLs load', async ({ page }) => {
  await page.goto('/#companies');
  await page.getByRole('textbox', { name: 'Search companies' }).fill('Barclays');
  await expect(page.locator('.result-count')).toHaveText('1 / 82');
  await page.locator('tbody').getByRole('link', { name: 'Barclays', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Barclays', exact: true })).toBeVisible();
  await page.goBack();
  await expect(page.getByRole('textbox', { name: 'Search companies' })).toHaveValue('Barclays');
  await page.goForward();
  await page.reload();
  await expect(page.locator('.announcement-block')).toHaveCount(payload.statistics.companies.find(c => c.key === 'barclays')!.announcements.length);
  await page.goBack();
  await page.getByRole('textbox', { name: 'Search companies' }).fill('Barclays');
  await page.getByRole('button', { name: '<5L', exact: true }).click();
  await expect(page.getByText('No matches', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'ALL', exact: true }).click();
  await page.getByRole('combobox', { name: 'Company type' }).selectOption('IT');
  await expect(page.getByText('No matches', { exact: true })).toBeVisible();
});
test('candidate search, role chips and pagination expose all selections', async ({ page }) => {
  await page.goto('/#candidates');
  await expect(page.locator('.result-count')).toHaveText('311 / 311');
  await expect(page.locator('tbody tr')).toHaveCount(100);
  await page.getByRole('button', { name: 'Next', exact: true }).click();
  await expect(page.getByText('Page 2 of 4')).toBeVisible();
  await page.getByRole('textbox', { name: 'Search candidates' }).fill('16010122044');
  await expect(page.locator('tbody tr')).toHaveCount(payload.statistics.candidates.filter(c => c.roll === '16010122044').length);
  await page.locator('.role-chip').first().click();
  await expect(page.getByRole('textbox', { name: 'Search candidates' })).toHaveValue('');
  await expect(page.locator('.role-chip').first()).toHaveAttribute('aria-pressed', 'true');
});
test('branches, timeline and insights render without browser exceptions', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  for (const path of ['/#branches/IT', '/#timeline', '/#insights', '/#company/not-found']) {
    await page.goto(path);
    await expect(page.locator('.source-notes')).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  }
  await expect(page.getByText('Company not found', { exact: true })).toBeVisible();
  expect(errors).toEqual([]);
});
test('Firestore loading error displays retry and recovers using real emulator data', async ({ page }) => {
  await page.route(/\/src\/repository\.ts(?:\?t=\d+)?$/, route => route.fulfill({
    contentType: 'application/javascript',
    body: `export async function loadDashboard(year) {
      if (!window.retryEnabled) throw new Error('Temporary Firestore outage');
      const real = await import('/src/repository.ts?retry-real');
      return real.loadDashboard(year);
    }`,
  }));
  await page.goto('/#overview');
  await page.reload();
  await expect(page.getByRole('heading', { name: 'Placement data unavailable' })).toBeVisible();
  await page.evaluate(() => { Object.assign(window, { retryEnabled: true }); });
  await page.getByRole('button', { name: 'Try again' }).click();
  await expect(page.getByRole('heading', { name: /Placement Stats/ })).toBeVisible();
});
