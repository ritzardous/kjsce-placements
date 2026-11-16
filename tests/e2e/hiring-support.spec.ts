import { test, expect } from '@playwright/test';
import { initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import { readFileSync } from 'node:fs';
import { signInGoogle } from './auth-helper';

const app=initializeApp({projectId:'demo-placementstats'},'hiring-support-browser'),db=getFirestore(app),auth=getAuth(app);
test('support is public, optional, concise and reachable from Footer and About',async({page},info)=>{
  await page.goto('/#landing');
  await page.getByRole('navigation',{name:'Project',exact:true}).getByRole('link',{name:'Support us',exact:true}).click();
  await expect(page).toHaveURL(/#support$/);
  await expect(page.getByRole('heading',{name:'Help good information go a little further.'})).toBeVisible();
  await expect(page.getByText('You don’t owe us anything.',{exact:true})).toBeVisible();
  const image=page.getByRole('img',{name:'UPI QR code supplied by Ritesh for voluntary contributions to Placement Stats'});
  await expect(image).toBeVisible();
  expect(await image.evaluate((node:HTMLImageElement)=>node.complete&&node.naturalWidth>0)).toBe(true);
  const response=await page.request.get('/support/upi-qr.jpg');
  expect(response.ok()).toBe(true);
  expect(Buffer.compare(await response.body(),readFileSync('public/support/upi-qr.jpg'))).toBe(0);
  await expect(page.getByRole('link',{name:'Save QR for your UPI app'})).toHaveAttribute('download','placement-stats-upi.jpg');
  await expect(page.getByRole('link',{name:'Talk to us'})).toHaveAttribute('href',/^mailto:riteshjha.exe@gmail.com,sakshamvarshney0701@gmail.com/);
  const email = await page.getByRole('link',{name:'Talk to us'}).getAttribute('href');
  expect(new URL(email!).searchParams.get('subject')).toBe("Let's talk about sponsoring Placement Stats");
  await expect(page.getByRole('link',{name:'Something bigger in mind?'})).toHaveAttribute('href',email!);
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  await page.screenshot({path:`artifacts/support-${info.project.name}.png`,fullPage:true});
  await page.getByRole('button',{name:'Switch to dark mode'}).click();
  await page.screenshot({path:`artifacts/support-dark-${info.project.name}.png`,fullPage:true});
  await page.getByRole('navigation',{name:'Project',exact:true}).getByRole('link',{name:'About this project'}).click();
  await expect(page.getByRole('link',{name:'donation page',exact:true})).toHaveAttribute('href','#support');
});

test('admins control hiring focus and readers see changes without reloading',async({page,browser},info)=>{
  test.setTimeout(90000);
  expect(process.env.E2E_FIREBASE).toBe('true');
  for(const [key,name]of [['magellan','Magellan'],['godrej-capital','Godrej Capital'],['sharekhan-limited','Sharekhan'],['wissen-technology','Wissen Technology']]){
    const ref=db.doc(`procedureCompanies/${key}`);
    if(!(await ref.get()).exists)await ref.set({name,years:[]});
    await ref.update({hiring:FieldValue.delete()});
  }
  await signInGoogle(page);
  await expect(page.locator('.home-hiring-preview')).toContainText('Magellan');
  await page.goto('/#procedures');
  await expect(page.locator('.hiring-company')).toHaveCount(4);
  await expect(page.locator('.home-hiring-preview')).toHaveCount(0);
  await expect(page.locator('.hiring-now')).toHaveCSS('background-image','none');
  await expect(page.locator('.hiring-now')).toHaveCSS('border-top-width','0px');
  await expect(page.locator('.hiring-company').filter({hasText:'Wissen Technology'})).toHaveCount(1);
  await expect(page.locator('.hiring-now')).toContainText('Class of 2027');
  const denied=await page.evaluate(async()=>{
    const {callProcedure}=await import('/src/procedures/procedures-api.ts' as string);
    try{await callProcedure('adminWorkspace',{action:'setCompanyHiring',payload:{companyKey:'magellan',status:'none',year:2027,expectedVersion:0}});return 'unexpected-success';}
    catch(error){return (error as {code?:string}).code;}
  });
  expect(denied).toBe('functions/permission-denied');
  const context=await browser.newContext({viewport:page.viewportSize() ?? undefined}),admin=await context.newPage();
  try{
    const uid=await signInGoogle(admin);
    await auth.setCustomUserClaims(uid,{role:'admin'});
    await admin.evaluate(async()=>{const {getFirebase}=await import('/src/lib/firebase.ts' as string);await getFirebase().auth.currentUser.getIdToken(true);});
    await admin.goto('/#admin/hiring');
    await expect(admin.getByRole('heading',{name:'What’s next for the Class of 2027?'})).toBeVisible();
    await expect(admin.getByLabel('Company',{exact:true})).toBeVisible({timeout:10000});
    await expect(admin.locator('select[aria-label="Company"] option[value="magellan"]')).toHaveCount(1,{timeout:10000});
    await admin.getByLabel('Company',{exact:true}).selectOption('magellan',{timeout:10000});
    await admin.getByLabel('Hiring status',{exact:true}).selectOption('none',{timeout:10000});
    await admin.getByRole('button',{name:'Save hiring status',exact:true}).click();
    await expect(admin.getByRole('status')).toContainText('Hiring focus updated');
    await expect(page.locator('.hiring-company').filter({hasText:'Magellan'})).toHaveCount(0);
    await page.goto('/#home');
    await expect(page.locator('.home-hiring-preview')).not.toContainText('Magellan');
    await admin.getByLabel('Hiring status',{exact:true}).selectOption('upcoming',{timeout:10000});
    await admin.getByRole('button',{name:'Save hiring status',exact:true}).click();
    await expect(page.locator('.home-hiring-preview')).toContainText('Magellan');
    await page.goto('/#procedures');
    await expect(page.locator('.hiring-company').filter({hasText:'Magellan'})).toContainText('Upcoming');
    expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
    await page.locator('.hiring-now').screenshot({path:`artifacts/hiring-${info.project.name}.png`});
    await page.locator('.hiring-company').filter({hasText:'Magellan'}).click();
    await expect(page).toHaveURL(/#procedures\/company\?company=magellan/);
    await expect(page.locator('.company-hub-title')).toContainText('Magellan');
  }catch(error){await admin.screenshot({path:`artifacts/hiring-admin-error-${info.project.name}.png`,fullPage:true}).catch(()=>{});throw error;}
  finally{await context.close().catch(()=>{});}
});
