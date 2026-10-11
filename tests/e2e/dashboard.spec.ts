import { test, expect } from '@playwright/test';
import {hiddenYears} from '../../src/routing';
import { signInGoogle } from './auth-helper';
import { readFileSync } from 'node:fs';
import { batch2026, datasetSchema } from '../../shared/dataset';
import { buildStatistics } from '../../shared/statistics';

const dataset = datasetSchema.parse(JSON.parse(readFileSync('data/placements-2026.json', 'utf8')));
const payload = { metadata: dataset.metadata, statistics: buildStatistics(dataset, batch2026) };
async function chooseSection(page: import('@playwright/test').Page, name: string) {
 const views:Record<string,string>={'Candidates & Roles':'Candidates & roles','Timeline':'Hiring timeline','Insights':'Insights'};
 const section=views[name]?'Career explorer':name;
 const quick=page.getByRole('navigation',{name:'Quick navigation'});
 if(await quick.isVisible()) {await quick.getByRole('button',{name:'Statistics',exact:true}).click();await page.getByRole('dialog').getByRole('link',{name:section,exact:true}).click();}
 else await page.getByRole('navigation',{name:'Dashboard',exact:true}).getByRole('link',{name:section,exact:true}).click();
 if(views[name])await page.getByRole('navigation',{name:'Career explorer views'}).getByRole('link',{name:views[name],exact:true}).click();
}
async function chooseBatch(page:import('@playwright/test').Page,year:number) {
 await page.locator('.topbar .batch-back').click();
 await page.getByRole('link',{name:new RegExp(`Class of ${year}`)}).click();
}

test.beforeEach(async ({ page }) => {
  if (process.env.E2E_FIREBASE !== 'true') throw new Error('Run npm run test:firebase for isolated seeded Firestore/Auth emulator tests.');
  await signInGoogle(page);
});

test('ongoing 2027 season stays explicit across routes, reload, refresh and year changes', async ({ page }) => {
  if(hiddenYears.has(2027)){await page.goto('/#home');await expect(page.getByRole('heading',{name:'Class of 2027',exact:true})).toHaveCount(0);await page.goto('/#2027/overview');await expect(page).toHaveURL(/#home$/);return;}
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
  await chooseBatch(page,2025);
  await expect(page.getByRole('heading', { name: /KJSCE '25/ })).toBeVisible();
  await expect(page.locator('.live-notice')).toHaveCount(0);
  await chooseBatch(page,2026);
  await expect(page.getByRole('heading', { name: /KJSCE '26/ })).toBeVisible();
  await expect(page.locator('.live-badge')).toHaveCount(0);
});
test('year switching keeps 2025 links, refresh, missing data and campus filters isolated from 2026', async ({ page }) => {
  await page.goto('/#overview');
  await expect(page.getByRole('heading', { name: /Placement Stats/ })).toBeVisible();
  await chooseBatch(page,2025);
  await expect(page.getByRole('heading', { name: /KJSCE '25/ })).toBeVisible();
  await expect(page.locator('.stat').filter({ hasText: 'Unique UG students placed' }).locator('.stat-value')).toHaveText('323');
  await expect(page.locator('.stat').filter({ hasText: 'Candidate selections recorded' }).locator('.stat-value')).toHaveText('360');
  await expect(page.locator('.stat').filter({ hasText: 'Placement rate' }).locator('.stat-value')).toHaveText('—');
  await chooseSection(page,'Candidates & Roles');
  await expect(page).toHaveURL(/#2025\/explore/);
  await page.getByRole('combobox', { name: 'Campus status' }).selectOption('Off campus');
  await expect(page.locator('.result-count')).toHaveText('29 / 360');
  await page.getByRole('textbox', { name: 'Search candidates' }).fill('Gaurish');
  await expect(page.locator('.result-count')).toHaveText('1 / 360');
  await page.getByRole('link', { name: 'Google', exact: true }).click();
  await page.reload();
  await expect(page).toHaveURL(/#2025\/company\/google/);
  await expect(page.getByRole('heading', { name: 'Google', exact: true })).toBeVisible();
  await page.locator('.company-source-details summary').click();await expect(page.locator('.company-source-details')).toContainText('Off Campus Placement');
  await page.getByRole('link', { name: '← All Companies', exact: true }).click();
  await page.getByRole('textbox', { name: 'Search companies' }).fill('Goldman');
  await page.locator('tbody').getByRole('link', { name: 'Goldman Sachs', exact: true }).click();
  await expect(page.locator('.a-date').first()).toContainText('—');
  await expect(page.locator('.a-role').first()).toContainText('Role not provided');
  await chooseBatch(page,2026);
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


test('company candidate LinkedIn links stay with the 2026 batch and missing profiles are clear',async({page})=>{
  await page.goto('/#company/barclays');
  await expect(page.getByRole('heading',{name:'Barclays',exact:true})).toBeVisible();
  const candidate=page.locator('tbody tr').filter({hasText:'16014022147'});
  const link=candidate.getByRole('link',{name:/Prithviraj.*LinkedIn/});
  await expect(link).toHaveAttribute('href','https://www.linkedin.com/in/prithviraj-sawant-boby/');
  await expect(link).toHaveAttribute('target','_blank');
  await expect(link).toHaveAttribute('rel','noopener noreferrer');
  await expect(page.locator('tbody tr').filter({hasText:'16010422073'}).getByText('Coming soon',{exact:true})).toBeVisible();
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  await candidate.scrollIntoViewIfNeeded();
  await page.screenshot({path:`artifacts/candidate-linkedin-${test.info().project.name}.png`});
  await page.goto('/#2025/company/barclays');
  await expect(page.getByRole('heading',{name:'Barclays',exact:true})).toBeVisible();
  await expect(page.locator('a.candidate-linkedin')).toHaveCount(0);
  await expect(page.locator('.candidate-linkedin-pending').first()).toBeVisible();
});
