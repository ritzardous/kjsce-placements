import {test,expect} from '@playwright/test';
import {initializeApp} from 'firebase-admin/app';
import {getFirestore} from 'firebase-admin/firestore';
import {signInGoogle} from './auth-helper';
const db=getFirestore(initializeApp({projectId:'demo-placementstats'},'theme-profile-tests'));

test('neutral light palette, search spacing and dark SVG labels remain readable',async({page},info)=>{
  await signInGoogle(page);
  await page.goto('/#2026/companies');
  await expect(page.getByLabel('Search companies')).toBeVisible();
  const light=page.getByRole('button',{name:'Switch to light mode'});
  if(await light.count())await light.click();
  expect(await page.locator('#app').evaluate(element=>getComputedStyle(element).backgroundColor)).toBe('rgb(247, 248, 250)');
  const input=page.getByLabel('Search companies'),icon=page.locator('.search-box > .app-icon');
  const inputBox=(await input.boundingBox())!,iconBox=(await icon.boundingBox())!;
  const padding=await input.evaluate(element=>parseFloat(getComputedStyle(element).paddingLeft));
  expect(inputBox.x+padding).toBeGreaterThan(iconBox.x+iconBox.width);
  expect(await page.locator('.search-box').evaluate(element=>getComputedStyle(element,'::before').content)).toBe('none');
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  await page.screenshot({path:`artifacts/neutral-companies-${info.project.name}.png`,fullPage:true});
  await page.getByRole('button',{name:'Switch to dark mode'}).click();
  await page.goto('/#2026/overview');
  await expect(page.locator('.donut-total')).toHaveText('82');
  expect(await page.locator('.donut-total').evaluate(element=>getComputedStyle(element).fill)).toBe('rgb(245, 245, 245)');
  await page.locator('.react-donut').scrollIntoViewIfNeeded();
  await page.screenshot({path:`artifacts/dark-chart-label-${info.project.name}.png`});
});

test('Google photo is displayed and server-verified identity syncs privately without accepting forged fields',async({page},info)=>{
  const photo='https://lh3.googleusercontent.com/test-profile-photo';
  await page.route(photo,route=>route.fulfill({contentType:'image/svg+xml',body:'<svg xmlns="http://www.w3.org/2000/svg" width="76" height="76"><rect width="76" height="76" fill="#2445eb"/><circle cx="38" cy="38" r="22" fill="white"/></svg>'}));
  const uid=await signInGoogle(page,true,photo);
  await page.goto('/#account');
  const image=page.locator('.profile-avatar img');
  await expect(image).toBeVisible();
  await expect(image).toHaveAttribute('src',photo);
  await expect.poll(async()=> (await db.doc(`users/${uid}`).get()).data()?.authProfile?.photoURL,{timeout:20000}).toBe(photo);
  const ref=db.doc(`users/${uid}`),before=(await ref.get()).data()!;
  expect(before.authProfile.displayName).toBe('Test Student');
  expect(before.authProfile.emailVerified).toBe(true);
  expect(before.authProfile.provider).toBe('google.com');
  await page.evaluate(`(async()=>{const {callProcedure}=await import('/src/procedures-api.ts');await callProcedure('procedureCommunity',{action:'syncAccount',payload:{email:'forged@example.test',role:'admin',uid:'another-user'}});})()`);
  const after=(await ref.get()).data()!;
  expect(after.authProfile).toEqual(before.authProfile);
  expect(after.profileSyncedAt).toBe(before.profileSyncedAt);
  expect(after.role).toBeUndefined();
  await page.screenshot({path:`artifacts/google-profile-${info.project.name}.png`});
});
