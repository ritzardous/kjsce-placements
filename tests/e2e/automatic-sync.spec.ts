import { test, expect } from '@playwright/test';
import { initialProcedureDraft } from '../../shared/procedures';
import { signInGoogle } from './auth-helper';

test('community refreshes quietly, retains loaded pages and pauses in hidden/offline tabs', async ({ page }) => {
  await signInGoogle(page);
  let revision = 1;
  const calls: unknown[] = [];
  await page.route('**/procedureCommunity', async route => {
    const request = route.request().postDataJSON()?.data;
    if (request?.action !== 'browse') return route.continue();
    const cursor = request.payload.cursor;
    calls.push(cursor);
    const start = cursor ? 12 : 0, length = cursor ? 2 : 12;
    const rows = Array.from({length}, (_, i) => ({...initialProcedureDraft(), id:`auto-${start+i}`, companyName:'Barclays', companyKey:'barclays', title:`Automatic experience ${start+i} revision ${revision}`, body:'A useful interview experience with preparation advice.', published:true, publishedAt:Date.now()-i, score:0, upvotes:0, downvotes:0, revision}));
    await route.fulfill({json:{result:{rows,cursor:{id:rows.at(-1)!.id,values:[1]},more:!cursor}}});
  });
  await page.clock.install();
  await page.goto('/#procedures/company?company=barclays');
  await expect(page.getByRole('link', {name:'Automatic experience 0 revision 1', exact:true})).toBeVisible();
  await expect(page.getByRole('button', {name:/Refresh experiences|Load more/})).toHaveCount(0);
  await page.locator('.page-sentinel').scrollIntoViewIfNeeded();
  await expect(page.getByRole('link', {name:'Automatic experience 13 revision 1', exact:true})).toBeAttached();
  revision = 2;
  await page.clock.runFor(240000);
  await expect(page.getByRole('link', {name:'Automatic experience 0 revision 2', exact:true})).toBeAttached();
  await expect(page.getByRole('link', {name:'Automatic experience 13 revision 2', exact:true})).toBeAttached();
  await expect(page.locator('.procedure-card-title')).toHaveCount(14);
  const reads = calls.length;
  await page.evaluate(() => {Object.defineProperty(document,'visibilityState',{configurable:true,value:'hidden'});document.dispatchEvent(new Event('visibilitychange'));});
  await page.clock.runFor(240000);
  expect(calls.length).toBe(reads);
  await page.evaluate(() => {Object.defineProperty(navigator,'onLine',{configurable:true,value:false});Object.defineProperty(document,'visibilityState',{configurable:true,value:'visible'});document.dispatchEvent(new Event('visibilitychange'));window.dispatchEvent(new Event('offline'));});
  await page.clock.runFor(240000);
  expect(calls.length).toBe(reads);
  revision = 3;
  await page.evaluate(() => {Object.defineProperty(navigator,'onLine',{configurable:true,value:true});window.dispatchEvent(new Event('online'));});
  await expect(page.getByRole('link', {name:'Automatic experience 13 revision 3', exact:true})).toBeAttached();
  const resumed = calls.length;
  await page.evaluate(() => {window.dispatchEvent(new Event('focus'));window.dispatchEvent(new Event('focus'));});
  expect(calls.length).toBe(resumed);
});

test('failed automatic requests back off and recover without a manual reload', async ({ page }) => {
  await signInGoogle(page);
  await page.clock.install();
  let calls=0, available=false;
  await page.route('**/procedureCommunity', async route => {
    if (route.request().postDataJSON()?.data?.action !== 'browse') return route.continue();
    calls++;
    if (!available) return route.fulfill({status:503,json:{error:{status:'UNAVAILABLE',message:'Temporarily offline'}}});
    await route.fulfill({json:{result:{rows:[{...initialProcedureDraft(),id:'recovered-post',companyKey:'barclays',companyName:'Barclays',title:'Recovered automatically',body:'An interview experience.',published:true,publishedAt:Date.now(),score:0,upvotes:0,downvotes:0}],cursor:null,more:false}}});
  });
  await page.goto('/#procedures/company?company=barclays');
  await expect(page.getByRole('alert').filter({hasText:'community service is unavailable'})).toBeVisible();
  const initial=calls;
  const response=page.waitForResponse(response=>response.url().includes('/procedureCommunity')&&response.status()===503);
  await page.clock.runFor(120000);
  await response;
  await expect.poll(()=>calls).toBe(initial+1);
  // Wait for the rejected callable to finish before advancing its backoff timer.
  await page.evaluate(()=>new Promise(resolve=>setTimeout(resolve,20)));
  await page.clock.runFor(120000);
  expect(calls).toBe(initial+1);
  available=true;
  await page.clock.runFor(120000);
  await expect(page.getByRole('link',{name:'Recovered automatically',exact:true})).toBeVisible();
  await expect(page.getByRole('alert').filter({hasText:'community service is unavailable'})).toHaveCount(0);
});
