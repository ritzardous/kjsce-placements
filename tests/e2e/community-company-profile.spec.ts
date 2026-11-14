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
