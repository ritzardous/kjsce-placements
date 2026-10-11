import {test,expect} from '@playwright/test';
import {randomUUID} from 'node:crypto';
import {initializeApp} from 'firebase-admin/app';
import {getFirestore} from 'firebase-admin/firestore';
import {initialProcedureDraft} from '../../shared/procedures';
import {signInGoogle} from './auth-helper';
const db=getFirestore(initializeApp({projectId:'demo-placementstats'},'action-feedback'));

test('bookmark responds before the network finishes, confirms and rolls back failures',async({page},info)=>{
  const uid=await signInGoogle(page),id=randomUUID(),title=`Quick save ${id}`;
  await db.doc(`procedurePosts/${id}`).set({...initialProcedureDraft(),id,title,companyKey:'barclays',companyName:'Barclays',authorUid:'another-user',authorName:'Contributor',body:'Practise coding arrays and SQL joins. Explain your project clearly and prepare examples of teamwork.',published:true,publishedAt:Date.now(),score:0,upvotes:0,downvotes:0,revision:1});
  await page.goto(`/#procedures/company?company=barclays&search=${encodeURIComponent(title)}`);
  const card=page.locator('.procedure-card').filter({has:page.getByRole('link',{name:title,exact:true})}),button=card.locator('.article-bookmark');
  await expect(button).toHaveAttribute('aria-disabled','false',{timeout:20000});
  let release!:()=>void;
  const gate=new Promise<void>(resolve=>{release=resolve;});
  let fail=false;
  await page.route('**/procedureCommunity',async route=>{
    if(route.request().postDataJSON()?.data?.action!=='bookmark'){await route.continue();return;}
    if(fail){await route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({error:{status:'UNAVAILABLE',message:'Test connection failure'}})});return;}
    await gate;await route.continue();
  });
  try{
    await button.click();
    await expect(button).toHaveAttribute('aria-pressed','true');
    await expect(button).toHaveAttribute('aria-busy','true');
    await expect(page.locator('.app-feedback')).toContainText('Saving to your profile');
    expect((await db.doc(`procedureBookmarks/${uid}/items/${id}`).get()).exists).toBe(false);
    release();
    await expect(button).toHaveAttribute('aria-busy','false');
    await expect(page.locator('.app-feedback')).toContainText('Bookmarked. Find it in Saved for prep.');
    expect((await db.doc(`procedureBookmarks/${uid}/items/${id}`).get()).exists).toBe(true);
    fail=true;
    await button.click();
    await expect(button).toHaveAttribute('aria-busy','false');
    await expect(button).toHaveAttribute('aria-pressed','true');
    await expect(page.locator('.app-feedback')).toContainText('could not be saved');
    expect((await db.doc(`procedureBookmarks/${uid}/items/${id}`).get()).exists).toBe(true);
    await page.screenshot({animations:'disabled',path:`artifacts/bookmark-feedback-${info.project.name}.png`});
  }finally{release();}
});

test('scroll to top animates and chart details work with touch and keyboard',async({page},info)=>{
  await signInGoogle(page);
  await page.emulateMedia({reducedMotion:'no-preference'});
  await page.goto('/#insights');
  await expect(page.locator('.chart-column').first()).toBeVisible({timeout:20000});
  await page.evaluate(()=>{window.scrollTo({top:document.documentElement.scrollHeight,behavior:'instant'});});
  const top=page.getByRole('button',{name:'Scroll to top',exact:true});
  await expect(top).toBeVisible();
  await page.evaluate(()=>{(window as any).topScrollEvents=0;window.addEventListener('scroll',()=>{(window as any).topScrollEvents++;},{passive:true});});
  await top.click();
  await expect.poll(()=>page.evaluate(()=>window.scrollY)).toBe(0);
  expect(await page.evaluate(()=>(window as any).topScrollEvents)).toBeGreaterThan(2);
  await page.goto('/#overview');
  const legend=page.locator('.chart-legend-button').first();
  await expect(legend).toBeVisible({timeout:20000});
  await legend.click();
  await expect(legend).toHaveAttribute('aria-pressed','true');
  await expect(page.locator('.chart-readout').filter({hasText:'%'}).first()).toBeVisible();
  await page.goto('/#insights');
  const bar=page.locator('.chart-column').first();
  await expect(bar).toBeVisible({timeout:20000});
  await bar.scrollIntoViewIfNeeded();
  if(info.project.name==='desktop'){await bar.focus();await page.keyboard.press('Enter');}else await bar.click();
  await expect(bar).toHaveAttribute('aria-pressed','true');
  await expect(page.locator('.col-chart-wrap .chart-readout').first()).not.toHaveText('Choose a bar to see its value.');
  await page.screenshot({animations:'disabled',path:`artifacts/chart-details-${info.project.name}.png`});
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
});
