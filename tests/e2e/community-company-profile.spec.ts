import { test, expect } from '@playwright/test';
import { initializeApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { readFileSync } from 'node:fs';
import { signInGoogle } from './auth-helper';

test('Wissen profile supplies its logo, role and annual CTC without inventing batch statistics',async({page})=>{
  if(process.env.E2E_FIREBASE!=='true')throw new Error('Demo emulators required.');
  const db=getFirestore(initializeApp({projectId:'demo-placementstats'},'wissen-profile-'+crypto.randomUUID()));
  const profile=JSON.parse(readFileSync('data/company-profiles/wissen-technology.json','utf8'));
  await db.doc('procedureCompanies/wissen-technology').set({name:'Wissen Technology',years:[],source:'community',profile});
  await signInGoogle(page);await page.goto('/#procedures/company?company=wissen-technology');
  const hub=page.locator('.procedure-company-hub');
  await expect(hub).toContainText('Software Engineer');await expect(hub).toContainText('₹11 LPA');
  await expect(hub.locator('img')).toHaveAttribute('src','/company-logos/wissen-technology.png');
  expect(await hub.locator('img').evaluate((node:HTMLImageElement)=>node.complete&&node.naturalWidth>0)).toBe(true);
  await page.goto('/#procedures/contribute?company=wissen-technology&name=Wissen%20Technology');
  await expect(page.locator('.writing-company-context')).toContainText('₹11 LPA');
  await expect(page.locator('#procedure-role')).toHaveValue('Software Engineer');
  await expect(page.locator('.writing-company-context')).not.toContainText('Class of');
  await expect(page.locator('.writing-company-context')).toContainText('Community listing');
  await page.locator('#procedure-role').selectOption('__custom__');await page.getByLabel('Custom role',{exact:true}).fill('Different role');
  await expect(page.locator('.writing-company-context')).toContainText('CTC not recorded for this role');
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
});

test('additional companies are searchable with honest salary context and accessible optional details',async({page},info)=>{
  if(process.env.E2E_FIREBASE!=='true')throw new Error('Demo emulators required.');
  const db=getFirestore(initializeApp({projectId:'demo-placementstats'},'community-additions-'+crypto.randomUUID()));
  const rows=JSON.parse(readFileSync('data/company-profiles/community-additions-2026-11-16.json','utf8')) as {key:string;name:string;profile?:unknown}[];
  for(const row of rows)await db.doc(`procedureCompanies/${row.key}`).set({name:row.name,years:[],source:'community',...(row.profile?{profile:row.profile}:{})});
  await signInGoogle(page);await page.goto('/#procedures/contribute');
  const picker=page.getByRole('combobox',{name:'Company',exact:true});
  for(const row of rows){await picker.fill(row.name);await expect(page.getByRole('option',{name:new RegExp(row.name.replace(/[.*+?^${}()|[\]\\]/g,'\\$&'))})).toBeVisible();}
  await picker.fill('InTrade Systems');await page.getByRole('option',{name:/InTrade Systems/}).click();
  await expect(page.locator('.writing-company-context')).toContainText('Estimated ₹12–14 LPA');
  await expect(page.locator('.writing-company-context')).toContainText('Role not specified');
  await expect(page.getByLabel('Role',{exact:true})).toHaveValue('');
  await picker.fill('Magellan');await page.getByRole('option',{name:/Magellan/}).click();
  await expect(page.locator('.writing-company-context')).toContainText('₹6–8 LPA');
  await expect(page.locator('.writing-company-context')).toContainText('Full Stack Engineer');
  await expect(page.locator('.writing-company-context img')).toHaveAttribute('src','/company-logos/magellan.jpg');
  const optional=page.locator('.studio-optional'),summary=optional.locator('summary');
  await expect(summary).toContainText('Optional details');await expect(summary).toContainText('Interview year');
  for(const width of [320,393,840,1280]){
    await page.setViewportSize({width,height:844});
    const geometry=await summary.evaluate(element=>{
      const icon=element.querySelector('.studio-optional-icon')!.getBoundingClientRect(),copy=element.querySelector('.studio-optional-copy')!.getBoundingClientRect(),box=element.getBoundingClientRect();
      return {gap:copy.left-icon.right,iconWidth:icon.width,copyRight:copy.right,right:box.right,layout:getComputedStyle(element).display,position:getComputedStyle(element,'::after').position};
    });
    expect(geometry.layout).toBe('grid');expect(geometry.gap).toBeGreaterThanOrEqual(10);expect(geometry.iconWidth).toBeGreaterThanOrEqual(28);expect(geometry.copyRight).toBeLessThan(geometry.right-20);expect(geometry.position).toBe('static');
  }
  await page.setViewportSize(info.project.name==='mobile'?{width:393,height:851}:{width:1280,height:844});
  await summary.screenshot({path:`artifacts/company-completion/optional-summary-${info.project.name}.png`});
  await summary.focus();await page.keyboard.press('Enter');await expect(optional).toHaveAttribute('open','');
  await expect(page.getByLabel('Year you appeared',{exact:true})).toBeVisible();
  await expect(summary).toHaveCSS('outline-offset','-3px');
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  await optional.screenshot({path:`artifacts/company-completion/optional-details-${info.project.name}.png`});
  await page.evaluate(()=>{document.documentElement.dataset.theme='dark';});
  await optional.screenshot({path:`artifacts/company-completion/optional-details-dark-${info.project.name}.png`});
  await page.goto('/#procedures/company?company=gracenote-nielsen');
  await expect(page.locator('.procedure-company-hub')).toContainText('₹16 LPA');
  await expect(page.locator('.procedure-company-hub')).not.toContainText('Estimated');
  await expect(page.locator('.product-footer-brand')).toHaveJSProperty('tagName','SPAN');
  await expect(page.locator('.product-footer-about')).toHaveAttribute('href','#about');
});

test('every 2027 company renders a bundled logo',async({page})=>{
  if(process.env.E2E_FIREBASE!=='true')throw new Error('Demo emulators required.');
  await signInGoogle(page);await page.goto('/#2027/companies');
  await expect(page.locator('.result-count')).toHaveText('25 / 25');
  const logos=page.locator('tbody .company-logo img');await expect(logos).toHaveCount(25);
  await expect(page.locator('tbody .company-logo-initials')).toHaveCount(0);
  for(const logo of await logos.all()){
    await logo.scrollIntoViewIfNeeded();
    await expect.poll(()=>logo.evaluate((image:HTMLImageElement)=>image.complete&&image.naturalWidth>0)).toBe(true);
  }
});
